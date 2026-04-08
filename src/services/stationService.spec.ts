import { describe, expect, it } from "vitest";
import {
  dedupeStations,
  mapRecordToStation,
  mergeStationHistory,
  normalizeOfficialText,
  stationService,
  sortStations,
} from "@/services/stationService";
import type { FuelStation, StationWithMetrics } from "@/types/station";

const baseStation: FuelStation = {
  id: "1",
  name: "Station Test",
  brand: "Test",
  brandSource: "mock",
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
  dataOrigin: "mock",
};

const createMetricsStation = (overrides?: Partial<StationWithMetrics>): StationWithMetrics => ({
  ...baseStation,
  distanceKm: 4,
  distanceToRouteKm: null,
  selectedFuelPrice: 1.7,
  estimatedDriveMinutes: 9,
  savingsPerLiter: 0.07,
  fillVolumeLiters: 50,
  estimatedFillCost: 85,
  estimatedDetourCost: 0.88,
  netSavingsForTank: 2.62,
  isFavorite: false,
  priceTrend: "stable",
  isRouteDetour: false,
  hasAccurateRouteDetour: false,
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
      prix_maj: "2026-03-12T08:00:00.000Z",
    });

    expect(station?.city).toBe("Juvisy-sur-Orge");
    expect(station?.services).toContain("Superette");
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
        estimatedDetourCost: 1.1,
        netSavingsForTank: 2.4,
      }),
    ];

    expect(sortStations(stations, "savings")[0]?.id).toBe("3");
  });

  it("filters stations using the active route corridor", () => {
    const routePath = {
      origin: { lat: 48.8566, lng: 2.3522, label: "Paris" },
      destination: { lat: 48.8866, lng: 2.4322, label: "Noisy-le-Sec" },
      geometry: [
        { lat: 48.8566, lng: 2.3522 },
        { lat: 48.8666, lng: 2.3922 },
        { lat: 48.8866, lng: 2.4322 },
      ],
      distanceKm: 7.8,
      durationMinutes: 18,
    } as const;

    const stations = stationService.findNearbyStations({
      stations: [
        {
          ...baseStation,
          id: "on-route",
          lat: 48.867,
          lng: 2.393,
          fuelPrices: { Diesel: 1.68, SP95: 1.79 },
        },
        {
          ...baseStation,
          id: "far-away",
          lat: 48.93,
          lng: 2.61,
          fuelPrices: { Diesel: 1.66, SP95: 1.77 },
        },
      ],
      position: routePath.origin,
      radiusKm: 3,
      openOnly: false,
      services: [],
      fuel: "Diesel",
      sortMode: "price",
      favoriteIds: [],
      fillVolumeLiters: 50,
      consumptionLitersPer100Km: 6.5,
      routePath,
      routePosition: routePath.destination,
    });

    expect(stations).toHaveLength(1);
    expect(stations[0]?.id).toBe("on-route");
    expect(stations[0]?.isRouteDetour).toBe(true);
    expect(stations[0]?.distanceToRouteKm).not.toBeNull();
  });

  it("prefers a precise route detour when it is available", () => {
    const routePath = {
      origin: { lat: 48.6899, lng: 2.3734, label: "Juvisy" },
      destination: { lat: 48.7075, lng: 2.3928, label: "Athis-Mons" },
      geometry: [
        { lat: 48.6899, lng: 2.3734 },
        { lat: 48.6998, lng: 2.3856 },
        { lat: 48.7075, lng: 2.3928 },
      ],
      distanceKm: 6.2,
      durationMinutes: 13,
    } as const;

    const stationWithPreciseDetour = stationService.findNearbyStations({
      stations: [
        {
          ...baseStation,
          id: "detour-station",
          lat: 48.6998,
          lng: 2.3856,
          routeDetourKm: 1.4,
          routeDetourMinutes: 5,
        },
      ],
      position: routePath.origin,
      radiusKm: 3,
      openOnly: false,
      services: [],
      fuel: "Diesel",
      sortMode: "distance",
      favoriteIds: [],
      fillVolumeLiters: 50,
      consumptionLitersPer100Km: 6.5,
      routePath,
      routePosition: routePath.destination,
    });

    expect(stationWithPreciseDetour[0]?.distanceKm).toBeCloseTo(1.4, 3);
    expect(stationWithPreciseDetour[0]?.estimatedDriveMinutes).toBe(5);
    expect(stationWithPreciseDetour[0]?.hasAccurateRouteDetour).toBe(true);
  });
});
