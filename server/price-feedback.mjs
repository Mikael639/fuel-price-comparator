import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_FUELS = new Set(["SP95", "SP95-E10", "SP98", "Diesel", "E85", "GPL"]);
const DEFAULT_COOLDOWN_HOURS = 12;
const MAX_REASONABLE_PRICE_EUR = 5;
const STORE_FILE_PATH = path.resolve(process.cwd(), ".local", "price-feedback.json");

const parseCooldownHours = () => {
  const parsed = Number(process.env.PRICE_FEEDBACK_COOLDOWN_HOURS ?? DEFAULT_COOLDOWN_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COOLDOWN_HOURS;
};

const PRICE_FEEDBACK_COOLDOWN_HOURS = parseCooldownHours();
const PRICE_FEEDBACK_COOLDOWN_MS = PRICE_FEEDBACK_COOLDOWN_HOURS * 60 * 60 * 1000;

const createEmptyStore = () => ({
  version: 1,
  summaries: {},
  submissions: {},
});

let feedbackStore = createEmptyStore();
let storeLoaded = false;
let mutationQueue = Promise.resolve();
let warnedPersistenceFallback = false;
let storageMode = "file";

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

const setCorsHeaders = (response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store");
};

const sendJson = (response, statusCode, payload) => {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const getHeaderValue = (headers, name) => {
  const rawValue = headers?.[name];

  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? "";
  }

  return typeof rawValue === "string" ? rawValue : "";
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", reject);
  });

const readJsonBody = async (request) => {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  const rawBody = await readRequestBody(request);

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ValidationError("Le corps JSON du retour prix est invalide.");
  }
};

const parsePrice = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", ".").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const createSummaryKey = (stationId, fuel) => `${stationId}::${fuel}`;

const createEmptySummaryRecord = (stationId, fuel) => ({
  stationId,
  fuel,
  confirmations: 0,
  reports: 0,
  lastConfirmedAt: null,
  lastReportedAt: null,
  latestSuggestedPrice: null,
  suggestedPriceCount: 0,
  suggestedPriceSum: 0,
  lastDisplayedPrice: null,
});

const getLatestIsoDate = (...values) =>
  values
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

const toPublicSummary = (stationId, fuel, record) => ({
  stationId,
  fuel,
  confirmations: record?.confirmations ?? 0,
  reports: record?.reports ?? 0,
  lastConfirmedAt: record?.lastConfirmedAt ?? null,
  lastReportedAt: record?.lastReportedAt ?? null,
  latestFeedbackAt: getLatestIsoDate(record?.lastConfirmedAt, record?.lastReportedAt),
  latestSuggestedPrice: record?.latestSuggestedPrice ?? null,
  suggestedPriceAverage:
    record && record.suggestedPriceCount > 0
      ? Number((record.suggestedPriceSum / record.suggestedPriceCount).toFixed(3))
      : null,
});

const createFeedbackFingerprint = (request) => {
  const forwardedFor = getHeaderValue(request.headers, "x-forwarded-for");
  const ipAddress = forwardedFor.split(",")[0]?.trim() || request.socket?.remoteAddress || "unknown";
  const userAgent = getHeaderValue(request.headers, "user-agent") || "unknown";
  const language = getHeaderValue(request.headers, "accept-language") || "unknown";

  return createHash("sha256").update(`${ipAddress}|${userAgent}|${language}`).digest("hex").slice(0, 24);
};

const pruneExpiredSubmissions = () => {
  const now = Date.now();

  for (const [key, submittedAt] of Object.entries(feedbackStore.submissions)) {
    if (new Date(submittedAt).getTime() + PRICE_FEEDBACK_COOLDOWN_MS <= now) {
      delete feedbackStore.submissions[key];
    }
  }
};

const ensureStoreLoaded = async () => {
  if (storeLoaded) {
    return;
  }

  try {
    const rawStore = await readFile(STORE_FILE_PATH, "utf8");
    const parsedStore = JSON.parse(rawStore);

    feedbackStore = {
      ...createEmptyStore(),
      ...parsedStore,
      summaries: parsedStore?.summaries ?? {},
      submissions: parsedStore?.submissions ?? {},
    };
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`[price-feedback] Impossible de lire le stockage local: ${error.message}`);
    }
  } finally {
    storeLoaded = true;
  }
};

const persistStore = async () => {
  try {
    await mkdir(path.dirname(STORE_FILE_PATH), { recursive: true });
    await writeFile(STORE_FILE_PATH, JSON.stringify(feedbackStore, null, 2), "utf8");
    storageMode = "file";
  } catch (error) {
    storageMode = "memory";

    if (!warnedPersistenceFallback) {
      console.warn(
        `[price-feedback] Stockage persistant indisponible, bascule en memoire (${error?.message ?? "erreur inconnue"}).`,
      );
      warnedPersistenceFallback = true;
    }
  }
};

const withMutationLock = async (callback) => {
  const previousMutation = mutationQueue;
  let releaseMutation = () => {};

  mutationQueue = new Promise((resolve) => {
    releaseMutation = resolve;
  });

  await previousMutation;

  try {
    return await callback();
  } finally {
    releaseMutation();
  }
};

const validatePayload = (payload) => {
  const stationId = typeof payload.stationId === "string" ? payload.stationId.trim() : "";
  const fuel = typeof payload.fuel === "string" ? payload.fuel.trim() : "";
  const displayedPrice = parsePrice(payload.displayedPrice);
  const suggestedPrice = parsePrice(payload.suggestedPrice);

  if (!stationId) {
    throw new ValidationError("La station est requise.");
  }

  if (!ALLOWED_FUELS.has(fuel)) {
    throw new ValidationError("Le carburant transmis est invalide.");
  }

  if (typeof payload.isCorrect !== "boolean") {
    throw new ValidationError("Le retour prix doit indiquer s'il est correct ou non.");
  }

  if (displayedPrice == null || displayedPrice <= 0 || displayedPrice > MAX_REASONABLE_PRICE_EUR) {
    throw new ValidationError("Le prix affiche est invalide.");
  }

  if (suggestedPrice != null && (suggestedPrice <= 0 || suggestedPrice > MAX_REASONABLE_PRICE_EUR)) {
    throw new ValidationError("Le prix constate est invalide.");
  }

  return {
    stationId,
    fuel,
    displayedPrice: Number(displayedPrice.toFixed(3)),
    isCorrect: payload.isCorrect,
    suggestedPrice: suggestedPrice == null ? null : Number(suggestedPrice.toFixed(3)),
  };
};

const getSummary = async (stationId, fuel) => {
  await mutationQueue;
  await ensureStoreLoaded();
  pruneExpiredSubmissions();

  const record = feedbackStore.summaries[createSummaryKey(stationId, fuel)] ?? null;
  return toPublicSummary(stationId, fuel, record);
};

const submitFeedback = async (request, payload) =>
  withMutationLock(async () => {
    await ensureStoreLoaded();
    pruneExpiredSubmissions();

    const fingerprint = createFeedbackFingerprint(request);
    const summaryKey = createSummaryKey(payload.stationId, payload.fuel);
    const dedupeKey = `${summaryKey}::${fingerprint}`;
    const previousSubmissionAt = feedbackStore.submissions[dedupeKey];

    if (previousSubmissionAt) {
      const retryAtMs = new Date(previousSubmissionAt).getTime() + PRICE_FEEDBACK_COOLDOWN_MS;

      if (retryAtMs > Date.now()) {
        return {
          accepted: false,
          retryAt: new Date(retryAtMs).toISOString(),
          summary: toPublicSummary(
            payload.stationId,
            payload.fuel,
            feedbackStore.summaries[summaryKey] ?? createEmptySummaryRecord(payload.stationId, payload.fuel),
          ),
        };
      }
    }

    const nowIso = new Date().toISOString();
    const summaryRecord =
      feedbackStore.summaries[summaryKey] ?? createEmptySummaryRecord(payload.stationId, payload.fuel);

    summaryRecord.lastDisplayedPrice = payload.displayedPrice;

    if (payload.isCorrect) {
      summaryRecord.confirmations += 1;
      summaryRecord.lastConfirmedAt = nowIso;
    } else {
      summaryRecord.reports += 1;
      summaryRecord.lastReportedAt = nowIso;

      if (payload.suggestedPrice != null) {
        summaryRecord.latestSuggestedPrice = payload.suggestedPrice;
        summaryRecord.suggestedPriceCount += 1;
        summaryRecord.suggestedPriceSum += payload.suggestedPrice;
      }
    }

    feedbackStore.summaries[summaryKey] = summaryRecord;
    feedbackStore.submissions[dedupeKey] = nowIso;
    await persistStore();

    return {
      accepted: true,
      retryAt: null,
      summary: toPublicSummary(payload.stationId, payload.fuel, summaryRecord),
    };
  });

const buildMeta = () => ({
  cooldownHours: PRICE_FEEDBACK_COOLDOWN_HOURS,
  storage: storageMode,
});

export const handlePriceFeedbackRequest = async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    if (request.method === "GET") {
      const requestUrl = new URL(request.url ?? "/api/price-feedback", "http://localhost");
      const stationId = requestUrl.searchParams.get("stationId")?.trim() ?? "";
      const fuel = requestUrl.searchParams.get("fuel")?.trim() ?? "";

      if (!stationId || !ALLOWED_FUELS.has(fuel)) {
        sendJson(response, 400, {
          error: "Les parametres stationId et fuel sont requis.",
          ...buildMeta(),
        });
        return;
      }

      const summary = await getSummary(stationId, fuel);
      sendJson(response, 200, {
        summary,
        ...buildMeta(),
      });
      return;
    }

    if (request.method === "POST") {
      const rawPayload = await readJsonBody(request);
      const payload = validatePayload(rawPayload);
      const result = await submitFeedback(request, payload);

      if (!result.accepted) {
        sendJson(response, 429, {
          error: "Un retour a deja ete envoye recemment pour cette station et ce carburant depuis ce navigateur.",
          retryAt: result.retryAt,
          summary: result.summary,
          ...buildMeta(),
        });
        return;
      }

      sendJson(response, 201, {
        summary: result.summary,
        retryAt: result.retryAt,
        ...buildMeta(),
      });
      return;
    }

    sendJson(response, 405, {
      error: "Method not allowed",
      ...buildMeta(),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      sendJson(response, 400, {
        error: error.message,
        ...buildMeta(),
      });
      return;
    }

    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erreur inconnue sur le retour prix",
      ...buildMeta(),
    });
  }
};
