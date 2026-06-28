import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";

// Zustand persist middleware uses localStorage — stub it
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  useFuelStationsStore.setState(useFuelStationsStore.getInitialState());
});

describe("preferencesSlice", () => {
  it("setSelectedFuel updates the selected fuel", () => {
    act(() => useFuelStationsStore.getState().setSelectedFuel("SP95"));
    expect(useFuelStationsStore.getState().selectedFuel).toBe("SP95");
  });

  it("setTheme updates the theme name", () => {
    act(() => useFuelStationsStore.getState().setTheme("fuelDark"));
    expect(useFuelStationsStore.getState().themeName).toBe("fuelDark");
  });

  it("toggleFavorite adds a station id", () => {
    act(() => useFuelStationsStore.getState().toggleFavorite("station-1"));
    expect(useFuelStationsStore.getState().favoriteIds).toContain("station-1");
  });

  it("toggleFavorite removes an already-favorited station id", () => {
    act(() => {
      useFuelStationsStore.getState().toggleFavorite("station-1");
      useFuelStationsStore.getState().toggleFavorite("station-1");
    });
    expect(useFuelStationsStore.getState().favoriteIds).not.toContain("station-1");
  });

  it("setFavoriteAlertPrice persists the alert price", () => {
    act(() => useFuelStationsStore.getState().setFavoriteAlertPrice(1.85));
    expect(useFuelStationsStore.getState().favoriteAlertPrice).toBe(1.85);
  });

  it("setFavoriteAlertPrice accepts null to disable alerts", () => {
    act(() => useFuelStationsStore.getState().setFavoriteAlertPrice(null));
    expect(useFuelStationsStore.getState().favoriteAlertPrice).toBeNull();
  });

  it("addRecentSearch keeps at most 5 entries, newest first", () => {
    const makeResult = (id: string) => ({
      id,
      label: id,
      lat: 0,
      lng: 0,
      placeId: id,
    });

    act(() => {
      for (let i = 1; i <= 6; i++) {
        useFuelStationsStore.getState().addRecentSearch(makeResult(`place-${i}`));
      }
    });

    const { recentSearches } = useFuelStationsStore.getState();
    expect(recentSearches).toHaveLength(5);
    expect(recentSearches[0].id).toBe("place-6");
  });

  it("clearRecentSearches empties the list", () => {
    act(() => {
      useFuelStationsStore.getState().addRecentSearch({ id: "x", label: "x", lat: 0, lng: 0, placeId: "x" });
      useFuelStationsStore.getState().clearRecentSearches();
    });
    expect(useFuelStationsStore.getState().recentSearches).toHaveLength(0);
  });

  it("setOpenOnly toggles the open-only filter", () => {
    act(() => useFuelStationsStore.getState().setOpenOnly(true));
    expect(useFuelStationsStore.getState().openOnly).toBe(true);
  });

  it("setConsumptionLitersPer100Km stores the value", () => {
    act(() => useFuelStationsStore.getState().setConsumptionLitersPer100Km(7.2));
    expect(useFuelStationsStore.getState().consumptionLitersPer100Km).toBe(7.2);
  });
});

describe("stationsSlice initial state", () => {
  it("starts with an empty stations array", () => {
    expect(useFuelStationsStore.getState().stations).toEqual([]);
  });

  it("starts with isLoading false", () => {
    expect(useFuelStationsStore.getState().isLoading).toBe(false);
  });
});
