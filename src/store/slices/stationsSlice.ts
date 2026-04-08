import type { StateCreator } from "zustand";
import { appConfig } from "@/config/app";
import { routingService } from "@/services/routingService";
import { stationService } from "@/services/stationService";
import type {
  FuelStationsState,
  StationsSlice,
} from "@/store/fuelStationsStore.types";
import {
  coordinatesMatch,
  isAbortedRequestError,
} from "@/store/fuelStationsStore.utils";
import type { FuelStation, SortMode, StationWithMetrics } from "@/types/station";

const ROUTE_DETOUR_CANDIDATE_LIMIT = 6;

let stationsReloadDebounceId: ReturnType<typeof setTimeout> | null = null;
let stationsLoadController: AbortController | null = null;
let routeDetourController: AbortController | null = null;
let activeStationsLoadRequestId = 0;

const clearStationsReloadDebounce = () => {
  if (stationsReloadDebounceId != null) {
    clearTimeout(stationsReloadDebounceId);
    stationsReloadDebounceId = null;
  }
};

const attachExternalAbortSignal = (
  requestController: AbortController,
  signal?: AbortSignal,
) => {
  if (!signal) {
    return;
  }

  if (signal.aborted) {
    requestController.abort(signal.reason);
    return;
  }

  signal.addEventListener("abort", () => requestController.abort(signal.reason), { once: true });
};

const mergeStationById = (stations: FuelStation[], updatedStation: FuelStation) =>
  stations.map((station) => (station.id === updatedStation.id ? { ...station, ...updatedStation } : station));

const buildRouteDetourCandidates = (
  get: () => FuelStationsState,
  stations: FuelStation[],
  position: NonNullable<FuelStationsState["userPosition"]>,
) => {
  const state = get();
  const sortModes: SortMode[] = ["smartFill", "price", "distance"];
  const uniqueCandidates = new Map<string, StationWithMetrics>();

  sortModes.forEach((sortMode) => {
    stationService
      .findNearbyStations({
        stations,
        position,
        radiusKm: state.radiusKm,
        openOnly: state.openOnly,
        services: state.selectedServices,
        fuel: state.selectedFuel,
        sortMode,
        favoriteIds: state.favoriteIds,
        fillVolumeLiters: state.fillVolumeLiters,
        consumptionLitersPer100Km: state.consumptionLitersPer100Km,
        routePath: state.routePath,
        routePosition: state.routePosition,
      })
      .slice(0, 3)
      .forEach((station) => {
        if (!uniqueCandidates.has(station.id)) {
          uniqueCandidates.set(station.id, station);
        }
      });
  });

  return [...uniqueCandidates.values()].slice(0, ROUTE_DETOUR_CANDIDATE_LIMIT);
};

const hydrateStationBrands = async (
  stations: FuelStation[],
  position: NonNullable<FuelStationsState["userPosition"]>,
  set: Parameters<StateCreator<FuelStationsState>>[0],
  requestId: number,
) => {
  const candidates = stations
    .filter((station) => station.brandSource === "not_provided")
    .sort((left, right) => stationService.getStationDistance(position, left) - stationService.getStationDistance(position, right))
    .slice(0, 5);

  for (const candidate of candidates) {
    if (requestId !== activeStationsLoadRequestId) {
      return;
    }

    const enrichedStation = await stationService.enrichStationBrand(candidate);

    if (requestId !== activeStationsLoadRequestId || enrichedStation.brandSource === candidate.brandSource) {
      continue;
    }

    set((state) => ({
      stations: mergeStationById(state.stations, enrichedStation),
    }));
  }
};

const hydrateRouteDetours = async (
  stations: FuelStation[],
  origin: NonNullable<FuelStationsState["userPosition"]>,
  set: Parameters<StateCreator<FuelStationsState>>[0],
  get: () => FuelStationsState,
  requestId: number,
) => {
  const { routePath } = get();

  if (!routePath) {
    if (requestId === activeStationsLoadRequestId) {
      set({ isHydratingRouteDetours: false });
    }
    return;
  }

  routeDetourController?.abort();
  const requestController = new AbortController();
  routeDetourController = requestController;

  const candidates = buildRouteDetourCandidates(get, stations, origin);

  if (candidates.length === 0) {
    if (requestId === activeStationsLoadRequestId) {
      set({ isHydratingRouteDetours: false });
    }
    return;
  }

  set({ isHydratingRouteDetours: true });

  try {
    const detourUpdates = new Map<
      string,
      Pick<FuelStation, "routeDetourKm" | "routeDetourMinutes">
    >();

    for (const candidate of candidates) {
      if (requestController.signal.aborted || requestId !== activeStationsLoadRequestId) {
        return;
      }

      try {
        const detour = await routingService.analyzeDetour(
          origin,
          { lat: candidate.lat, lng: candidate.lng, label: candidate.name },
          routePath.destination,
          {
            signal: requestController.signal,
            directRoute: routePath,
          },
        );

        detourUpdates.set(candidate.id, {
          routeDetourKm: detour.detourDistanceKm,
          routeDetourMinutes: detour.detourDurationMinutes,
        });
      } catch (error) {
        if (requestController.signal.aborted || isAbortedRequestError(error)) {
          return;
        }

        console.info(
          `[FuelFlash] Détour précis indisponible pour ${candidate.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    if (requestController.signal.aborted || requestId !== activeStationsLoadRequestId || detourUpdates.size === 0) {
      return;
    }

    set((state) => ({
      stations: state.stations.map((station) =>
        detourUpdates.has(station.id)
          ? { ...station, ...detourUpdates.get(station.id)! }
          : station,
      ),
    }));
  } finally {
    if (routeDetourController === requestController) {
      routeDetourController = null;
    }

    if (requestId === activeStationsLoadRequestId) {
      set({ isHydratingRouteDetours: false });
    }
  }
};

export const createStationsSlice: StateCreator<
  FuelStationsState,
  [],
  [],
  StationsSlice
> = (set, get) => ({
  stations: [],
  isLoading: false,
  isHydratingHistory: false,
  isHydratingRouteDetours: false,
  genericError: null,
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
  scheduleStationsReload: (options) => {
    const { userPosition } = get();

    clearStationsReloadDebounce();

    if (!userPosition) {
      return;
    }

    if (options?.immediate || appConfig.stations.reloadDebounceMs <= 0) {
      void get().loadStationsForArea(userPosition, options);
      return;
    }

    stationsReloadDebounceId = setTimeout(() => {
      void get().loadStationsForArea(userPosition, options);
      stationsReloadDebounceId = null;
    }, appConfig.stations.reloadDebounceMs);
  },
  loadStationsForArea: async (position, options) => {
    clearStationsReloadDebounce();

    stationsLoadController?.abort();
    routeDetourController?.abort();

    const requestController = new AbortController();
    stationsLoadController = requestController;
    attachExternalAbortSignal(requestController, options?.signal);

    const requestId = ++activeStationsLoadRequestId;

    set({
      isLoading: true,
      isHydratingHistory: false,
      isHydratingRouteDetours: false,
      genericError: null,
    });

    try {
      const { routePosition } = get();
      const routePath =
        routePosition && !coordinatesMatch(routePosition, position)
          ? await get().ensureRoutePath(position, routePosition, {
              ...options,
              signal: requestController.signal,
            })
          : null;

      if (requestController.signal.aborted || requestId !== activeStationsLoadRequestId) {
        return;
      }

      let stations = routePath
        ? await stationService.getStationsAlongRoute(routePath, get().radiusKm, {
            ...options,
            signal: requestController.signal,
          })
        : await stationService.getStationsAround(position, get().radiusKm, {
            ...options,
            signal: requestController.signal,
          });

      if (requestController.signal.aborted || requestId !== activeStationsLoadRequestId) {
        return;
      }

      if (routePosition && !routePath && !coordinatesMatch(routePosition, position)) {
        try {
          const destinationStations = await stationService.getStationsAround(routePosition, get().radiusKm, {
            ...options,
            signal: requestController.signal,
          });
          const existingIds = new Set(stations.map((station) => station.id));
          const newStations = destinationStations.filter((station) => !existingIds.has(station.id));
          stations = [...stations, ...newStations];
        } catch (error) {
          if (!requestController.signal.aborted && !isAbortedRequestError(error)) {
            console.error("Failed to load destination stations", error);
          }
        }
      }

      if (requestController.signal.aborted || requestId !== activeStationsLoadRequestId) {
        return;
      }

      set({
        stations,
        genericError:
          stations.length === 0
            ? "Aucune station n'a ete retournee par l'API officielle dans cette zone."
            : null,
      });

      void hydrateStationBrands(stations, position, set, requestId);

      let finalStations = stations;

      if (stations.length > 0) {
        set({ isHydratingHistory: true });

        try {
          finalStations = await stationService.enrichStationsHistory(stations, {
            ...options,
            signal: requestController.signal,
          });

          if (requestController.signal.aborted || requestId !== activeStationsLoadRequestId) {
            return;
          }

          set({ stations: finalStations });
        } finally {
          if (requestId === activeStationsLoadRequestId) {
            set({ isHydratingHistory: false });
          }
        }
      }

      if (routePath && requestId === activeStationsLoadRequestId && !requestController.signal.aborted) {
        void hydrateRouteDetours(finalStations, position, set, get, requestId);
      }
    } catch (error) {
      if (requestController.signal.aborted || isAbortedRequestError(error)) {
        return;
      }

      const fallbackStations = stationService.getMockStations();
      console.info("[FuelFlash] API indisponible, utilisation du dataset local de secours.", error);
      set({
        stations: fallbackStations,
        isHydratingHistory: false,
        isHydratingRouteDetours: false,
        genericError:
          fallbackStations.length === 0
            ? "Impossible de charger les stations. Veuillez reessayer."
            : null,
      });
    } finally {
      if (stationsLoadController === requestController) {
        stationsLoadController = null;
      }

      if (requestId === activeStationsLoadRequestId) {
        set({ isLoading: false });
      }
    }
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
          ? state.stations.map((item) =>
              item.id === id ? { ...item, ...enrichedStation } : item,
            )
          : [...state.stations, enrichedStation],
      }));

      return enrichedStation;
    } catch {
      return stationService.getMockStations().find((station) => station.id === id) ?? null;
    }
  },
  confirmStationPrice: (stationId) => {
    if (!get().confirmedStationIds.includes(stationId)) {
      set((state) => ({
        confirmedStationIds: [...state.confirmedStationIds, stationId],
      }));
    }
  },
});
