import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { useGeolocation } from "@/composables/useGeolocation";
import { mockLocations } from "@/data/mockLocations";
import { ApiServiceError } from "@/services/apiClient";
import { geocodingService } from "@/services/geocodingService";
import { stationService } from "@/services/stationService";
import { haversineDistance } from "@/utils/geo";
import { loadStorage, saveStorage } from "@/utils/storage";
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

interface PersistedPreferences {
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  themeName: ThemeName;
  manualLocationId: string | null;
  sortMode: SortMode;
  favoriteIds: string[];
  lastLocation: PersistedLocation | null;
}

const STORAGE_KEY = "fuel-flash:preferences:v4";
const STATION_RELOAD_DEBOUNCE_MS = 250;
const GEOCODING_SEARCH_DEBOUNCE_MS = 300;

const defaultPreferences: PersistedPreferences = {
  selectedFuel: "Diesel",
  radiusKm: 10,
  openOnly: false,
  selectedServices: [],
  themeName: "fuelLight",
  manualLocationId: null,
  sortMode: "price",
  favoriteIds: [],
  lastLocation: null,
};

const toCoordinates = (location: PersistedLocation | null): Coordinates | null =>
  location
    ? {
        lat: location.lat,
        lng: location.lng,
        label: location.label,
      }
    : null;

const isAbortError = (error: unknown) => error instanceof ApiServiceError && error.code === "aborted";

export const useFuelStationsStore = defineStore("fuel-stations", () => {
  const persistedPreferences = loadStorage<PersistedPreferences>(STORAGE_KEY, defaultPreferences);
  const persistedLocation = persistedPreferences.lastLocation;

  const stations = ref<FuelStation[]>([]);
  const isLoading = ref(false);
  const isGeolocating = ref(false);
  const isSearchingLocation = ref(false);
  const geoError = ref<string | null>(null);
  const geocodingError = ref<string | null>(null);
  const genericError = ref<string | null>(null);
  const locationDenied = ref(false);
  const selectedFuel = ref<FuelType>(persistedPreferences.selectedFuel);
  const radiusKm = ref<number>(persistedPreferences.radiusKm);
  const openOnly = ref<boolean>(persistedPreferences.openOnly);
  const selectedServices = ref<ServiceType[]>(persistedPreferences.selectedServices);
  const themeName = ref<ThemeName>(persistedPreferences.themeName);
  const manualLocationId = ref<string | null>(persistedPreferences.manualLocationId);
  const sortMode = ref<SortMode>(persistedPreferences.sortMode);
  const favoriteIds = ref<string[]>(persistedPreferences.favoriteIds);
  const locationSource = ref<LocationSource>(persistedLocation?.source ?? null);
  const userPosition = ref<Coordinates | null>(toCoordinates(persistedLocation));
  const locationPlaceId = ref<string | null>(persistedLocation?.placeId ?? null);
  const searchQuery = ref("");
  const geocodingResults = ref<GeocodingResult[]>([]);

  let activeLoadAbortController: AbortController | null = null;
  let activeLoadRequestId = 0;
  let stationReloadTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let activeSearchAbortController: AbortController | null = null;
  let activeSearchRequestId = 0;
  let geocodingSearchTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const locationLabel = computed(() => userPosition.value?.label ?? null);

  const nearbyStations = computed(() => {
    if (!userPosition.value) {
      return [];
    }

    return stationService.findNearbyStations({
      stations: stations.value,
      position: userPosition.value,
      radiusKm: radiusKm.value,
      openOnly: openOnly.value,
      services: selectedServices.value,
      fuel: selectedFuel.value,
      sortMode: sortMode.value,
      favoriteIds: favoriteIds.value,
    });
  });

  const comparableStations = computed(() => stationService.getComparableStations(nearbyStations.value));
  const bestStation = computed(() =>
    stationService.getRecommendedBestStation(nearbyStations.value, radiusKm.value),
  );
  const stats = computed(() => stationService.getStats(nearbyStations.value));
  const availableServices = computed(() => stationService.getAvailableServices(stations.value));
  const favoriteStations = computed(() => nearbyStations.value.filter((station) => station.isFavorite));
  const hasResults = computed(() => nearbyStations.value.length > 0);
  const hasComparableResults = computed(() => comparableStations.value.length > 0);
  const isDataUnavailable = computed(() => !isLoading.value && stations.value.length === 0);

  const persistPreferences = () => {
    const nextLocation =
      userPosition.value && locationSource.value
        ? {
            ...userPosition.value,
            source: locationSource.value,
            placeId: locationPlaceId.value,
            savedAt: new Date().toISOString(),
          }
        : null;

    saveStorage(STORAGE_KEY, {
      selectedFuel: selectedFuel.value,
      radiusKm: radiusKm.value,
      openOnly: openOnly.value,
      selectedServices: selectedServices.value,
      themeName: themeName.value,
      manualLocationId: manualLocationId.value,
      sortMode: sortMode.value,
      favoriteIds: favoriteIds.value,
      lastLocation: nextLocation,
    });
  };

  watch(
    [
      selectedFuel,
      radiusKm,
      openOnly,
      selectedServices,
      themeName,
      manualLocationId,
      sortMode,
      favoriteIds,
      userPosition,
      locationSource,
      locationPlaceId,
    ],
    persistPreferences,
    { deep: true },
  );

  watch(radiusKm, () => {
    if (!userPosition.value) {
      return;
    }

    if (stationReloadTimeoutId != null) {
      globalThis.clearTimeout(stationReloadTimeoutId);
    }

    const position = userPosition.value;
    stationReloadTimeoutId = globalThis.setTimeout(() => {
      stationReloadTimeoutId = null;
      void loadStationsForArea(position);
    }, STATION_RELOAD_DEBOUNCE_MS);
  });

  const applyLocation = (
    location: Coordinates,
    source: Exclude<LocationSource, null>,
    options?: { placeId?: string | null; manualLocationId?: string | null },
  ) => {
    userPosition.value = location;
    locationSource.value = source;
    locationPlaceId.value = options?.placeId ?? null;
    manualLocationId.value = options?.manualLocationId ?? null;
    geoError.value = null;
    geocodingError.value = null;
    genericError.value = null;
  };

  const enrichNearestBrands = async (position: Coordinates) => {
    const candidates = stations.value
      .filter((station) => station.brandSource === "not_provided")
      .sort((left, right) => {
        const leftDistance = haversineDistance(position, left);
        const rightDistance = haversineDistance(position, right);
        return leftDistance - rightDistance;
      })
      .slice(0, 5);

    for (const candidate of candidates) {
      const enrichedStation = await stationService.enrichStationBrand(candidate);

      if (enrichedStation.id === candidate.id && enrichedStation.brandSource !== candidate.brandSource) {
        const stationIndex = stations.value.findIndex((station) => station.id === candidate.id);

        if (stationIndex >= 0) {
          stations.value.splice(stationIndex, 1, enrichedStation);
        }
      }
    }
  };

  const initialize = async () => {
    if (stations.value.length === 0) {
      stations.value = stationService.getMockStations();
    }

    if (userPosition.value) {
      await loadStationsForArea(userPosition.value);
    }
  };

  const loadStationsForArea = async (position: Coordinates) => {
    const requestId = ++activeLoadRequestId;
    activeLoadAbortController?.abort();
    activeLoadAbortController = new AbortController();
    isLoading.value = true;
    genericError.value = null;

    try {
      const nextStations = await stationService.getStationsAround(position, radiusKm.value, {
        signal: activeLoadAbortController.signal,
      });

      if (requestId !== activeLoadRequestId) {
        return;
      }

      stations.value = nextStations;

      if (stations.value.length === 0) {
        genericError.value = "Aucune station n'a \u00e9t\u00e9 retourn\u00e9e par l'API officielle dans cette zone.";
      } else {
        void enrichNearestBrands(position);
      }
    } catch (error) {
      if (isAbortError(error) || requestId !== activeLoadRequestId) {
        return;
      }

      stations.value = stationService.getMockStations();
      genericError.value =
        error instanceof Error
          ? `${error.message} Affichage du dataset local de secours.`
          : "L'API officielle des carburants est indisponible. Affichage du dataset local de secours.";
    } finally {
      if (requestId === activeLoadRequestId) {
        isLoading.value = false;
        activeLoadAbortController = null;
      }
    }
  };

  const requestUserLocation = async () => {
    await initialize();
    isGeolocating.value = true;
    geoError.value = null;
    genericError.value = null;

    const { getCurrentPosition } = useGeolocation();
    const result = await getCurrentPosition();

    isGeolocating.value = false;

    if (result.ok) {
      locationDenied.value = false;
      applyLocation(result.coordinates, "browser");
      await loadStationsForArea(result.coordinates);
      return;
    }

    geoError.value = userPosition.value
      ? `${result.error.message} La derni\u00e8re position affich\u00e9e a \u00e9t\u00e9 conserv\u00e9e.`
      : result.error.message;
    locationDenied.value = result.error.code === "denied";
  };

  const useDemoLocation = () => {
    const demoLocation = mockLocations[0];
    const coordinates = {
      lat: demoLocation.lat,
      lng: demoLocation.lng,
      label: `Position de d\u00e9monstration - ${demoLocation.label}`,
    };

    locationDenied.value = false;
    applyLocation(coordinates, "demo", {
      manualLocationId: demoLocation.id,
    });
    void loadStationsForArea(coordinates);
  };

  const selectManualLocation = (locationId: string) => {
    const location = mockLocations.find((entry) => entry.id === locationId);

    if (!location) {
      geoError.value = "La position choisie est indisponible.";
      return;
    }

    const coordinates = {
      lat: location.lat,
      lng: location.lng,
      label: `${location.label} - ${location.city}`,
    };

    locationDenied.value = false;
    applyLocation(coordinates, "manual", {
      manualLocationId: location.id,
    });
    void loadStationsForArea(coordinates);
  };

  const executeSearchLocations = async (query: string, requestId: number, abortController: AbortController) => {
    try {
      const results = await geocodingService.search(query, {
        signal: abortController.signal,
      });

      if (requestId !== activeSearchRequestId) {
        return;
      }

      geocodingResults.value = results;

      if (results.length === 0) {
        geocodingError.value = "Aucun r\u00e9sultat de g\u00e9ocodage n'a \u00e9t\u00e9 trouv\u00e9 pour cette recherche.";
      }
    } catch (error) {
      if (isAbortError(error) || requestId !== activeSearchRequestId) {
        return;
      }

      geocodingResults.value = [];
      geocodingError.value =
        error instanceof Error ? error.message : "Le g\u00e9ocodage est indisponible pour le moment.";
    } finally {
      if (requestId === activeSearchRequestId) {
        isSearchingLocation.value = false;
        activeSearchAbortController = null;
      }
    }
  };

  const searchLocations = (query: string) => {
    searchQuery.value = query;
    geocodingError.value = null;

    if (geocodingSearchTimeoutId != null) {
      globalThis.clearTimeout(geocodingSearchTimeoutId);
      geocodingSearchTimeoutId = null;
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      activeSearchRequestId += 1;
      activeSearchAbortController?.abort();
      activeSearchAbortController = null;
      geocodingResults.value = [];
      isSearchingLocation.value = false;
      return;
    }

    isSearchingLocation.value = true;
    const requestId = ++activeSearchRequestId;

    geocodingSearchTimeoutId = globalThis.setTimeout(() => {
      geocodingSearchTimeoutId = null;
      activeSearchAbortController?.abort();
      const abortController = new AbortController();
      activeSearchAbortController = abortController;
      void executeSearchLocations(trimmedQuery, requestId, abortController);
    }, GEOCODING_SEARCH_DEBOUNCE_MS);
  };

  const selectSearchLocation = (result: GeocodingResult) => {
    const coordinates = stationService.createSearchLocation(result);

    locationDenied.value = false;
    applyLocation(coordinates, "search", {
      placeId: result.id,
    });
    void loadStationsForArea(coordinates);
  };

  const refreshPosition = async () => {
    if (locationSource.value === "browser") {
      await requestUserLocation();
      return;
    }

    if (locationSource.value === "manual" && manualLocationId.value) {
      selectManualLocation(manualLocationId.value);
      return;
    }

    if (locationSource.value === "demo") {
      useDemoLocation();
      return;
    }

    if (locationSource.value === "search" && userPosition.value) {
      void loadStationsForArea(userPosition.value);
      return;
    }

    await requestUserLocation();
  };

  const loadStationById = async (id: string) => {
    const existingStation = stations.value.find((station) => station.id === id) ?? null;

    try {
      const station = existingStation ?? (await stationService.getStationById(id));

      if (!station) {
        return null;
      }

      const enrichedHistoryStation = await stationService.enrichStationHistory(station);
      const enrichedStation = await stationService.enrichStationBrand(enrichedHistoryStation);
      const stationIndex = stations.value.findIndex((item) => item.id === id);

      if (stationIndex >= 0) {
        stations.value.splice(stationIndex, 1, enrichedStation);
      } else {
        stations.value.push(enrichedStation);
      }

      return enrichedStation;
    } catch {
      return stationService.getMockStations().find((station) => station.id === id) ?? null;
    }
  };

  const toggleFavorite = (stationId: string) => {
    favoriteIds.value = favoriteIds.value.includes(stationId)
      ? favoriteIds.value.filter((id) => id !== stationId)
      : [...favoriteIds.value, stationId];
  };

  const setTheme = (value: ThemeName) => {
    themeName.value = value;
  };

  return {
    stations,
    userPosition,
    locationLabel,
    locationSource,
    locationPlaceId,
    isLoading,
    isGeolocating,
    isSearchingLocation,
    geoError,
    geocodingError,
    genericError,
    locationDenied,
    selectedFuel,
    radiusKm,
    openOnly,
    selectedServices,
    sortMode,
    themeName,
    manualLocationId,
    favoriteIds,
    searchQuery,
    geocodingResults,
    availableServices,
    nearbyStations,
    comparableStations,
    bestStation,
    favoriteStations,
    stats,
    hasResults,
    hasComparableResults,
    isDataUnavailable,
    initialize,
    loadStationsForArea,
    loadStationById,
    requestUserLocation,
    useDemoLocation,
    selectManualLocation,
    searchLocations,
    selectSearchLocation,
    refreshPosition,
    toggleFavorite,
    setTheme,
  };
});
