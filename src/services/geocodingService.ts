import type { GeocodingResult } from "@/types/station";
import { fetchJson } from "@/services/apiClient";

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

const GEOCODING_URL = "https://nominatim.openstreetmap.org/search";

const buildGeocodingUrl = (query: string) => {
  const params = new URLSearchParams({
    format: "jsonv2",
    countrycodes: "fr",
    limit: "5",
    addressdetails: "1",
    q: query,
  });

  return `${GEOCODING_URL}?${params.toString()}`;
};

const toResult = (record: NominatimResult): GeocodingResult => {
  const city =
    record.address?.city ??
    record.address?.town ??
    record.address?.village ??
    record.address?.municipality ??
    record.address?.county ??
    "Lieu recherché";

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
  async search(query: string) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const payload = await fetchJson<NominatimResult[]>(buildGeocodingUrl(trimmedQuery), {
      errorMessage: "Le géocodage est indisponible pour le moment.",
    });

    return payload.map(toResult);
  }
}

export const geocodingService = new GeocodingService();
