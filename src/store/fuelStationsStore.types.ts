import type {
  Coordinates,
  FuelStation,
  FuelType,
  GeocodingResult,
  LocationSource,
  PersistedLocation,
  RoutePath,
  ServiceType,
  SortMode,
  ThemeName,
} from "@/types/station";

export interface ActionOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export interface SearchActionOptions extends ActionOptions {
  immediate?: boolean;
}

export interface PreferencesSlice {
  hasHydrated: boolean;
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  sortMode: SortMode;
  themeName: ThemeName;
  favoriteIds: string[];
  consumptionLitersPer100Km: number;
  fillVolumeLiters: number;
  favoriteAlertPrice: number | null;
  toggleFavorite: (stationId: string) => void;
  setTheme: (value: ThemeName) => void;
  setSelectedFuel: (value: FuelType) => void;
  setRadiusKm: (value: number) => void;
  setOpenOnly: (value: boolean) => void;
  setSelectedServices: (value: ServiceType[]) => void;
  setSortMode: (value: SortMode) => void;
  setConsumptionLitersPer100Km: (value: number) => void;
  setFillVolumeLiters: (value: number) => void;
  setFavoriteAlertPrice: (value: number | null) => void;
  setHasHydrated: (value: boolean) => void;
}

export interface LocationSlice {
  userPosition: Coordinates | null;
  locationSource: LocationSource;
  locationPlaceId: string | null;
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  geoError: string | null;
  geocodingError: string | null;
  locationDenied: boolean;
  searchQuery: string;
  geocodingResults: GeocodingResult[];
  requestUserLocation: (options?: ActionOptions) => Promise<void>;
  searchLocations: (query: string, options?: SearchActionOptions) => Promise<void>;
  selectSearchLocation: (result: GeocodingResult) => void;
  refreshPosition: () => Promise<void>;
}

export interface RouteSlice {
  routeDestination: string;
  isSearchingRoute: boolean;
  routePosition: Coordinates | null;
  routePath: RoutePath | null;
  isLoadingRoute: boolean;
  routeError: string | null;
  routeResults: GeocodingResult[];
  ensureRoutePath: (
    origin: Coordinates,
    destination: Coordinates | null,
    options?: ActionOptions,
  ) => Promise<RoutePath | null>;
  searchRoute: (query: string, options?: SearchActionOptions) => Promise<void>;
  selectRouteLocation: (result: GeocodingResult) => Promise<void>;
  clearRoute: () => void;
}

export interface StationsSlice {
  stations: FuelStation[];
  isLoading: boolean;
  isHydratingHistory: boolean;
  isHydratingRouteDetours: boolean;
  genericError: string | null;
  confirmedStationIds: string[];
  initialize: () => Promise<void>;
  loadStationsForArea: (position: Coordinates, options?: ActionOptions) => Promise<void>;
  scheduleStationsReload: (options?: Omit<ActionOptions, "signal"> & { immediate?: boolean }) => void;
  loadStationById: (id: string) => Promise<FuelStation | null>;
  confirmStationPrice: (stationId: string) => void;
}

export type FuelStationsState = PreferencesSlice & LocationSlice & RouteSlice & StationsSlice;

export interface PersistedState {
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  themeName: ThemeName;
  sortMode: SortMode;
  favoriteIds: string[];
  userPosition: PersistedLocation | null;
  locationSource: LocationSource;
  locationPlaceId: string | null;
  consumptionLitersPer100Km: number;
  fillVolumeLiters: number;
  favoriteAlertPrice: number | null;
}
