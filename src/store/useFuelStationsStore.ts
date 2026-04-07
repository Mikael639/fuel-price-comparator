import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mockLocations } from "@/data/mockLocations";
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
  isLoading: boolean;
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
  manualLocationId: string | null;
  favoriteIds: string[];
  searchQuery: string;
  geocodingResults: GeocodingResult[];
  routeDestination: string;
  isSearchingRoute: boolean;
  routePosition: Coordinates | null;
  consumptionLitersPer100Km: number;
  fillVolumeLiters: number;
  routeResults: GeocodingResult[];
  confirmedStationIds: string[];
  initialize: () => Promise<void>;
  loadStationsForArea: (position: Coordinates) => Promise<void>;
  requestUserLocation: () => Promise<void>;
  useDemoLocation: () => void;
  selectManualLocation: (locationId: string) => void;
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
  confirmStationPrice: (stationId: string) => void;
  clearRoute: () => void;
}

interface PersistedState {
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  themeName: ThemeName;
  manualLocationId: string | null;
  sortMode: SortMode;
  favoriteIds: string[];
  userPosition: PersistedLocation | null;
  locationSource: LocationSource;
  locationPlaceId: string | null;
  consumptionLitersPer100Km: number;
  fillVolumeLiters: number;
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
  options?: { placeId?: string | null; manualLocationId?: string | null },
) => {
  set({
    userPosition: location,
    locationSource: source,
    locationPlaceId: options?.placeId ?? null,
    manualLocationId: options?.manualLocationId ?? null,
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
      isLoading: false,
      isGeolocating: false,
      isSearchingLocation: false,
      geoError: null,
      geocodingError: null,
      genericError: null,
      locationDenied: false,
      selectedFuel: "Diesel",
      radiusKm: 10,
      openOnly: false,
      selectedServices: [],
      sortMode: "price",
      themeName: "fuelLight",
      manualLocationId: null,
      favoriteIds: [],
      searchQuery: "",
      geocodingResults: [],
      routeDestination: "",
      isSearchingRoute: false,
      routePosition: null,
      consumptionLitersPer100Km: 7,
      fillVolumeLiters: 50,
      routeResults: [],
      confirmedStationIds: [],
      initialize: async () => {
        const { stations, userPosition } = get();
        if (stations.length === 0) {
          set({ stations: stationService.getMockStations() });
        }
        if (userPosition) {
          await get().loadStationsForArea(userPosition);
        }
      },
      loadStationsForArea: async (position) => {
        set({ isLoading: true, genericError: null });

        try {
          // Load stations for current position
          let stations = await stationService.getStationsAround(position, get().radiusKm);
          
          // If itinerary is active, also load stations for destination and merge
          const { routePosition } = get();
          if (routePosition && (routePosition.lat !== position.lat || routePosition.lng !== position.lng)) {
              try {
                  const destStations = await stationService.getStationsAround(routePosition, get().radiusKm);
                  // Merge and deduplicate
                  const existingIds = new Set(stations.map(s => s.id));
                  const newStations = destStations.filter(s => !existingIds.has(s.id));
                  stations = [...stations, ...newStations];
              } catch (e) {
                  console.error("Failed to load destination stations", e);
              }
          }

          set({
            stations,
            genericError:
              stations.length === 0 ? "Aucune station n'a ete retournee par l'API officielle dans cette zone." : null,
          });

          // Background enrichment
          const candidates = stations
            .filter((station) => station.brandSource === "not_provided")
            .sort((left, right) => haversineDistance(position, left) - haversineDistance(position, right))
            .slice(0, 5);

          for (const candidate of candidates) {
            const enrichedStation = await stationService.enrichStationBrand(candidate);
            if (enrichedStation.brandSource !== candidate.brandSource) {
              set((state) => ({
                stations: state.stations.map((station) => (station.id === enrichedStation.id ? enrichedStation : station)),
              }));
            }
          }
        } catch (error) {
          // API unavailable — use local fallback silently (no blocking error shown to user)
          const fallbackStations = stationService.getMockStations();
          console.info("[FuelFlash] API indisponible, utilisation du dataset local de secours.", error);
          set({
            stations: fallbackStations,
            genericError: fallbackStations.length === 0
              ? "Impossible de charger les stations. Veuillez réessayer."
              : null,
          });
        } finally {
          set({ isLoading: false });
        }
      },
      requestUserLocation: async () => {
        await get().initialize();
        set({ isGeolocating: true, geoError: null, genericError: null });

        const result = await getBrowserCurrentPosition();
        set({ isGeolocating: false });

        if (result.ok) {
          set({ locationDenied: false });
          applyLocationState(set, result.coordinates, "browser");
          await get().loadStationsForArea(result.coordinates);
          return;
        }

        set({
          geoError: get().userPosition
            ? `${result.error.message} La derniere position affichee a ete conservee.`
            : result.error.message,
          locationDenied: result.error.code === "denied",
        });
      },
      useDemoLocation: () => {
        const demoLocation = mockLocations[0];
        const coordinates = {
          lat: demoLocation.lat,
          lng: demoLocation.lng,
          label: `Position de demonstration • ${demoLocation.label}`,
        };

        set({ locationDenied: false });
        applyLocationState(set, coordinates, "demo", { manualLocationId: demoLocation.id });
        void get().loadStationsForArea(coordinates);
      },
      selectManualLocation: (locationId) => {
        const location = mockLocations.find((entry) => entry.id === locationId);
        if (!location) {
          set({ geoError: "La position choisie est indisponible." });
          return;
        }

        const coordinates = {
          lat: location.lat,
          lng: location.lng,
          label: `${location.label} • ${location.city}`,
        };

        set({ locationDenied: false });
        applyLocationState(set, coordinates, "manual", { manualLocationId: location.id });
        void get().loadStationsForArea(coordinates);
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
        const { locationSource, manualLocationId, userPosition } = get();
        if (locationSource === "browser") {
          await get().requestUserLocation();
          return;
        }

        if (locationSource === "manual" && manualLocationId) {
          get().selectManualLocation(manualLocationId);
          return;
        }

        if (locationSource === "demo") {
          get().useDemoLocation();
          return;
        }

        if (locationSource === "search" && userPosition) {
          await get().loadStationsForArea(userPosition);
          return;
        }

        await get().requestUserLocation();
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
          routeDestination: `${result.label} • ${result.city}`,
          routeResults: [],
        });
        
        // When a route is set, we might want to load stations at the destination too
        if (coordinates) {
            await get().loadStationsForArea(coordinates);
        }
      },
      setConsumptionLitersPer100Km: (value) => set({ consumptionLitersPer100Km: value }),
      setFillVolumeLiters: (value) => set({ fillVolumeLiters: value }),
      confirmStationPrice: (stationId) => {
        if (!get().confirmedStationIds.includes(stationId)) {
          set((state) => ({ confirmedStationIds: [...state.confirmedStationIds, stationId] }));
        }
      },
      clearRoute: () => set({ routePosition: null, routeDestination: "", routeResults: [] }),
    }),
    {
      name: "fuel-flash:preferences:v5",
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        selectedFuel: state.selectedFuel,
        radiusKm: state.radiusKm,
        openOnly: state.openOnly,
        selectedServices: state.selectedServices,
        themeName: state.themeName,
        manualLocationId: state.manualLocationId,
        sortMode: state.sortMode,
        favoriteIds: state.favoriteIds,
        userPosition: persistLocation(state.userPosition, state.locationSource, state.locationPlaceId),
        locationSource: state.locationSource,
        locationPlaceId: state.locationPlaceId,
        consumptionLitersPer100Km: state.consumptionLitersPer100Km,
        fillVolumeLiters: state.fillVolumeLiters,
      }),
      merge: (persistedState, currentState) => {
        const data = persistedState as { state?: PersistedState };
        if (!data?.state) {
          return currentState;
        }

        return {
          ...currentState,
          ...data.state,
          userPosition: data.state.userPosition
            ? {
                lat: data.state.userPosition.lat,
                lng: data.state.userPosition.lng,
                label: data.state.userPosition.label,
              }
            : null,
        };
      },
    },
  ),
);
