import { describe, expect, it } from "vitest";
import { calculateFuelCost } from "@/utils/fuelCost";

describe("calculateFuelCost", () => {
  it("calculates the fuel cost for a standard trip", () => {
    expect(calculateFuelCost(150, 6.5, 1.8)).toBeCloseTo(17.55, 2);
  });

  it("returns zero when the distance is zero", () => {
    expect(calculateFuelCost(0, 6.5, 1.8)).toBe(0);
  });

  it("returns zero when the consumption is zero to avoid invalid math", () => {
    expect(calculateFuelCost(120, 0, 1.8)).toBe(0);
  });
});
