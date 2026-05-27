import type { StateCreator } from "zustand";
import { appConfig } from "@/config/app";
import { getBrowserCurrentPosition } from "@/hooks/useGeolocation";
import { geocodingService } from "@/services/geocodingService";
import { stationService } from "@/services/stationService";
import type {
  FuelStationsState,
  LocationSlice,
  SearchActionOptions,
} from "@/store/fuelStationsStore.types";
import {
  applyLocationState,
  isAbortedRequestError,
} from "@/store/fuelStationsStore.utils";

const MIN_GEOCODING_QUERY_LENGTH = 2;

let locationSearchDebounceId: ReturnType<typeof setTimeout> | null = null;
let locationSearchController: AbortController | null = null;

const clearLocationSearchWork = () => {
  if (locationSearchDebounceId != null) {
    clearTimeout(locationSearchDebounceId);
    locationSearchDebounceId = null;
  }

  locationSearchController?.abort();
  locationSearchController = null;
};

const executeLocationSearch = async (
  query: string,
  set: Parameters<StateCreator<FuelStationsState>>[0],
  options?: SearchActionOptions,
) => {
  locationSearchController?.abort();

  const requestController = new AbortController();
  locationSearchController = requestController;

  if (options?.signal?.aborted) {
    requestController.abort(options.signal.reason);
  } else {
    options?.signal?.addEventListener("abort", () => requestController.abort(options.signal?.reason), {
      once: true,
    });
  }

  set({ isSearchingLocation: true, geocodingError: null });

  try {
    const geocodingResults = await geocodingService.search(query, {
      signal: requestController.signal,
      forceRefresh: options?.forceRefresh,
    });

    if (requestController.signal.aborted) {
      return;
    }

    set({
      geocodingResults,
      geocodingError:
        geocodingResults.length === 0
          ? "Aucun resultat de geocodage n'a ete trouve pour cette recherche."
          : null,
    });
  } catch (error) {
    if (requestController.signal.aborted || isAbortedRequestError(error)) {
      return;
    }

    set({
      geocodingResults: [],
      geocodingError: error instanceof Error ? error.message : "Le geocodage est indisponible pour le moment.",
    });
  } finally {
    if (locationSearchController === requestController) {
      locationSearchController = null;
      set({ isSearchingLocation: false });
    }
  }
};

export const createLocationSlice: StateCreator<
  FuelStationsState,
  [],
  [],
  LocationSlice
> = (set, get) => ({
  userPosition: null,
  locationSource: null,
  locationPlaceId: null,
  isGeolocating: false,
  isSearchingLocation: false,
  geoError: null,
  geocodingError: null,
  locationDenied: false,
  searchQuery: "",
  geocodingResults: [],
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
  searchLocations: async (query, options) => {
    const trimmedQuery = query.trim();
    set({
      searchQuery: query,
      geocodingError: null,
    });

    clearLocationSearchWork();

    if (!trimmedQuery || trimmedQuery.length < MIN_GEOCODING_QUERY_LENGTH) {
      set({
        geocodingResults: [],
        isSearchingLocation: false,
      });
      return;
    }

    if (options?.immediate || appConfig.geocoding.searchDebounceMs <= 0) {
      await executeLocationSearch(trimmedQuery, set, options);
      return;
    }

    locationSearchDebounceId = setTimeout(() => {
      void executeLocationSearch(trimmedQuery, set, options);
      locationSearchDebounceId = null;
    }, appConfig.geocoding.searchDebounceMs);
  },
  selectSearchLocation: (result) => {
    clearLocationSearchWork();
    const coordinates = stationService.createSearchLocation(result);
    set({
      searchQuery: `${result.label} - ${result.city}`,
      geocodingResults: [],
      geocodingError: null,
      locationDenied: false,
    });
    get().addRecentSearch(result);
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
});
