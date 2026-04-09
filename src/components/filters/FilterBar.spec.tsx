import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FuelType, ServiceType, SortMode } from "@/types/station";

const buildProps = () => ({
  selectedFuel: "Diesel" as FuelType,
  radiusKm: 10,
  openOnly: false,
  selectedServices: [] as ServiceType[],
  sortMode: "smartFill" as SortMode,
  fillVolumeLiters: 50,
  consumptionLitersPer100Km: 6.5,
  favoriteAlertPrice: null,
  fuelOptions: ["Diesel", "SP95"] as const,
  serviceOptions: ["Toilettes", "Lavage"] as const,
  onSelectedFuelChange: vi.fn(),
  onRadiusKmChange: vi.fn(),
  onOpenOnlyChange: vi.fn(),
  onSelectedServicesChange: vi.fn(),
  onSortModeChange: vi.fn(),
  onFillVolumeLitersChange: vi.fn(),
  onConsumptionLitersPer100KmChange: vi.fn(),
  onFavoriteAlertPriceChange: vi.fn(),
});

describe("FilterBar", () => {
  it("offers quick presets for the smart fill volume", () => {
    const props = buildProps();
    render(<FilterBar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "65 L" }));

    expect(props.onFillVolumeLitersChange).toHaveBeenCalledWith(65);
  });

  it("lets the user manually type a custom tank volume", () => {
    const props = buildProps();
    render(<FilterBar {...props} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: /volume du plein en litres/i }), {
      target: { value: "42" },
    });

    expect(props.onFillVolumeLitersChange).toHaveBeenCalledWith(42);
  });
});
