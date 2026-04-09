import http from "node:http";
import { URL } from "node:url";
import XLSX from "xlsx";
import { proxyOsmBrandLookup } from "./osm-brand.mjs";
import { handlePriceFeedbackRequest } from "./price-feedback.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const OSRM_URL = process.env.OSRM_URL ?? "https://router.project-osrm.org/route/v1/driving";
const DGCCRF_RECORDS_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const DGCCRF_HISTORY_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const EUROPE_HISTORY_URL =
  "https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx";

const EUROPE_COUNTRIES = {
  FR: "France",
  BE: "Belgique",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
};

const cache = new Map();
const GEOCODING_SUCCESS_TTL_MS = 30 * 60 * 1000;
const GEOCODING_RATE_LIMIT_TTL_MS = 2 * 60 * 1000;
const ROUTE_SUCCESS_TTL_MS = 30 * 60 * 1000;
let geocodingRateLimitedUntil = 0;

const setCorsHeaders = (response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const sendJson = (response, statusCode, payload) => {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const getCachedValue = (key) => {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedValue = (key, value, ttlMs) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

class ProxyHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ProxyHttpError";
    this.status = status;
  }
}

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

const sanitizeUpstreamErrorMessage = (payload, status) => {
  const normalized = payload
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return `Proxy upstream error (${status})`;
  }

  return normalized.slice(0, 220);
};

const proxyJsonRequest = async (targetUrl, init = {}) => {
  const response = await fetch(targetUrl, init);
  const payload = await response.text();

  if (!response.ok) {
    throw new ProxyHttpError(response.status, sanitizeUpstreamErrorMessage(payload, response.status));
  }

  return JSON.parse(payload);
};

const proxyGeocodingSearch = async (searchParams) => {
  const queryUrl = new URL(NOMINATIM_URL);

  queryUrl.search = searchParams;

  if (!queryUrl.searchParams.has("format")) {
    queryUrl.searchParams.set("format", "jsonv2");
  }

  const cacheKey = `geocode:${queryUrl.searchParams.toString()}`;
  const cachedPayload = getCachedValue(cacheKey);

  if (cachedPayload) {
    return cachedPayload;
  }

  if (geocodingRateLimitedUntil > Date.now()) {
    throw new ProxyHttpError(429, "Le geocodeur public est temporairement limite. Reessayez dans quelques instants.");
  }

  try {
    const payload = await proxyJsonRequest(queryUrl.toString(), {
      headers: {
        "User-Agent": "FuelFlashProxy/1.0",
      },
    });

    setCachedValue(cacheKey, payload, GEOCODING_SUCCESS_TTL_MS);
    return payload;
  } catch (error) {
    if (error instanceof ProxyHttpError && error.status === 429) {
      geocodingRateLimitedUntil = Math.max(geocodingRateLimitedUntil, Date.now() + GEOCODING_RATE_LIMIT_TTL_MS);
      throw new ProxyHttpError(429, "Le geocodeur public est temporairement limite. Reessayez dans quelques instants.");
    }

    throw new ProxyHttpError(503, "Le geocodage est temporairement indisponible.");
  }
};

const proxyRouteRequest = async (searchParams) => {
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const coordinates = searchParams.get("coordinates");

  if (!coordinates && (!origin || !destination)) {
    throw new ProxyHttpError(400, "Missing route coordinates");
  }

  const routeCoordinates = coordinates ?? `${origin};${destination}`;
  const routeUrl = new URL(`${OSRM_URL.replace(/\/+$/, "")}/${routeCoordinates}`);
  routeUrl.searchParams.set("overview", searchParams.get("overview") ?? "full");
  routeUrl.searchParams.set("geometries", searchParams.get("geometries") ?? "geojson");
  routeUrl.searchParams.set("steps", searchParams.get("steps") ?? "false");

  const cacheKey = `route:${routeUrl.toString()}`;
  const cachedPayload = getCachedValue(cacheKey);

  if (cachedPayload) {
    return cachedPayload;
  }

  const payload = await proxyJsonRequest(routeUrl.toString(), {
    headers: {
      "User-Agent": "FuelFlashProxy/1.0",
    },
  });

  setCachedValue(cacheKey, payload, ROUTE_SUCCESS_TTL_MS);
  return payload;
};

const excelDateToIso = (value) => {
  if (typeof value !== "number") {
    return null;
  }

  const parsedDate = XLSX.SSF.parse_date_code(value);

  if (!parsedDate) {
    return null;
  }

  return new Date(Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d)).toISOString();
};

const buildEuropeMarketsPayload = async ({ forceRefresh = false } = {}) => {
  const cachedPayload = forceRefresh ? null : getCachedValue("europe-markets");

  if (cachedPayload) {
    return cachedPayload;
  }

  const response = await fetch(EUROPE_HISTORY_URL);

  if (!response.ok) {
    throw new Error(`Europe history unavailable (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets["Prices with taxes"] ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  const headerRow = rows[0] ?? [];
  const dataRows = rows
    .slice(3)
    .filter((row) => typeof row[0] === "number")
    .slice(0, 7)
    .reverse();

  const markets = Object.entries(EUROPE_COUNTRIES).map(([code, name]) => {
    const sp95Index = headerRow.indexOf(`${code}_price_with_tax_euro95`);
    const dieselIndex = headerRow.indexOf(`${code}_price_with_tax_diesel`);
    const gplIndex = headerRow.indexOf(`${code}_price_with_tax_LPG`);

    return {
      code,
      name,
      currency: "EUR",
      snapshots: dataRows
        .map((row) => ({
          date: excelDateToIso(row[0]),
          prices: {
            SP95: typeof row[sp95Index] === "number" ? row[sp95Index] / 1000 : null,
            Diesel: typeof row[dieselIndex] === "number" ? row[dieselIndex] / 1000 : null,
            GPL: typeof row[gplIndex] === "number" ? row[gplIndex] / 1000 : null,
          },
        }))
        .filter((snapshot) => snapshot.date != null),
    };
  });

  const payload = {
    markets,
    source: "live",
    updatedAt: markets[0]?.snapshots.at(-1)?.date ?? null,
    sourceLabel: "Commission europeenne • Weekly Oil Bulletin",
  };

  setCachedValue("europe-markets", payload, 6 * 60 * 60 * 1000);
  return payload;
};

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (!request.url) {
    sendJson(response, 400, { error: "Missing URL" });
    return;
  }

  const url = new URL(request.url, `http://localhost:${PORT}`);

  try {
    if (request.method === "POST" && url.pathname === "/api/osm/brand") {
      const query = await readRequestBody(request);
      const payload = await proxyOsmBrandLookup(query);
      sendJson(response, 200, payload);
      return;
    }

    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/price-feedback") {
      await handlePriceFeedbackRequest(request, response);
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/fuel/records") {
      const payload = await proxyJsonRequest(`${DGCCRF_RECORDS_URL}?${url.searchParams.toString()}`);
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/fuel/history") {
      const payload = await proxyJsonRequest(`${DGCCRF_HISTORY_URL}?${url.searchParams.toString()}`);
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/geocode/search") {
      const payload = await proxyGeocodingSearch(url.searchParams.toString());
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/route") {
      const payload = await proxyRouteRequest(url.searchParams);
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/europe/markets") {
      const payload = await buildEuropeMarketsPayload({
        forceRefresh: url.searchParams.get("refresh") === "1",
      });
      sendJson(response, 200, payload);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof ProxyHttpError) {
      sendJson(response, error.status, {
        error: error.message,
      });
      return;
    }

    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`FuelFlash proxy listening on http://localhost:${PORT}`);
});
