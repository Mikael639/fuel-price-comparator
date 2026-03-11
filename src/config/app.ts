const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  theme: {
    defaultTheme: "fuelLight",
  },
  stations: {
    defaultRadiusKm: parseNumber(import.meta.env.VITE_DEFAULT_RADIUS_KM, 10),
    recommendedFocusRadiusKm: parseNumber(import.meta.env.VITE_RECOMMENDED_FOCUS_RADIUS_KM, 8),
    reloadDebounceMs: parseNumber(import.meta.env.VITE_STATION_RELOAD_DEBOUNCE_MS, 250),
  },
  geocoding: {
    url: import.meta.env.VITE_GEOCODING_URL ?? "https://nominatim.openstreetmap.org/search",
    timeoutMs: parseNumber(import.meta.env.VITE_GEOCODING_TIMEOUT_MS, 8_000),
    cacheTtlMs: parseNumber(import.meta.env.VITE_GEOCODING_CACHE_TTL_MS, 30 * 60 * 1000),
    searchDebounceMs: parseNumber(import.meta.env.VITE_GEOCODING_SEARCH_DEBOUNCE_MS, 300),
  },
  fuelApi: {
    recordsUrl:
      import.meta.env.VITE_FUEL_API_RECORDS_URL ??
      "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records",
    dailyHistoryUrl:
      import.meta.env.VITE_FUEL_API_DAILY_HISTORY_URL ??
      "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records",
    timeoutMs: parseNumber(import.meta.env.VITE_FUEL_API_TIMEOUT_MS, 10_000),
    nearbyCacheTtlMs: parseNumber(import.meta.env.VITE_FUEL_API_NEARBY_CACHE_TTL_MS, 60 * 1000),
    detailCacheTtlMs: parseNumber(import.meta.env.VITE_FUEL_API_DETAIL_CACHE_TTL_MS, 5 * 60 * 1000),
    historyCacheTtlMs: parseNumber(import.meta.env.VITE_FUEL_API_HISTORY_CACHE_TTL_MS, 30 * 60 * 1000),
  },
  osm: {
    overpassUrl: import.meta.env.VITE_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter",
    timeoutMs: parseNumber(import.meta.env.VITE_OVERPASS_TIMEOUT_MS, 8_000),
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
} as const;
