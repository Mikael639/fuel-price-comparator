import type { StateCreator } from "zustand";
import { appConfig } from "@/config/app";
import type { FuelStationsState, PreferencesSlice } from "@/store/fuelStationsStore.types";
import { normalizeFillVolumeLiters } from "@/store/fuelStationsStore.utils";

export const createPreferencesSlice: StateCreator<
  FuelStationsState,
  [],
  [],
  PreferencesSlice
> = (set, get) => ({
  hasHydrated: false,
  selectedFuel: "Diesel",
  radiusKm: appConfig.stations.defaultRadiusKm,
  openOnly: false,
  selectedServices: [],
  sortMode: "price",
  themeName: "fuelLight",
  favoriteIds: [],
  consumptionLitersPer100Km: appConfig.stations.defaultConsumptionLitersPer100Km,
  fillVolumeLiters: normalizeFillVolumeLiters(appConfig.stations.defaultTankVolumeLiters),
  favoriteAlertPrice: appConfig.stations.defaultFavoriteAlertPrice,
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
    get().scheduleStationsReload();
  },
  setOpenOnly: (value) => set({ openOnly: value }),
  setSelectedServices: (value) => set({ selectedServices: value }),
  setSortMode: (value) => set({ sortMode: value }),
  setConsumptionLitersPer100Km: (value) => set({ consumptionLitersPer100Km: value }),
  setFillVolumeLiters: (value) => set({ fillVolumeLiters: normalizeFillVolumeLiters(value) }),
  setFavoriteAlertPrice: (value) => set({ favoriteAlertPrice: value }),
  setHasHydrated: (value) => set({ hasHydrated: value }),
});
