import type { Coordinates } from "@/types/station";
import { fetchJson } from "@/services/apiClient";

export interface ApiStationRecord {
  id: number | string;
  adresse?: string | null;
  ville?: string | null;
  cp?: string | null;
  geom?: {
    lon: number;
    lat: number;
  } | null;
  services_service?: string[] | null;
  horaires?: string | null;
  horaires_jour?: string | null;
  horaires_automate_24_24?: string | null;
  sp95_prix?: number | null;
  sp98_prix?: number | null;
  gazole_prix?: number | null;
  e85_prix?: number | null;
  gplc_prix?: number | null;
  e10_prix?: number | null;
  carburants_disponibles?: string[] | null;
  carburants_indisponibles?: string[] | null;
}

interface ApiRecordsResponse {
  results?: ApiStationRecord[];
}

export interface DailyHistoryRecord {
  id: string;
  prix_nom: string;
  prix_valeur: number;
  prix_maj: string;
}

interface DailyHistoryResponse {
  results?: DailyHistoryRecord[];
}

interface RequestOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const API_BASE_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const DAILY_API_BASE_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records";

const STATIONS_CACHE_TTL_MS = 60 * 1000;
const STATION_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const HISTORY_CACHE_TTL_MS = 30 * 60 * 1000;

const stationSelect =
  "id,adresse,ville,cp,geom,services_service,horaires,horaires_jour,horaires_automate_24_24,sp95_prix,sp98_prix,gazole_prix,e85_prix,gplc_prix,e10_prix,carburants_disponibles,carburants_indisponibles";

const buildNearbyUrl = (position: Coordinates, radiusKm: number) => {
  const params = new URLSearchParams({
    limit: "100",
    select: stationSelect,
    where: `within_distance(geom, geom'POINT(${position.lng} ${position.lat})', ${radiusKm} km)`,
  });

  return `${API_BASE_URL}?${params.toString()}`;
};

const buildStationByIdUrl = (id: string) => {
  const params = new URLSearchParams({
    limit: "1",
    select: stationSelect,
    where: `id=${id}`,
  });

  return `${API_BASE_URL}?${params.toString()}`;
};

const buildDailyHistoryUrl = (id: string) => {
  const params = new URLSearchParams({
    limit: "180",
    select: "id,prix_nom,prix_valeur,prix_maj",
    where: `id=${id}`,
    order_by: "prix_maj desc",
  });

  return `${DAILY_API_BASE_URL}?${params.toString()}`;
};

class FuelApiService {
  private readonly nearbyCache = new Map<string, CacheEntry<ApiStationRecord[]>>();
  private readonly stationByIdCache = new Map<string, CacheEntry<ApiStationRecord | null>>();
  private readonly dailyHistoryCache = new Map<string, CacheEntry<DailyHistoryRecord[]>>();

  private getCachedValue<T>(cache: Map<string, CacheEntry<T>>, cacheKey: string) {
    const cachedEntry = cache.get(cacheKey);

    if (!cachedEntry) {
      return null;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
      cache.delete(cacheKey);
      return null;
    }

    return cachedEntry.value;
  }

  private setCachedValue<T>(
    cache: Map<string, CacheEntry<T>>,
    cacheKey: string,
    value: T,
    ttlMs: number,
  ) {
    cache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      value,
    });
  }

  async getStationsAround(position: Coordinates, radiusKm: number, options?: RequestOptions) {
    const requestUrl = buildNearbyUrl(position, radiusKm);
    const cachedValue = options?.forceRefresh ? null : this.getCachedValue(this.nearbyCache, requestUrl);

    if (cachedValue) {
      return cachedValue;
    }

    const payload = await fetchJson<ApiRecordsResponse>(requestUrl, {
      signal: options?.signal,
      timeoutMs: 10_000,
      errorMessage: "L'API officielle des carburants est indisponible.",
    });

    const results = payload.results ?? [];
    this.setCachedValue(this.nearbyCache, requestUrl, results, STATIONS_CACHE_TTL_MS);
    return results;
  }

  async getStationById(id: string, options?: RequestOptions) {
    const requestUrl = buildStationByIdUrl(id);
    const cachedValue = options?.forceRefresh ? null : this.getCachedValue(this.stationByIdCache, requestUrl);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const payload = await fetchJson<ApiRecordsResponse>(requestUrl, {
      signal: options?.signal,
      timeoutMs: 10_000,
      errorMessage: "La station demand\u00e9e est indisponible dans l'API officielle.",
    });

    const result = payload.results?.[0] ?? null;
    this.setCachedValue(this.stationByIdCache, requestUrl, result, STATION_DETAIL_CACHE_TTL_MS);
    return result;
  }

  async getDailyHistory(id: string, options?: RequestOptions) {
    const requestUrl = buildDailyHistoryUrl(id);
    const cachedValue = options?.forceRefresh ? null : this.getCachedValue(this.dailyHistoryCache, requestUrl);

    if (cachedValue) {
      return cachedValue;
    }

    const payload = await fetchJson<DailyHistoryResponse>(requestUrl, {
      signal: options?.signal,
      timeoutMs: 10_000,
      errorMessage: "L'historique officiel des prix est indisponible.",
    });

    const results = payload.results ?? [];
    this.setCachedValue(this.dailyHistoryCache, requestUrl, results, HISTORY_CACHE_TTL_MS);
    return results;
  }
}

export const fuelApiService = new FuelApiService();
