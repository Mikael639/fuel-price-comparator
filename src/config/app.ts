const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stripTrailingSlash = (value: string | undefined) => {
  if (!value) {
    return "";
  }

  return value.replace(/\/+$/, "");
};

const normalizeProxyApiBaseUrl = (value: string | undefined) => {
  const strippedValue = stripTrailingSlash(value);

  if (!strippedValue) {
    return "";
  }

  return strippedValue.endsWith("/api") ? strippedValue : `${strippedValue}/api`;
};

const proxyApiBaseUrl = normalizeProxyApiBaseUrl(import.meta.env.VITE_PROXY_API_BASE_URL);

const withProxy = (path: string, fallback: string) => (proxyApiBaseUrl ? `${proxyApiBaseUrl}${path}` : fallback);
const sameOriginApi = (path: string) => `/api${path}`;
const defaultOsmApiUrl =
  import.meta.env.VITE_OVERPASS_URL ??
  (import.meta.env.PROD ? sameOriginApi("/osm/brand") : "https://overpass-api.de/api/interpreter");

export const appConfig = {
  theme: {
    defaultTheme: "fuelLight",
  },
  stations: {
    defaultRadiusKm: parseNumber(import.meta.env.VITE_DEFAULT_RADIUS_KM, 10),
    recommendedFocusRadiusKm: parseNumber(import.meta.env.VITE_RECOMMENDED_FOCUS_RADIUS_KM, 8),
    reloadDebounceMs: parseNumber(import.meta.env.VITE_STATION_RELOAD_DEBOUNCE_MS, 250),
    defaultTankVolumeLiters: parseNumber(import.meta.env.VITE_DEFAULT_TANK_VOLUME_LITERS, 50),
    defaultConsumptionLitersPer100Km: parseNumber(import.meta.env.VITE_DEFAULT_CONSUMPTION_L_PER_100KM, 6.5),
    defaultFavoriteAlertPrice: parseNumber(import.meta.env.VITE_DEFAULT_FAVORITE_ALERT_PRICE, 1.7),
  },
  geocoding: {
    url: withProxy("/geocode/search", import.meta.env.VITE_GEOCODING_URL ?? "https://nominatim.openstreetmap.org/search"),
    timeoutMs: parseNumber(import.meta.env.VITE_GEOCODING_TIMEOUT_MS, 8_000),
    cacheTtlMs: parseNumber(import.meta.env.VITE_GEOCODING_CACHE_TTL_MS, 30 * 60 * 1000),
    searchDebounceMs: parseNumber(import.meta.env.VITE_GEOCODING_SEARCH_DEBOUNCE_MS, 300),
  },
  fuelApi: {
    recordsUrl: withProxy(
      "/fuel/records",
      import.meta.env.VITE_FUEL_API_RECORDS_URL ??
        "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records",
    ),
    dailyHistoryUrl: withProxy(
      "/fuel/history",
      import.meta.env.VITE_FUEL_API_DAILY_HISTORY_URL ??
        "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records",
    ),
    timeoutMs: parseNumber(import.meta.env.VITE_FUEL_API_TIMEOUT_MS, 10_000),
    nearbyCacheTtlMs: parseNumber(import.meta.env.VITE_FUEL_API_NEARBY_CACHE_TTL_MS, 60 * 1000),
    detailCacheTtlMs: parseNumber(import.meta.env.VITE_FUEL_API_DETAIL_CACHE_TTL_MS, 5 * 60 * 1000),
    historyCacheTtlMs: parseNumber(import.meta.env.VITE_FUEL_API_HISTORY_CACHE_TTL_MS, 30 * 60 * 1000),
  },
  osm: {
    overpassUrl: withProxy(
      "/osm/brand",
      defaultOsmApiUrl,
    ),
    timeoutMs: parseNumber(import.meta.env.VITE_OVERPASS_TIMEOUT_MS, 8_000),
  },
  routing: {
    url: withProxy("/route", import.meta.env.VITE_ROUTING_URL ?? "https://router.project-osrm.org/route/v1/driving"),
    timeoutMs: parseNumber(import.meta.env.VITE_ROUTING_TIMEOUT_MS, 12_000),
  },
  europe: {
    marketsUrl: withProxy("/europe/markets", import.meta.env.VITE_EUROPE_MARKETS_URL ?? ""),
    timeoutMs: parseNumber(import.meta.env.VITE_EUROPE_TIMEOUT_MS, 12_000),
    cacheTtlMs: parseNumber(import.meta.env.VITE_EUROPE_CACHE_TTL_MS, 6 * 60 * 60 * 1000),
  },
  feedback: {
    endpoint: withProxy("/price-feedback", "/api/price-feedback"),
    cooldownHours: parseNumber(import.meta.env.VITE_PRICE_FEEDBACK_COOLDOWN_HOURS, 12),
  },
  map: {
    lightTilesUrl:
      import.meta.env.VITE_MAP_LIGHT_TILES_URL ??
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    darkTilesUrl:
      import.meta.env.VITE_MAP_DARK_TILES_URL ??
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    tileAttribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  proxy: {
    apiBaseUrl: proxyApiBaseUrl,
  },
} as const;
