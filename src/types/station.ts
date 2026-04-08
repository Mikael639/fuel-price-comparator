export const FUEL_TYPES = ["SP95", "SP95-E10", "SP98", "Diesel", "E85", "GPL"] as const;
export const SERVICE_TYPES = [
  "Superette",
  "Lavage",
  "Gonflage",
  "Toilettes",
  "Borne de recharge",
  "Station 24h/24",
] as const;
export const SORT_MODES = ["price", "distance", "savings", "smartFill", "favorites"] as const;

export type FuelType = (typeof FUEL_TYPES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type SortMode = (typeof SORT_MODES)[number];
export type PriceTrend = "up" | "down" | "stable";
export type LocationSource = "browser" | "search" | null;
export type ThemeName = "fuelLight" | "fuelDark";
export type BrandSource = "mock" | "inferred" | "osm" | "not_provided";
export type FavoriteAlertSeverity = "success" | "info" | "warning";

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
  priceUpdatedAt: Partial<Record<FuelType, string>>;
  lastUpdatedAt: string | null;
  services: ServiceType[];
  dataOrigin?: "official" | "mock";
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
  fillVolumeLiters: number;
  estimatedFillCost: number | null;
  estimatedDetourCost: number | null;
  netSavingsForTank: number | null;
  priceTrend: PriceTrend;
  isRouteDetour: boolean;
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
  fillVolumeLiters: number;
  consumptionLitersPer100Km: number;
  routePosition?: Coordinates | null;
}

export interface StationStats {
  stationCount: number;
  comparableCount: number;
  averagePrice: number | null;
  maxSavings: number | null;
  maxNetSavings: number | null;
  freshestPriceUpdate: string | null;
  staleCount: number;
}

export interface RouteResult {
  destination: string;
  position: Coordinates;
}

export interface FavoriteAlert {
  id: string;
  stationId?: string;
  severity: FavoriteAlertSeverity;
  title: string;
  description: string;
}
