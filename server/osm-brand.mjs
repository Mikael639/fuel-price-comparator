import {
  ProxyHttpError,
  createSendJson,
  createTtlCache,
  isAllowedOsmBrandQuery,
  proxyJsonRequest,
  readRequestBody,
  toPublicErrorMessage,
} from "./shared.mjs";

const OVERPASS_URL = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

const cache = createTtlCache(2000);
const OSM_BRAND_SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const OSM_BRAND_FAILURE_TTL_MS = 10 * 60 * 1000;
const OSM_BRAND_RATE_LIMIT_TTL_MS = 15 * 60 * 1000;

let osmRateLimitedUntil = 0;

const getCachedValue = (key) => cache.get(key);
const setCachedValue = (key, value, ttlMs) => cache.set(key, value, ttlMs);

const setCorsHeaders = (response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const sendJson = createSendJson(setCorsHeaders);

export const proxyOsmBrandLookup = async (query) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { elements: [] };
  }

  if (!isAllowedOsmBrandQuery(normalizedQuery)) {
    throw new ProxyHttpError(400, "Requete OSM non autorisee.");
  }

  const cacheKey = `osm-brand:${normalizedQuery}`;
  const cachedPayload = getCachedValue(cacheKey);

  if (cachedPayload) {
    return cachedPayload;
  }

  if (osmRateLimitedUntil > Date.now()) {
    const fallbackPayload = { elements: [] };
    setCachedValue(cacheKey, fallbackPayload, OSM_BRAND_RATE_LIMIT_TTL_MS);
    return fallbackPayload;
  }

  try {
    const payload = await proxyJsonRequest(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "User-Agent": "FuelFlashProxy/1.0",
      },
      body: normalizedQuery,
    });

    setCachedValue(cacheKey, payload, OSM_BRAND_SUCCESS_TTL_MS);
    return payload;
  } catch (error) {
    if (error instanceof ProxyHttpError && (error.status === 429 || error.status === 504)) {
      osmRateLimitedUntil = Math.max(osmRateLimitedUntil, Date.now() + OSM_BRAND_RATE_LIMIT_TTL_MS);
      console.warn("[osm-brand] OSM rate limited or unavailable. Brand enrichment paused temporarily.");
      const fallbackPayload = { elements: [] };
      setCachedValue(cacheKey, fallbackPayload, OSM_BRAND_RATE_LIMIT_TTL_MS);
      return fallbackPayload;
    }

    console.warn(`[osm-brand] OSM brand lookup unavailable: ${error instanceof Error ? error.message : "Unknown error"}`);
    const fallbackPayload = { elements: [] };
    setCachedValue(cacheKey, fallbackPayload, OSM_BRAND_FAILURE_TTL_MS);
    return fallbackPayload;
  }
};

export const handleOsmBrandRequest = async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const query = await readRequestBody(request);
    const payload = await proxyOsmBrandLookup(query);
    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, error instanceof ProxyHttpError ? error.status : 500, {
      error: toPublicErrorMessage(error),
    });
  }
};
