import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { appConfig } from "@/config/app";
import { getBrowserCurrentPosition } from "@/hooks/useGeolocation";
import { geocodingService } from "@/services/geocodingService";
import { stationService } from "@/services/stationService";
import { haversineDistance } from "@/utils/geo";
import type {
  Coordinates,
  FuelStation,
  FuelType,
  GeocodingResult,
  LocationSource,
  PersistedLocation,
  ServiceType,
  SortMode,
  ThemeName,
} from "@/types/station";

interface FuelStationsState {
  stations: FuelStation[];
  userPosition: Coordinates | null;
  locationSource: LocationSource;
  locationPlaceId: string | null;
  hasHydrated: boolean;
  isLoading: boolean;
  isHydratingHistory: boolean;
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  geoError: string | null;
  geocodingError: string | null;
  genericError: string | null;
  locationDenied: boolean;
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  sortMode: SortMode;
  themeName: ThemeName;
  favoriteIds: string[];
  searchQuery: string;
  geocodingResults: GeocodingResult[];
  routeDestination: string;
  isSearchingRoute: boolean;
  routePosition: Coordinates | null;
  consumptionLitersPer100Km: number;
  fillVolumeLiters: number;
  favoriteAlertPrice: number | null;
  routeResults: GeocodingResult[];
  initialize: () => Promise<void>;
  loadStationsForArea: (position: Coordinates, options?: { forceRefresh?: boolean }) => Promise<void>;
  requestUserLocation: (options?: { forceRefresh?: boolean }) => Promise<void>;
  searchLocations: (query: string) => Promise<void>;
  selectSearchLocation: (result: GeocodingResult) => void;
  refreshPosition: () => Promise<void>;
  loadStationById: (id: string) => Promise<FuelStation | null>;
  toggleFavorite: (stationId: string) => void;
  setTheme: (value: ThemeName) => void;
  setSelectedFuel: (value: FuelType) => void;
  setRadiusKm: (value: number) => void;
  setOpenOnly: (value: boolean) => void;
  setSelectedServices: (value: ServiceType[]) => void;
  setSortMode: (value: SortMode) => void;
  searchRoute: (query: string) => Promise<void>;
  selectRouteLocation: (result: GeocodingResult) => Promise<void>;
  setConsumptionLitersPer100Km: (value: number) => void;
  setFillVolumeLiters: (value: number) => void;
  setFavoriteAlertPrice: (value: number | null) => void;
  clearRoute: () => void;
  setHasHydrated: (value: boolean) => void;
}

interface PersistedState {
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

const persistLocation = (position: Coordinates | null, source: LocationSource, placeId: string | null): PersistedLocation | null =>
  position && source
    ? {
        ...position,
        source,
        placeId,
        savedAt: new Date().toISOString(),
      }
    : null;

const applyLocationState = (
  set: (partial: Partial<FuelStationsState>) => void,
  location: Coordinates,
  source: Exclude<LocationSource, null>,
  options?: { placeId?: string | null },
) => {
  set({
    userPosition: location,
    locationSource: source,
    locationPlaceId: options?.placeId ?? null,
    geoError: null,
    geocodingError: null,
    genericError: null,
  });
};

export const useFuelStationsStore = create<FuelStationsState>()(
  persist(
    (set, get) => ({
      stations: [],
      userPosition: null,
      locationSource: null,
      locationPlaceId: null,
      hasHydrated: false,
      isLoading: false,
      isHydratingHistory: false,
      isGeolocating: false,
      isSearchingLocation: false,
      geoError: null,
      geocodingError: null,
      genericError: null,
      locationDenied: false,
      selectedFuel: "Diesel",
      radiusKm: appConfig.stations.defaultRadiusKm,
      openOnly: false,
      selectedServices: [],
      sortMode: "price",
      themeName: "fuelLight",
      favoriteIds: [],
      searchQuery: "",
      geocodingResults: [],
      routeDestination: "",
      isSearchingRoute: false,
      routePosition: null,
      consumptionLitersPer100Km: appConfig.stations.defaultConsumptionLitersPer100Km,
      fillVolumeLiters: appConfig.stations.defaultTankVolumeLiters,
      favoriteAlertPrice: appConfig.stations.defaultFavoriteAlertPrice,
      routeResults: [],
      initialize: async () => {
        const { stations, userPosition } = get();
        if (stations.length === 0) {
          set({ stations: stationService.getMockStations() });
        }
        if (userPosition) {
          await get().loadStationsForArea(userPosition);
        }
      },
      loadStationsForArea: async (position, options) => {
        set({ isLoading: true, isHydratingHistory: false, genericError: null });

        try {
          let stations = await stationService.getStationsAround(position, get().radiusKm, options);

          const { routePosition } = get();
          if (routePosition && (routePosition.lat !== position.lat || routePosition.lng !== position.lng)) {
            try {
              const destinationStations = await stationService.getStationsAround(routePosition, get().radiusKm, options);
              const existingIds = new Set(stations.map((station) => station.id));
              const newStations = destinationStations.filter((station) => !existingIds.has(station.id));
              stations = [...stations, ...newStations];
            } catch (error) {
              console.error("Failed to load destination stations", error);
            }
          }

          set({
            stations,
            genericError:
              stations.length === 0 ? "Aucune station n'a ete retournee par l'API officielle dans cette zone." : null,
          });

          const candidates = stations
            .filter((station) => station.brandSource === "not_provided")
            .sort((left, right) => haversineDistance(position, left) - haversineDistance(position, right))
            .slice(0, 5);

          void (async () => {
            for (const candidate of candidates) {
              const enrichedStation = await stationService.enrichStationBrand(candidate);
              if (enrichedStation.brandSource !== candidate.brandSource) {
                set((state) => ({
                  stations: state.stations.map((station) => (station.id === enrichedStation.id ? enrichedStation : station)),
                }));
              }
            }
          })();

          if (stations.length > 0) {
            set({ isHydratingHistory: true });

            try {
              const historyEnrichedStations = await stationService.enrichStationsHistory(stations, options);
              set({ stations: historyEnrichedStations });
            } finally {
              set({ isHydratingHistory: false });
            }
          }
        } catch (error) {
          // API unavailable — use local fallback silently (no blocking error shown to user)
          const fallbackStations = stationService.getMockStations();
          console.info("[FuelFlash] API indisponible, utilisation du dataset local de secours.", error);
          set({
            stations: fallbackStations,
            isHydratingHistory: false,
            genericError: fallbackStations.length === 0 ? "Impossible de charger les stations. Veuillez reessayer." : null,
          });
        } finally {
          set({ isLoading: false });
        }
      },
      requestUserLocation: async (options) => {
        await get().initialize();
        set({ isGeolocating: true, geoError: null, genericError: null });

        const result = await getBrowserCurrentPosition();
        set({ isGeolocating: false });

        if (result.ok) {
          set({ locationDenied: false });
          applyLocationState(set, result.coordinates, "browser");
          await get().loadStationsForArea(result.coordinates, options);
          return;
        }

        set({
          geoError: get().userPosition
            ? `${result.error.message} La derniere position affichee a ete conservee.`
            : result.error.message,
          locationDenied: result.error.code === "denied",
        });
      },
      searchLocations: async (query) => {
        set({ searchQuery: query, geocodingError: null });
        if (!query.trim()) {
          set({ geocodingResults: [] });
          return;
        }

        set({ isSearchingLocation: true });
        try {
          const geocodingResults = await geocodingService.search(query);
          set({
            geocodingResults,
            geocodingError:
              geocodingResults.length === 0 ? "Aucun resultat de geocodage n'a ete trouve pour cette recherche." : null,
          });
        } catch (error) {
          set({
            geocodingResults: [],
            geocodingError: error instanceof Error ? error.message : "Le geocodage est indisponible pour le moment.",
          });
        } finally {
          set({ isSearchingLocation: false });
        }
      },
      selectSearchLocation: (result) => {
        const coordinates = stationService.createSearchLocation(result);
        set({ locationDenied: false });
        applyLocationState(set, coordinates, "search", { placeId: result.id });
        void get().loadStationsForArea(coordinates);
      },
      refreshPosition: async () => {
        const { locationSource, userPosition } = get();
        if (locationSource === "browser") {
          await get().requestUserLocation({ forceRefresh: true });
          return;
        }

        if (userPosition) {
          await get().loadStationsForArea(userPosition, { forceRefresh: true });
          return;
        }

        await get().requestUserLocation({ forceRefresh: true });
      },
      loadStationById: async (id) => {
        const existingStation = get().stations.find((station) => station.id === id) ?? null;
        try {
          const station = existingStation ?? (await stationService.getStationById(id));
          if (!station) {
            return null;
          }

          const enrichedHistoryStation = await stationService.enrichStationHistory(station);
          const enrichedStation = await stationService.enrichStationBrand(enrichedHistoryStation);

          set((state) => ({
            stations: state.stations.some((item) => item.id === id)
              ? state.stations.map((item) => (item.id === id ? enrichedStation : item))
              : [...state.stations, enrichedStation],
          }));

          return enrichedStation;
        } catch {
          return stationService.getMockStations().find((station) => station.id === id) ?? null;
        }
      },
      toggleFavorite: (stationId) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(stationId)
            ? state.favoriteIds.filter((id) => id !== stationId)
            : [...state.favoriteIds, stationId],
        })),
      setTheme: (value) => set({ themeName: value }),
      setSelectedFuel: (value) => set({ selectedFuel: value }),
      setRadiusKm: (value) => {
        set({ radiusKm: value });
        const { userPosition } = get();
        if (userPosition) {
          void get().loadStationsForArea(userPosition);
        }
      },
      setOpenOnly: (value) => set({ openOnly: value }),
      setSelectedServices: (value) => set({ selectedServices: value }),
      setSortMode: (value: SortMode) => set({ sortMode: value }),
      searchRoute: async (query) => {
        set({ routeDestination: query, geocodingError: null });
        if (!query.trim()) {
          set({ routeResults: [] });
          return;
        }

        set({ isSearchingRoute: true });
        try {
          const routeResults = await geocodingService.search(query);
          set({ routeResults });
        } catch (error) {
          set({
            routeResults: [],
            geocodingError: error instanceof Error ? error.message : "Le geocodage est indisponible.",
          });
        } finally {
          set({ isSearchingRoute: false });
        }
      },
      selectRouteLocation: async (result) => {
        const coordinates = { lat: result.lat, lng: result.lng, label: result.label };
        set({
          routePosition: coordinates,
          routeDestination: `${result.label} - ${result.city}`,
          routeResults: [],
        });

        await get().loadStationsForArea(get().userPosition ?? coordinates);
      },
      setConsumptionLitersPer100Km: (value) => set({ consumptionLitersPer100Km: value }),
      setFillVolumeLiters: (value) => set({ fillVolumeLiters: value }),
      setFavoriteAlertPrice: (value) => set({ favoriteAlertPrice: value }),
      clearRoute: () => {
        set({ routePosition: null, routeDestination: "", routeResults: [] });
        const { userPosition } = get();
        if (userPosition) {
          void get().loadStationsForArea(userPosition);
        }
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "fuel-flash:preferences:v5",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.userPosition) {
          void state.initialize();
        }
      },
      partialize: (state): PersistedState => ({
        selectedFuel: state.selectedFuel,
        radiusKm: state.radiusKm,
        openOnly: state.openOnly,
        selectedServices: state.selectedServices,
        themeName: state.themeName,
        sortMode: state.sortMode,
        favoriteIds: state.favoriteIds,
        userPosition: persistLocation(state.userPosition, state.locationSource, state.locationPlaceId),
        locationSource: state.locationSource,
        locationPlaceId: state.locationPlaceId,
        consumptionLitersPer100Km: state.consumptionLitersPer100Km,
        fillVolumeLiters: state.fillVolumeLiters,
        favoriteAlertPrice: state.favoriteAlertPrice,
      }),
      merge: (persistedState, currentState) => {
        type LegacyPersistedState = Omit<Partial<PersistedState>, "locationSource"> & {
          locationSource?: string | null;
        };

        const data = persistedState as {
          state?: LegacyPersistedState;
        };
        if (!data?.state) {
          return currentState;
        }

        const persistedLocationSource = data.state.locationSource;
        const hasLegacyDemoLocation = persistedLocationSource === "manual" || persistedLocationSource === "demo";
        const restoredLocationSource =
          !hasLegacyDemoLocation && (persistedLocationSource === "browser" || persistedLocationSource === "search")
            ? persistedLocationSource
            : null;
        const restoredUserPosition =
          restoredLocationSource && data.state.userPosition
            ? {
                lat: data.state.userPosition.lat,
                lng: data.state.userPosition.lng,
                label: data.state.userPosition.label,
              }
            : null;

        return {
          ...currentState,
          selectedFuel: data.state.selectedFuel ?? currentState.selectedFuel,
          radiusKm: data.state.radiusKm ?? currentState.radiusKm,
          openOnly: data.state.openOnly ?? currentState.openOnly,
          selectedServices: data.state.selectedServices ?? currentState.selectedServices,
          themeName: data.state.themeName ?? currentState.themeName,
          sortMode: data.state.sortMode ?? currentState.sortMode,
          favoriteIds: data.state.favoriteIds ?? currentState.favoriteIds,
          userPosition: restoredUserPosition,
          locationSource: restoredLocationSource,
          locationPlaceId: restoredLocationSource === "search" ? data.state.locationPlaceId ?? null : null,
          consumptionLitersPer100Km:
            data.state.consumptionLitersPer100Km ?? currentState.consumptionLitersPer100Km,
          fillVolumeLiters: data.state.fillVolumeLiters ?? currentState.fillVolumeLiters,
          favoriteAlertPrice: data.state.favoriteAlertPrice ?? currentState.favoriteAlertPrice,
        };
      },
    },
  ),
);




