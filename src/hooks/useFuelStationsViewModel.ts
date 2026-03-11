import { useMemo } from "react";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";

export const useFuelStationsViewModel = () => {
  const stations = useFuelStationsStore((state) => state.stations);
  const userPosition = useFuelStationsStore((state) => state.userPosition);
  const selectedFuel = useFuelStationsStore((state) => state.selectedFuel);
  const radiusKm = useFuelStationsStore((state) => state.radiusKm);
  const openOnly = useFuelStationsStore((state) => state.openOnly);
  const selectedServices = useFuelStationsStore((state) => state.selectedServices);
  const sortMode = useFuelStationsStore((state) => state.sortMode);
  const favoriteIds = useFuelStationsStore((state) => state.favoriteIds);

  const nearbyStations = useMemo(() => {
    if (!userPosition) {
      return [];
    }

    return stationService.findNearbyStations({
      stations,
      position: userPosition,
      radiusKm,
      openOnly,
      services: selectedServices,
      fuel: selectedFuel,
      sortMode,
      favoriteIds,
    });
  }, [favoriteIds, openOnly, radiusKm, selectedFuel, selectedServices, sortMode, stations, userPosition]);

  const comparableStations = useMemo(() => stationService.getComparableStations(nearbyStations), [nearbyStations]);
  const bestStation = useMemo(
    () => stationService.getRecommendedBestStation(nearbyStations, radiusKm),
    [nearbyStations, radiusKm],
  );
  const stats = useMemo(() => stationService.getStats(nearbyStations), [nearbyStations]);
  const availableServices = useMemo(() => stationService.getAvailableServices(stations), [stations]);
  const favoriteStations = useMemo(() => nearbyStations.filter((station) => station.isFavorite), [nearbyStations]);

  return {
    nearbyStations,
    comparableStations,
    bestStation,
    stats,
    availableServices,
    favoriteStations,
    hasResults: nearbyStations.length > 0,
    hasComparableResults: comparableStations.length > 0,
    isDataUnavailable: stations.length === 0,
  };
};
