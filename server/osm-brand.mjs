const OVERPASS_URL = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

const cache = new Map();
const OSM_BRAND_SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const OSM_BRAND_FAILURE_TTL_MS = 10 * 60 * 1000;
const OSM_BRAND_RATE_LIMIT_TTL_MS = 15 * 60 * 1000;

let osmRateLimitedUntil = 0;

class ProxyHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ProxyHttpError";
    this.status = status;
  }
}

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

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    if (typeof request.body === "string") {
      resolve(request.body);
      return;
    }

    if (Buffer.isBuffer(request.body)) {
      resolve(request.body.toString("utf8"));
      return;
    }

    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", reject);
  });

const setCorsHeaders = (response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const sendJson = (response, statusCode, payload) => {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

export const proxyOsmBrandLookup = async (query) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { elements: [] };
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
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown OSM proxy error",
    });
  }
};
