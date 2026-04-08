import type { GeocodingResult } from "@/types/station";
import { appConfig } from "@/config/app";
import { ApiServiceError, fetchJson } from "@/services/apiClient";

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
  };
  name?: string;
}

interface SearchOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

interface CacheEntry {
  expiresAt: number;
  results: GeocodingResult[];
}

const GEOCODING_RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;

const buildGeocodingUrl = (query: string) => {
  const params = new URLSearchParams({
    format: "jsonv2",
    countrycodes: "fr",
    limit: "5",
    addressdetails: "1",
    "accept-language": "fr",
    q: query,
  });

  return `${appConfig.geocoding.url}?${params.toString()}`;
};

const toResult = (record: NominatimResult): GeocodingResult => {
  const city =
    record.address?.city ??
    record.address?.town ??
    record.address?.village ??
    record.address?.municipality ??
    record.address?.county ??
    "Lieu recherche";

  return {
    id: String(record.place_id),
    label: record.name ?? city,
    city,
    address: record.display_name,
    lat: Number(record.lat),
    lng: Number(record.lon),
  };
};

class GeocodingService {
  private readonly searchCache = new Map<string, CacheEntry>();
  private rateLimitedUntil = 0;

  private getCachedResults(cacheKey: string) {
    const cachedEntry = this.searchCache.get(cacheKey);

    if (!cachedEntry) {
      return null;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    return cachedEntry.results;
  }

  async search(query: string, options?: SearchOptions) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const cacheKey = trimmedQuery.toLocaleLowerCase("fr-FR");
    const cachedResults = options?.forceRefresh ? null : this.getCachedResults(cacheKey);

    if (cachedResults) {
      return cachedResults;
    }

    if (!options?.forceRefresh && this.rateLimitedUntil > Date.now()) {
      throw new Error("Le geocodeur public est temporairement limite. Reessayez dans quelques instants.");
    }

    try {
      const payload = await fetchJson<NominatimResult[]>(buildGeocodingUrl(trimmedQuery), {
        signal: options?.signal,
        timeoutMs: appConfig.geocoding.timeoutMs,
        errorMessage: "Le geocodage est indisponible pour le moment.",
      });

      const results = payload.map(toResult);
      this.searchCache.set(cacheKey, {
        expiresAt: Date.now() + appConfig.geocoding.cacheTtlMs,
        results,
      });

      return results;
    } catch (error) {
      if (error instanceof ApiServiceError && error.status === 429) {
        this.rateLimitedUntil = Math.max(this.rateLimitedUntil, Date.now() + GEOCODING_RATE_LIMIT_COOLDOWN_MS);
        throw new Error("Le geocodeur public est temporairement limite. Reessayez dans quelques instants.");
      }

      if (error instanceof ApiServiceError && error.status === 503) {
        throw new Error("Le geocodage est temporairement indisponible. Reessayez dans quelques instants.");
      }

      throw error;
    }
  }
}

export const geocodingService = new GeocodingService();
