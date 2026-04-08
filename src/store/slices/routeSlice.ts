import type { StateCreator } from "zustand";
import { appConfig } from "@/config/app";
import { geocodingService } from "@/services/geocodingService";
import { routingService } from "@/services/routingService";
import type {
  FuelStationsState,
  RouteSlice,
  SearchActionOptions,
} from "@/store/fuelStationsStore.types";
import {
  coordinatesMatch,
  isAbortedRequestError,
} from "@/store/fuelStationsStore.utils";

const MIN_GEOCODING_QUERY_LENGTH = 2;

let routeSearchDebounceId: ReturnType<typeof setTimeout> | null = null;
let routeSearchController: AbortController | null = null;
let activeRoutePathRequestId = 0;

const clearRouteSearchWork = () => {
  if (routeSearchDebounceId != null) {
    clearTimeout(routeSearchDebounceId);
    routeSearchDebounceId = null;
  }

  routeSearchController?.abort();
  routeSearchController = null;
};

const executeRouteSearch = async (
  query: string,
  set: Parameters<StateCreator<FuelStationsState>>[0],
  options?: SearchActionOptions,
) => {
  routeSearchController?.abort();

  const requestController = new AbortController();
  routeSearchController = requestController;

  if (options?.signal?.aborted) {
    requestController.abort(options.signal.reason);
  } else {
    options?.signal?.addEventListener("abort", () => requestController.abort(options.signal?.reason), {
      once: true,
    });
  }

  set({ isSearchingRoute: true, geocodingError: null });

  try {
    const routeResults = await geocodingService.search(query, {
      signal: requestController.signal,
      forceRefresh: options?.forceRefresh,
    });

    if (requestController.signal.aborted) {
      return;
    }

    set({
      routeResults,
      geocodingError:
        routeResults.length === 0
          ? "Aucun resultat de geocodage n'a ete trouve pour cette recherche."
          : null,
    });
  } catch (error) {
    if (requestController.signal.aborted || isAbortedRequestError(error)) {
      return;
    }

    set({
      routeResults: [],
      geocodingError: error instanceof Error ? error.message : "Le geocodage est indisponible pour le moment.",
    });
  } finally {
    if (routeSearchController === requestController) {
      routeSearchController = null;
      set({ isSearchingRoute: false });
    }
  }
};

export const createRouteSlice: StateCreator<
  FuelStationsState,
  [],
  [],
  RouteSlice
> = (set, get) => ({
  routeDestination: "",
  isSearchingRoute: false,
  routePosition: null,
  routePath: null,
  isLoadingRoute: false,
  routeError: null,
  routeResults: [],
  ensureRoutePath: async (origin, destination, options) => {
    const requestId = ++activeRoutePathRequestId;

    if (!destination || coordinatesMatch(origin, destination)) {
      if (requestId === activeRoutePathRequestId) {
        set({ routePath: null, isLoadingRoute: false, routeError: null });
      }
      return null;
    }

    const { routePath } = get();
    if (
      routePath &&
      !options?.forceRefresh &&
      coordinatesMatch(routePath.origin, origin) &&
      coordinatesMatch(routePath.destination, destination)
    ) {
      return routePath;
    }

    set({ isLoadingRoute: true, routeError: null });

    try {
      const nextRoutePath = await routingService.getRoute(origin, destination, options);

      if (requestId !== activeRoutePathRequestId || options?.signal?.aborted) {
        return nextRoutePath;
      }

      set({ routePath: nextRoutePath, routeError: null });
      return nextRoutePath;
    } catch (error) {
      if (options?.signal?.aborted || isAbortedRequestError(error) || requestId !== activeRoutePathRequestId) {
        return null;
      }

      set({
        routePath: null,
        routeError:
          error instanceof Error
            ? `${error.message} Comparaison simplifiee depart/destination activee.`
            : "Le trajet n'a pas pu etre calcule.",
      });
      return null;
    } finally {
      if (requestId === activeRoutePathRequestId) {
        set({ isLoadingRoute: false });
      }
    }
  },
  searchRoute: async (query, options) => {
    const trimmedQuery = query.trim();
    set({
      routeDestination: query,
      geocodingError: null,
      routeError: null,
    });

    clearRouteSearchWork();

    if (!trimmedQuery || trimmedQuery.length < MIN_GEOCODING_QUERY_LENGTH) {
      set({
        routeResults: [],
        isSearchingRoute: false,
      });
      return;
    }

    if (options?.immediate || appConfig.geocoding.searchDebounceMs <= 0) {
      await executeRouteSearch(trimmedQuery, set, options);
      return;
    }

    routeSearchDebounceId = setTimeout(() => {
      void executeRouteSearch(trimmedQuery, set, options);
      routeSearchDebounceId = null;
    }, appConfig.geocoding.searchDebounceMs);
  },
  selectRouteLocation: async (result) => {
    clearRouteSearchWork();
    const coordinates = { lat: result.lat, lng: result.lng, label: result.label };
    set({
      routePosition: coordinates,
      routePath: null,
      routeError: null,
      routeDestination: `${result.label} - ${result.city}`,
      routeResults: [],
      geocodingError: null,
    });

    await get().loadStationsForArea(get().userPosition ?? coordinates);
  },
  clearRoute: () => {
    clearRouteSearchWork();
    set({
      routePosition: null,
      routePath: null,
      isLoadingRoute: false,
      routeError: null,
      routeDestination: "",
      routeResults: [],
    });

    const { userPosition } = get();
    if (userPosition) {
      get().scheduleStationsReload({ immediate: true });
    }
  },
});
