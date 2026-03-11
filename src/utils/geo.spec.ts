import { describe, expect, it } from "vitest";
import { estimateDriveTimeMinutes, haversineDistance } from "@/utils/geo";

describe("geo utils", () => {
  it("calculates a realistic haversine distance", () => {
    const distance = haversineDistance(
      { lat: 48.8566, lng: 2.3522 },
      { lat: 48.6899, lng: 2.3734 },
    );

    expect(distance).toBeGreaterThan(18);
    expect(distance).toBeLessThan(19.5);
  });

  it("estimates a non-zero drive time", () => {
    expect(estimateDriveTimeMinutes(0.6)).toBeGreaterThanOrEqual(3);
    expect(estimateDriveTimeMinutes(12)).toBeGreaterThan(estimateDriveTimeMinutes(2));
  });
});
