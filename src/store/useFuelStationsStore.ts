import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createLocationSlice,
} from "@/store/slices/locationSlice";
import {
  createPreferencesSlice,
} from "@/store/slices/preferencesSlice";
import {
  createRouteSlice,
} from "@/store/slices/routeSlice";
import {
  createStationsSlice,
} from "@/store/slices/stationsSlice";
import type {
  FuelStationsState,
  PersistedState,
} from "@/store/fuelStationsStore.types";
import { persistLocation } from "@/store/fuelStationsStore.utils";

type LegacyPersistedState = Omit<Partial<PersistedState>, "locationSource"> & {
  locationSource?: string | null;
};

const hasNestedPersistedState = (
  value: LegacyPersistedState | { state?: LegacyPersistedState } | undefined,
): value is { state: LegacyPersistedState } =>
  Boolean(value) && typeof value === "object" && "state" in value && value.state != null;

export const useFuelStationsStore = create<FuelStationsState>()(
  persist(
    (...args) => ({
      ...createPreferencesSlice(...args),
      ...createLocationSlice(...args),
      ...createRouteSlice(...args),
      ...createStationsSlice(...args),
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
        userPosition: persistLocation(
          state.userPosition,
          state.locationSource,
          state.locationPlaceId,
        ),
        locationSource: state.locationSource,
        locationPlaceId: state.locationPlaceId,
        consumptionLitersPer100Km: state.consumptionLitersPer100Km,
        fillVolumeLiters: state.fillVolumeLiters,
        favoriteAlertPrice: state.favoriteAlertPrice,
      }),
      merge: (persistedState, currentState) => {
        const persistedData = (
          persistedState as
            | {
                state?: LegacyPersistedState;
              }
            | LegacyPersistedState
            | undefined
        ) ?? undefined;
        const persistedValue =
          hasNestedPersistedState(persistedData)
            ? persistedData.state
            : (persistedData as LegacyPersistedState | undefined);

        if (!persistedValue) {
          return currentState;
        }

        const persistedLocationSource = persistedValue.locationSource;
        const hasLegacyDemoLocation =
          persistedLocationSource === "manual" ||
          persistedLocationSource === "demo";
        const restoredLocationSource =
          !hasLegacyDemoLocation &&
          (persistedLocationSource === "browser" ||
            persistedLocationSource === "search")
            ? persistedLocationSource
            : null;
        const restoredUserPosition =
          restoredLocationSource && persistedValue.userPosition
            ? {
                lat: persistedValue.userPosition.lat,
                lng: persistedValue.userPosition.lng,
                label: persistedValue.userPosition.label,
              }
            : null;

        return {
          ...currentState,
          selectedFuel: persistedValue.selectedFuel ?? currentState.selectedFuel,
          radiusKm: persistedValue.radiusKm ?? currentState.radiusKm,
          openOnly: persistedValue.openOnly ?? currentState.openOnly,
          selectedServices:
            persistedValue.selectedServices ?? currentState.selectedServices,
          themeName: persistedValue.themeName ?? currentState.themeName,
          sortMode: persistedValue.sortMode ?? currentState.sortMode,
          favoriteIds: persistedValue.favoriteIds ?? currentState.favoriteIds,
          userPosition: restoredUserPosition,
          locationSource: restoredLocationSource,
          locationPlaceId:
            restoredLocationSource === "search"
              ? persistedValue.locationPlaceId ?? null
              : null,
          consumptionLitersPer100Km:
            persistedValue.consumptionLitersPer100Km ??
            currentState.consumptionLitersPer100Km,
          fillVolumeLiters:
            persistedValue.fillVolumeLiters ?? currentState.fillVolumeLiters,
          favoriteAlertPrice:
            persistedValue.favoriteAlertPrice ?? currentState.favoriteAlertPrice,
        };
      },
    },
  ),
);
