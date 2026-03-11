import { fetchJson } from "@/services/apiClient";

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

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

class OsmService {
  private readonly brandCache = new Map<string, string | null>();

  async lookupFuelBrand(lat: number, lng: number) {
    const cacheKey = `${lat.toFixed(5)}:${lng.toFixed(5)}`;

    if (this.brandCache.has(cacheKey)) {
      return this.brandCache.get(cacheKey) ?? null;
    }

    try {
      const payload = await fetchJson<OverpassResponse>(OVERPASS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: buildBrandQuery(lat, lng),
        timeoutMs: 8_000,
        errorMessage: "La source OSM compl\u00e9mentaire est indisponible.",
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

      this.brandCache.set(cacheKey, brand);
      return brand;
    } catch {
      this.brandCache.set(cacheKey, null);
      return null;
    }
  }
}

export const osmService = new OsmService();
