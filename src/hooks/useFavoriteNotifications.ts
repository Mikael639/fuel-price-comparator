import { useEffect, useRef } from "react";
import type { FuelType, StationWithMetrics } from "@/types/station";

export const useFavoriteNotifications = (
  favoriteStations: StationWithMetrics[],
  alertPrice: number | null,
  selectedFuel: FuelType,
) => {
  const notifiedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!alertPrice || favoriteStations.length === 0) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    const stationsBelow = favoriteStations.filter(
      (s) => s.selectedFuelPrice != null && s.selectedFuelPrice <= alertPrice,
    );

    if (stationsBelow.length === 0) return;

    const notify = () => {
      stationsBelow.forEach((station) => {
        if (notifiedIds.current.has(station.id)) return;
        notifiedIds.current.add(station.id);
        try {
          new Notification(`Prix bas — ${station.name}`, {
            body: `${selectedFuel} à ${station.selectedFuelPrice?.toFixed(3)} €/L · ${station.city}`,
            icon: "/favicon.svg",
            tag: `fuel-alert-${station.id}`,
          });
        } catch {
          // Notification API peut échouer en iframe ou contexte sandboxé
        }
      });
    };

    if (Notification.permission === "granted") {
      notify();
    } else {
      void Notification.requestPermission().then((permission) => {
        if (permission === "granted") notify();
      });
    }
  }, [favoriteStations, alertPrice, selectedFuel]);
};
