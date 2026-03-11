import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ApiServiceError } from "@/services/apiClient";
import type { FuelStation, GeocodingResult } from "@/types/station";

const mockStations: FuelStation[] = [
  {
    id: "mock-1",
    name: "Station mock",
    brand: "Mock",
    brandSource: "mock",
    address: "1 Rue de Test",
    city: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    isOpen: true,
    openingHours: "24h/24",
    fuels: ["Diesel"],
    fuelPrices: {
      Diesel: 1.7,
    },
    priceHistory: {},
    services: ["Toilettes"],
  },
];

const getStationsAround = vi.fn();
const getMockStations = vi.fn(() => mockStations);
const geocodingSearch = vi.fn();
const getCurrentPosition = vi.fn();

vi.mock("@/utils/storage", () => ({
  loadStorage: <T>(_key: string, fallback: T) => fallback,
  saveStorage: vi.fn(),
}));

vi.mock("@/composables/useGeolocation", () => ({
  useGeolocation: () => ({
    getCurrentPosition,
  }),
}));

vi.mock("@/services/geocodingService", () => ({
  geocodingService: {
    search: geocodingSearch,
  },
}));

vi.mock("@/services/stationService", () => ({
  stationService: {
    getMockStations,
    getStationsAround,
    getStationById: vi.fn(),
    enrichStationHistory: vi.fn(async (station: FuelStation) => station),
    enrichStationBrand: vi.fn(async (station: FuelStation) => station),
    createSearchLocation: (result: GeocodingResult) => ({
      lat: result.lat,
      lng: result.lng,
      label: `${result.label} - ${result.city}`,
    }),
    findNearbyStations: ({ stations }: { stations: FuelStation[] }) => stations,
    getComparableStations: <T>(stations: T[]) => stations,
    getRecommendedBestStation: <T>(stations: T[]) => stations[0] ?? null,
    getStats: () => ({
      stationCount: 0,
      comparableCount: 0,
      averagePrice: null,
      maxSavings: null,
    }),
    getAvailableServices: () => [],
  },
}));

describe("useFuelStationsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
    getMockStations.mockReturnValue(mockStations);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to local stations when the API request fails", async () => {
    getStationsAround.mockRejectedValue(
      new ApiServiceError("L'API officielle des carburants est indisponible.", {
        code: "network",
      }),
    );

    const { useFuelStationsStore } = await import("@/stores/fuelStations");
    const store = useFuelStationsStore();

    await store.loadStationsForArea({
      lat: 48.8566,
      lng: 2.3522,
      label: "Paris",
    });

    expect(store.stations).toEqual(mockStations);
    expect(store.genericError).toContain("Affichage du dataset local de secours.");
    expect(getMockStations).toHaveBeenCalled();
  });

  it("sets a denied geolocation message when browser access is refused", async () => {
    getCurrentPosition.mockResolvedValue({
      ok: false,
      error: {
        code: "denied",
        message:
          "La geolocalisation a ete refusee. Utilisez une position de demonstration ou recherchez votre ville manuellement.",
      },
    });

    const { useFuelStationsStore } = await import("@/stores/fuelStations");
    const store = useFuelStationsStore();

    await store.requestUserLocation();

    expect(store.locationDenied).toBe(true);
    expect(store.geoError).toBe(
      "La geolocalisation a ete refusee. Utilisez une position de demonstration ou recherchez votre ville manuellement.",
    );
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("debounces location searches and only executes the latest query", async () => {
    geocodingSearch.mockResolvedValue([]);

    const { useFuelStationsStore } = await import("@/stores/fuelStations");
    const store = useFuelStationsStore();

    store.searchLocations("Par");
    store.searchLocations("Paris");

    await vi.advanceTimersByTimeAsync(300);

    expect(geocodingSearch).toHaveBeenCalledTimes(1);
    expect(geocodingSearch).toHaveBeenCalledWith(
      "Paris",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(store.geocodingError).toBe(
      "Aucun r\u00e9sultat de g\u00e9ocodage n'a \u00e9t\u00e9 trouv\u00e9 pour cette recherche.",
    );
  });

  it("stores geocoding results when an address search succeeds", async () => {
    geocodingSearch.mockResolvedValue([
      {
        id: "search-1",
        label: "Paris Centre",
        city: "Paris",
        address: "Paris, France",
        lat: 48.8566,
        lng: 2.3522,
      },
    ]);

    const { useFuelStationsStore } = await import("@/stores/fuelStations");
    const store = useFuelStationsStore();

    store.searchLocations("Paris");
    await vi.advanceTimersByTimeAsync(300);

    expect(store.geocodingResults).toEqual([
      {
        id: "search-1",
        label: "Paris Centre",
        city: "Paris",
        address: "Paris, France",
        lat: 48.8566,
        lng: 2.3522,
      },
    ]);
    expect(store.geocodingError).toBeNull();
  });
});
