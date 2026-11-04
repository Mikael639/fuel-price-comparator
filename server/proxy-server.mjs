import http from "node:http";
import { URL } from "node:url";
import { buildEuropeMarketsPayload } from "./europe-markets.mjs";
import { proxyOsmBrandLookup } from "./osm-brand.mjs";
import { handlePriceFeedbackRequest } from "./price-feedback.mjs";
import {
  ProxyHttpError,
  createSendJson,
  createTtlCache,
  parseRouteCoordinates,
  proxyJsonRequest,
  readRequestBody,
  toPublicErrorMessage,
} from "./shared.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const OSRM_URL = process.env.OSRM_URL ?? "https://router.project-osrm.org/route/v1/driving";
const DGCCRF_RECORDS_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const DGCCRF_HISTORY_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const cache = createTtlCache(1000);
const GEOCODING_SUCCESS_TTL_MS = 30 * 60 * 1000;
const GEOCODING_RATE_LIMIT_TTL_MS = 2 * 60 * 1000;
const ROUTE_SUCCESS_TTL_MS = 30 * 60 * 1000;
const FUEL_RECORDS_TTL_MS = 60 * 1000;
const FUEL_HISTORY_TTL_MS = 30 * 60 * 1000;
let geocodingRateLimitedUntil = 0;

const setCorsHeaders = (response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const sendJson = createSendJson(setCorsHeaders);

const getCachedValue = (key) => cache.get(key);
const setCachedValue = (key, value, ttlMs) => cache.set(key, value, ttlMs);

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

const proxyCachedJson = async (cacheKey, targetUrl, ttlMs) => {
  const cachedPayload = getCachedValue(cacheKey);

  if (cachedPayload) {
    return cachedPayload;
  }

  const payload = await proxyJsonRequest(targetUrl);
  setCachedValue(cacheKey, payload, ttlMs);
  return payload;
};

const proxyRouteRequest = async (searchParams) => {
  const routeCoordinates = parseRouteCoordinates({
    origin: searchParams.get("origin"),
    destination: searchParams.get("destination"),
    coordinates: searchParams.get("coordinates"),
  });

  if (!routeCoordinates) {
    throw new ProxyHttpError(400, "Missing or invalid route coordinates");
  }

  const routeUrl = new URL(`${OSRM_URL.replace(/\/+$/, "")}/${routeCoordinates}`);
  routeUrl.searchParams.set("overview", searchParams.get("overview") === "simplified" ? "simplified" : "full");
  routeUrl.searchParams.set("geometries", "geojson");
  routeUrl.searchParams.set("steps", searchParams.get("steps") === "true" ? "true" : "false");

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

const buildEuropeMarketsPayloadCached = async ({ forceRefresh = false } = {}) => {
  const cachedPayload = forceRefresh ? null : getCachedValue("europe-markets");

  if (cachedPayload) {
    return cachedPayload;
  }

  const payload = await buildEuropeMarketsPayload();
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
      const targetUrl = `${DGCCRF_RECORDS_URL}?${url.searchParams.toString()}`;
      const payload = await proxyCachedJson(`fuel-records:${targetUrl}`, targetUrl, FUEL_RECORDS_TTL_MS);
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/fuel/history") {
      const targetUrl = `${DGCCRF_HISTORY_URL}?${url.searchParams.toString()}`;
      const payload = await proxyCachedJson(`fuel-history:${targetUrl}`, targetUrl, FUEL_HISTORY_TTL_MS);
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
      const payload = await buildEuropeMarketsPayloadCached({
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
      error: toPublicErrorMessage(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(`FuelFlash proxy listening on http://localhost:${PORT}`);
});
