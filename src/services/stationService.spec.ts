import { describe, expect, it } from "vitest";
import {
  dedupeStations,
  mapRecordToStation,
  mergeStationHistory,
  normalizeOfficialText,
  sortStations,
  stationService,
} from "@/services/stationService";
import type { FuelStation, StationWithMetrics } from "@/types/station";

const baseStation: FuelStation = {
  id: "1",
  name: "Station Test",
  brand: "Test",
  brandSource: "mock",
  address: "12 Avenue de la République",
  city: "Juvisy-sur-Orge",
  lat: 48.6899,
  lng: 2.3734,
  isOpen: true,
  openingHours: "24h/24",
  fuels: ["Diesel", "SP95"],
  fuelPrices: {
    Diesel: 1.7,
    SP95: 1.8,
  },
  priceHistory: {
    Diesel: [
      { date: "2026-03-10T08:00:00.000Z", price: 1.72 },
      { date: "2026-03-11T08:00:00.000Z", price: 1.7 },
    ],
  },
  services: ["Toilettes"],
};

describe("stationService helpers", () => {
  it("humanizes official uppercase labels", () => {
    expect(normalizeOfficialText("12 AVENUE DE LA REPUBLIQUE")).toBe("12 Avenue de la Republique");
  });

  it("maps official records to stations", () => {
    const station = mapRecordToStation({
      id: 10,
      adresse: "12 AVENUE DE LA REPUBLIQUE",
      ville: "JUVISY-SUR-ORGE",
      cp: "91260",
      geom: {
        lat: 48.6899,
        lon: 2.3734,
      },
      services_service: ["Boutique alimentaire", "Toilettes publiques"],
      horaires_automate_24_24: "Oui",
      sp95_prix: 1.8,
      gazole_prix: 1.7,
    });

    expect(station?.city).toBe("Juvisy-sur-Orge");
    expect(station?.services).toContain("Supérette");
    expect(station?.fuelPrices.Diesel).toBe(1.7);
  });

  it("deduplicates near-identical stations", () => {
    const stations = dedupeStations([
      baseStation,
      {
        ...baseStation,
        id: "2",
        lat: 48.68991,
        lng: 2.37339,
        services: ["Toilettes", "Lavage"],
      },
    ]);

    expect(stations).toHaveLength(1);
    expect(stations[0]?.services).toContain("Lavage");
  });

  it("merges daily history into a station history", () => {
    const station = mergeStationHistory(baseStation, [
      {
        id: "1",
        prix_nom: "Gazole",
        prix_valeur: 1.74,
        prix_maj: "2026-03-09T08:00:00.000Z",
      },
    ]);

    expect(station.priceHistory.Diesel?.length).toBeGreaterThanOrEqual(3);
  });

  it("sorts stations by savings", () => {
    const stations: StationWithMetrics[] = [
      {
        ...baseStation,
        distanceKm: 4,
        selectedFuelPrice: 1.74,
        estimatedDriveMinutes: 9,
        savingsPerLiter: 0.03,
        isFavorite: false,
      },
      {
        ...baseStation,
        id: "3",
        distanceKm: 5,
        selectedFuelPrice: 1.7,
        estimatedDriveMinutes: 10,
        savingsPerLiter: 0.07,
        isFavorite: false,
      },
    ];

    expect(sortStations(stations, "savings")[0]?.id).toBe("3");
  });

  it("computes savings for a 50L fill", () => {
    const station: StationWithMetrics = {
      ...baseStation,
      distanceKm: 4,
      selectedFuelPrice: 1.7,
      estimatedDriveMinutes: 9,
      savingsPerLiter: 0.07,
      isFavorite: false,
    };

    expect(stationService.getStationFillSavings(station, 1.77)).toBeCloseTo(3.5);
  });
});
