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
  dataOrigin: "mock",
  address: "12 Avenue de la Republique",
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
  priceUpdatedAt: {
    Diesel: "2026-03-11T08:00:00.000Z",
    SP95: "2026-03-11T08:00:00.000Z",
  },
  lastUpdatedAt: "2026-03-11T08:00:00.000Z",
  services: ["Toilettes"],
};

const createMetricsStation = (overrides?: Partial<StationWithMetrics>): StationWithMetrics => ({
  ...baseStation,
  distanceKm: 4,
  selectedFuelPrice: 1.7,
  estimatedDriveMinutes: 9,
  savingsPerLiter: 0.07,
  fillVolumeLiters: 50,
  estimatedFillCost: 85,
  estimatedDetourCost: 0.88,
  netSavingsForTank: 2.62,
  isFavorite: false,
  ...overrides,
});

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
      gazole_maj: "2026-03-12T08:00:00.000Z",
    });

    expect(station?.city).toBe("Juvisy-sur-Orge");
    expect(station?.services).toContain("Supérette");
    expect(station?.fuelPrices.Diesel).toBe(1.7);
    expect(station?.priceUpdatedAt.Diesel).toBe("2026-03-12T08:00:00.000Z");
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
      createMetricsStation({
        selectedFuelPrice: 1.74,
        savingsPerLiter: 0.03,
        netSavingsForTank: 0.55,
      }),
      createMetricsStation({
        id: "3",
        distanceKm: 5,
        selectedFuelPrice: 1.7,
        estimatedDriveMinutes: 10,
        savingsPerLiter: 0.07,
        estimatedFillCost: 85,
        estimatedDetourCost: 1.1,
        netSavingsForTank: 2.4,
      }),
    ];

    expect(sortStations(stations, "savings")[0]?.id).toBe("3");
    expect(sortStations(stations, "smartFill")[0]?.id).toBe("3");
  });

  it("computes savings for a 50L fill", () => {
    expect(stationService.getStationFillSavings(createMetricsStation(), 1.77)).toBeCloseTo(3.5);
  });

  it("aggregates a weekly local trend for a fuel", () => {
    const trend = stationService.getAreaWeeklyFuelTrend([createMetricsStation()], "Diesel");

    expect(trend.labels.length).toBeGreaterThanOrEqual(2);
    expect(trend.latestPrice).toBe(1.7);
  });

  it("falls back to mock history when official local history is insufficient", () => {
    const trend = stationService.getAreaWeeklyFuelTrend(
      [
        createMetricsStation({
          lat: 48.7648,
          lng: 2.3924,
          priceHistory: {
            Diesel: [{ date: "2026-03-17T08:00:00.000Z", price: 1.7 }],
          },
          priceUpdatedAt: {
            Diesel: "2026-03-17T08:00:00.000Z",
          },
          lastUpdatedAt: "2026-03-17T08:00:00.000Z",
        }),
      ],
      "Diesel",
      {
        fallbackPosition: { lat: 48.7648, lng: 2.3924 },
        fallbackRadiusKm: 15,
      },
    );

    expect(trend.source).toBe("mock");
    expect(trend.prices.length).toBeGreaterThan(1);
  });

  it("compares diesel and essence averages in the visible area", () => {
    const comparison = stationService.getDieselEssenceComparator([createMetricsStation()]);

    expect(comparison.dieselAverage).toBe(1.7);
    expect(comparison.gasolineAverage).toBe(1.8);
    expect(comparison.cheaperFuel).toBe("Diesel");
  });

  it("builds favorite alerts from the current area", () => {
    const stations = [
      createMetricsStation({
        isFavorite: true,
        selectedFuelPrice: 1.69,
        netSavingsForTank: 2.1,
      }),
      createMetricsStation({
        id: "2",
        name: "Station moins chere",
        selectedFuelPrice: 1.65,
        netSavingsForTank: 3.2,
      }),
    ];

    const alerts = stationService.getFavoriteAlerts(stations, "Diesel", 1.7);

    expect(alerts.length).toBeGreaterThan(0);
  });
});
