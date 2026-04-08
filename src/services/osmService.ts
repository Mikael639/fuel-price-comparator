import { appConfig } from "@/config/app";
import { ApiServiceError, fetchJson } from "@/services/apiClient";

interface OsmElement {
  type: "node" | "way";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    brand?: string;
    operator?: string;
    name?: string;
  };
}

interface OverpassResponse {
  elements?: OsmElement[];
}

interface CacheEntry {
  expiresAt: number;
  value: string | null;
}

const buildBrandQuery = (lat: number, lng: number) => `
[out:json][timeout:20];
(
  node["amenity"="fuel"](around:90,${lat},${lng});
  way["amenity"="fuel"](around:90,${lat},${lng});
);
out center tags 8;
`;

const getCoordinates = (element: OsmElement) => ({
  lat: element.lat ?? element.center?.lat ?? null,
  lng: element.lon ?? element.center?.lon ?? null,
});

const SUCCESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;

class OsmService {
  private readonly brandCache = new Map<string, CacheEntry>();
  private readonly inFlightLookups = new Map<string, Promise<string | null>>();
  private rateLimitedUntil = 0;

  private getCachedValue(cacheKey: string) {
    const entry = this.brandCache.get(cacheKey);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.brandCache.delete(cacheKey);
      return undefined;
    }

    return entry.value;
  }

  private setCachedValue(cacheKey: string, value: string | null, ttlMs: number) {
    this.brandCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private startRateLimitCooldown() {
    this.rateLimitedUntil = Math.max(this.rateLimitedUntil, Date.now() + RATE_LIMIT_COOLDOWN_MS);
  }

  async lookupFuelBrand(lat: number, lng: number) {
    const cacheKey = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const cachedValue = this.getCachedValue(cacheKey);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    if (this.rateLimitedUntil > Date.now()) {
      this.setCachedValue(cacheKey, null, RATE_LIMIT_COOLDOWN_MS);
      return null;
    }

    const inFlightLookup = this.inFlightLookups.get(cacheKey);

    if (inFlightLookup) {
      return inFlightLookup;
    }

    const lookupPromise = this.fetchBrand(cacheKey, lat, lng).finally(() => {
      this.inFlightLookups.delete(cacheKey);
    });

    this.inFlightLookups.set(cacheKey, lookupPromise);
    return lookupPromise;
  }

  private async fetchBrand(cacheKey: string, lat: number, lng: number) {
    try {
      const payload = await fetchJson<OverpassResponse>(appConfig.osm.overpassUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: buildBrandQuery(lat, lng),
        timeoutMs: appConfig.osm.timeoutMs,
        errorMessage: "La source OSM complementaire est indisponible.",
      });

      const bestMatch = (payload.elements ?? [])
        .map((element) => ({
          element,
          coords: getCoordinates(element),
        }))
        .filter(
          (
            candidate,
          ): candidate is {
            element: OsmElement;
            coords: { lat: number; lng: number };
          } => candidate.coords.lat != null && candidate.coords.lng != null,
        )
        .sort((left, right) => {
          const leftDistance = Math.hypot(left.coords.lat - lat, left.coords.lng - lng);
          const rightDistance = Math.hypot(right.coords.lat - lat, right.coords.lng - lng);
          return leftDistance - rightDistance;
        })[0];

      const brand =
        bestMatch?.element.tags?.brand ??
        bestMatch?.element.tags?.operator ??
        bestMatch?.element.tags?.name ??
        null;

      this.setCachedValue(cacheKey, brand, brand ? SUCCESS_CACHE_TTL_MS : EMPTY_CACHE_TTL_MS);
      return brand;
    } catch (error) {
      if (error instanceof ApiServiceError && error.status === 429) {
        this.startRateLimitCooldown();
        this.setCachedValue(cacheKey, null, RATE_LIMIT_COOLDOWN_MS);
        return null;
      }

      this.setCachedValue(cacheKey, null, FAILURE_CACHE_TTL_MS);
      return null;
    }
  }
}

export const osmService = new OsmService();
