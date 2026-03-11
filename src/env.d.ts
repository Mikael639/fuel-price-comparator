/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_RADIUS_KM?: string;
  readonly VITE_RECOMMENDED_FOCUS_RADIUS_KM?: string;
  readonly VITE_STATION_RELOAD_DEBOUNCE_MS?: string;
  readonly VITE_GEOCODING_SEARCH_DEBOUNCE_MS?: string;
  readonly VITE_GEOCODING_URL?: string;
  readonly VITE_GEOCODING_TIMEOUT_MS?: string;
  readonly VITE_GEOCODING_CACHE_TTL_MS?: string;
  readonly VITE_FUEL_API_RECORDS_URL?: string;
  readonly VITE_FUEL_API_DAILY_HISTORY_URL?: string;
  readonly VITE_FUEL_API_TIMEOUT_MS?: string;
  readonly VITE_FUEL_API_NEARBY_CACHE_TTL_MS?: string;
  readonly VITE_FUEL_API_DETAIL_CACHE_TTL_MS?: string;
  readonly VITE_FUEL_API_HISTORY_CACHE_TTL_MS?: string;
  readonly VITE_OVERPASS_URL?: string;
  readonly VITE_OVERPASS_TIMEOUT_MS?: string;
  readonly VITE_MAP_LIGHT_TILES_URL?: string;
  readonly VITE_MAP_DARK_TILES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
