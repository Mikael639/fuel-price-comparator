import type { Coordinates } from "@/types/station";
import { appConfig } from "@/config/app";
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
  sp95_maj?: string | null;
  sp98_prix?: number | null;
  sp98_maj?: string | null;
  gazole_prix?: number | null;
  gazole_maj?: string | null;
  e85_prix?: number | null;
  e85_maj?: string | null;
  gplc_prix?: number | null;
  gplc_maj?: string | null;
  e10_prix?: number | null;
  e10_maj?: string | null;
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

const stationSelect = [
  "id",
  "adresse",
  "ville",
  "cp",
  "geom",
  "services_service",
  "horaires",
  "horaires_jour",
  "horaires_automate_24_24",
  "sp95_prix",
  "sp95_maj",
  "sp98_prix",
  "sp98_maj",
  "gazole_prix",
  "gazole_maj",
  "e85_prix",
  "e85_maj",
  "gplc_prix",
  "gplc_maj",
  "e10_prix",
  "e10_maj",
  "carburants_disponibles",
  "carburants_indisponibles",
].join(",");

const MAX_DAILY_HISTORY_RECORDS = 100;
const HISTORY_LIMIT_PER_STATION = 35;
const HISTORY_BATCH_SIZE = Math.max(1, Math.floor(MAX_DAILY_HISTORY_RECORDS / HISTORY_LIMIT_PER_STATION));

const buildNearbyUrl = (position: Coordinates, radiusKm: number) => {
  const params = new URLSearchParams({
    limit: "100",
    select: stationSelect,
    where: `within_distance(geom, geom'POINT(${position.lng} ${position.lat})', ${radiusKm} km)`,
  });

  return `${appConfig.fuelApi.recordsUrl}?${params.toString()}`;
};

const buildStationByIdUrl = (id: string) => {
  const params = new URLSearchParams({
    limit: "1",
    select: stationSelect,
    where: `id=${id}`,
  });

  return `${appConfig.fuelApi.recordsUrl}?${params.toString()}`;
};

const buildDailyHistoryUrl = (id: string) => {
  const params = new URLSearchParams({
    limit: String(MAX_DAILY_HISTORY_RECORDS),
    select: "id,prix_nom,prix_valeur,prix_maj",
    where: `id=${id}`,
    order_by: "prix_maj desc",
  });

  return `${appConfig.fuelApi.dailyHistoryUrl}?${params.toString()}`;
};

const buildDailyHistoryBatchUrl = (ids: string[]) => {
  const params = new URLSearchParams({
    limit: String(ids.length * HISTORY_LIMIT_PER_STATION),
    select: "id,prix_nom,prix_valeur,prix_maj",
    where: `(${ids.map((id) => `id=${id}`).join(" OR ")})`,
    order_by: "prix_maj desc",
  });

  return `${appConfig.fuelApi.dailyHistoryUrl}?${params.toString()}`;
};

const chunkArray = <T>(items: T[], size: number) =>
  items.reduce<T[][]>((chunks, item, index) => {
    if (index % size === 0) {
      chunks.push([item]);
      return chunks;
    }

    chunks[chunks.length - 1]?.push(item);
    return chunks;
  }, []);

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
      timeoutMs: appConfig.fuelApi.timeoutMs,
      errorMessage: "L'API officielle des carburants est indisponible.",
    });

    const results = payload.results ?? [];
    this.setCachedValue(this.nearbyCache, requestUrl, results, appConfig.fuelApi.nearbyCacheTtlMs);
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
      timeoutMs: appConfig.fuelApi.timeoutMs,
      errorMessage: "La station demandee est indisponible dans l'API officielle.",
    });

    const result = payload.results?.[0] ?? null;
    this.setCachedValue(this.stationByIdCache, requestUrl, result, appConfig.fuelApi.detailCacheTtlMs);
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
      timeoutMs: appConfig.fuelApi.timeoutMs,
      errorMessage: "L'historique officiel des prix est indisponible.",
    });

    const results = payload.results ?? [];
    this.setCachedValue(this.dailyHistoryCache, requestUrl, results, appConfig.fuelApi.historyCacheTtlMs);
    return results;
  }

  async getDailyHistoryForStations(ids: string[], options?: RequestOptions) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (uniqueIds.length === 0) {
      return [];
    }

    const batches = chunkArray(uniqueIds, HISTORY_BATCH_SIZE);
    const responses = await Promise.all(
      batches.map(async (batch) => {
        const requestUrl = buildDailyHistoryBatchUrl(batch);
        const cachedValue = options?.forceRefresh ? null : this.getCachedValue(this.dailyHistoryCache, requestUrl);

        if (cachedValue) {
          return cachedValue;
        }

        const payload = await fetchJson<DailyHistoryResponse>(requestUrl, {
          signal: options?.signal,
          timeoutMs: appConfig.fuelApi.timeoutMs,
          errorMessage: "L'historique officiel des prix est indisponible.",
        });

        const results = payload.results ?? [];
        this.setCachedValue(this.dailyHistoryCache, requestUrl, results, appConfig.fuelApi.historyCacheTtlMs);
        return results;
      }),
    );

    return responses.flat();
  }
}

export const fuelApiService = new FuelApiService();
