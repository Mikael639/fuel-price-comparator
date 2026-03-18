import http from "node:http";
import { URL } from "node:url";
import XLSX from "xlsx";

const PORT = Number(process.env.PORT ?? 8787);
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

const setCorsHeaders = (response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

const proxyJsonRequest = async (targetUrl, init = {}) => {
  const response = await fetch(targetUrl, init);
  const payload = await response.text();

  if (!response.ok) {
    throw new Error(payload || `Proxy upstream error (${response.status})`);
  }

  return JSON.parse(payload);
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

const buildEuropeMarketsPayload = async () => {
  const cachedPayload = getCachedValue("europe-markets");

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

  if (request.method !== "GET" || !request.url) {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const url = new URL(request.url, `http://localhost:${PORT}`);

  try {
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
      const queryUrl = new URL(NOMINATIM_URL);

      queryUrl.search = url.searchParams.toString();

      if (!queryUrl.searchParams.has("format")) {
        queryUrl.searchParams.set("format", "jsonv2");
      }

      const payload = await proxyJsonRequest(queryUrl.toString(), {
        headers: {
          "User-Agent": "FuelFlashProxy/1.0",
        },
      });
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/europe/markets") {
      const payload = await buildEuropeMarketsPayload();
      sendJson(response, 200, payload);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`FuelFlash proxy listening on http://localhost:${PORT}`);
});
