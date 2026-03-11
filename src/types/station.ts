export const FUEL_TYPES = ["SP95", "SP98", "Diesel", "E85", "GPL"] as const;
export const SERVICE_TYPES = [
  "Supérette",
  "Lavage",
  "Gonflage",
  "Toilettes",
  "Borne de recharge",
  "Station 24h/24",
] as const;
export const SORT_MODES = ["price", "distance", "savings", "favorites"] as const;

export type FuelType = (typeof FUEL_TYPES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type SortMode = (typeof SORT_MODES)[number];
export type PriceTrend = "up" | "down" | "stable";
export type LocationSource = "browser" | "manual" | "demo" | "search" | null;
export type ThemeName = "fuelLight" | "fuelDark";
export type BrandSource = "mock" | "inferred" | "osm" | "not_provided";

export interface Coordinates {
  lat: number;
  lng: number;
  label?: string;
}

export interface PersistedLocation extends Coordinates {
  source: Exclude<LocationSource, null>;
  savedAt: string;
  placeId?: string | null;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export type FuelPrices = Partial<Record<FuelType, number>>;
export type PriceHistory = Partial<Record<FuelType, PriceHistoryPoint[]>>;

export interface FuelStation {
  id: string;
  name: string;
  brand: string;
  brandSource: BrandSource;
  address: string;
  city: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  openingHours: string;
  fuels: FuelType[];
  fuelPrices: FuelPrices;
  priceHistory: PriceHistory;
  services: ServiceType[];
}

export interface MockLocation {
  id: string;
  label: string;
  city: string;
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  id: string;
  label: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
}

export interface StationWithMetrics extends FuelStation {
  distanceKm: number;
  selectedFuelPrice: number | null;
  estimatedDriveMinutes: number;
  savingsPerLiter: number | null;
  isFavorite: boolean;
}

export interface StationFilters {
  fuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  services: ServiceType[];
  sortMode: SortMode;
  favoriteIds: string[];
}

export interface StationSearchParams extends StationFilters {
  position: Coordinates;
  stations: FuelStation[];
}

export interface StationStats {
  stationCount: number;
  comparableCount: number;
  averagePrice: number | null;
  maxSavings: number | null;
}
