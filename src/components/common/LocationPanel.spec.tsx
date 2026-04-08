import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocationPanel } from "@/components/common/LocationPanel";
import type { GeocodingResult } from "@/types/station";

const baseResult: GeocodingResult = {
  id: "1",
  label: "Juvisy-sur-Orge",
  city: "Juvisy-sur-Orge",
  address: "Juvisy-sur-Orge, Essonne, France",
  lat: 48.6899,
  lng: 2.3734,
};

const buildProps = () => ({
  isGeolocating: false,
  isSearchingLocation: false,
  isSearchingRoute: false,
  isLoadingRoute: false,
  geoError: null,
  geocodingError: null,
  routeError: null,
  locationLabel: null,
  locationSource: null,
  searchQuery: "",
  routeDestination: "",
  routePath: null,
  searchResults: [] as GeocodingResult[],
  routeResults: [] as GeocodingResult[],
  onLocate: vi.fn(),
  onRefresh: vi.fn(),
  onSearchAddress: vi.fn(),
  onSelectSearchResult: vi.fn(),
  onSearchRoute: vi.fn(),
  onSelectRouteResult: vi.fn(),
  onClearRoute: vi.fn(),
});

describe("LocationPanel", () => {
  it("keeps departure search controlled and supports an immediate manual submit", () => {
    const props = buildProps();
    const { rerender } = render(<LocationPanel {...props} />);

    const departureInput = screen.getByPlaceholderText(/ville ou adresse de départ/i);
    fireEvent.change(departureInput, {
      target: { value: "Juvisy-sur-Orge" },
    });

    expect(props.onSearchAddress).toHaveBeenCalledWith("Juvisy-sur-Orge");
    rerender(<LocationPanel {...props} searchQuery="Juvisy-sur-Orge" />);

    fireEvent.click(screen.getByRole("button", { name: /rechercher le depart/i }));

    expect(props.onSearchAddress).toHaveBeenLastCalledWith("Juvisy-sur-Orge", {
      immediate: true,
    });
  });

  it("lets the keyboard pick a search suggestion", () => {
    const props = buildProps();
    props.searchQuery = "Juvisy";
    props.searchResults = [
      baseResult,
      { ...baseResult, id: "2", label: "Athis-Mons", city: "Athis-Mons" },
    ];

    render(<LocationPanel {...props} />);

    const departureInput = screen.getByPlaceholderText(/ville ou adresse de départ/i);
    fireEvent.keyDown(departureInput, { key: "ArrowDown" });
    fireEvent.keyDown(departureInput, { key: "Enter" });

    expect(props.onSelectSearchResult).toHaveBeenCalledWith(props.searchResults[1]);
  });
});
