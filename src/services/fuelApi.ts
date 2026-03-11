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

const API_BASE_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const DAILY_API_BASE_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records";

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
  async getStationsAround(position: Coordinates, radiusKm: number) {
    const payload = await fetchJson<ApiRecordsResponse>(buildNearbyUrl(position, radiusKm), {
      errorMessage: "L'API officielle des carburants est indisponible.",
    });

    return payload.results ?? [];
  }

  async getStationById(id: string) {
    const payload = await fetchJson<ApiRecordsResponse>(buildStationByIdUrl(id), {
      errorMessage: "La station demandée est indisponible dans l'API officielle.",
    });

    return payload.results?.[0] ?? null;
  }

  async getDailyHistory(id: string) {
    const payload = await fetchJson<DailyHistoryResponse>(buildDailyHistoryUrl(id), {
      errorMessage: "L'historique officiel des prix est indisponible.",
    });

    return payload.results ?? [];
  }
}

export const fuelApiService = new FuelApiService();
