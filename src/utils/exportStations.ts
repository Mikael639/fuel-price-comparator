import * as XLSX from "xlsx";
import type { FuelType, StationWithMetrics } from "@/types/station";
import { FUEL_TYPES } from "@/types/station";

export const exportStationsToXlsx = (stations: StationWithMetrics[], selectedFuel: FuelType) => {
  const rows = stations.map((station, index) => {
    const prices: Record<string, number | string> = {};
    FUEL_TYPES.forEach((fuel) => {
      prices[fuel] = station.fuelPrices[fuel] ?? "";
    });

    return {
      Rang: index + 1,
      Nom: station.name,
      Enseigne: station.brand,
      Adresse: station.address,
      Ville: station.city,
      Statut: station.isOpen ? "Ouvert" : "Fermé",
      [`Prix ${selectedFuel} (€/L)`]: station.selectedFuelPrice ?? "",
      ...prices,
      "Distance (km)": station.distanceKm.toFixed(2),
      "Temps estimé (min)": Math.round(station.estimatedDriveMinutes),
      "Économie par litre (€)": station.savingsPerLiter?.toFixed(4) ?? "",
      "Coût plein estimé (€)": station.estimatedFillCost?.toFixed(2) ?? "",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stations");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `fuelflash-${selectedFuel}-${date}.xlsx`);
};
