import { describe, expect, it } from "vitest";
import {
  estimateDriveTimeMinutes,
  getDistanceToPolylineKm,
  getPolylineLengthKm,
  haversineDistance,
  samplePolyline,
} from "@/utils/geo";

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

  it("calculates the distance from a point to a polyline", () => {
    const route = [
      { lat: 48.8566, lng: 2.3522 },
      { lat: 48.8666, lng: 2.3922 },
      { lat: 48.8866, lng: 2.4322 },
    ];

    expect(getDistanceToPolylineKm({ lat: 48.867, lng: 2.393 }, route)).toBeLessThan(0.2);
    expect(getDistanceToPolylineKm({ lat: 48.91, lng: 2.55 }, route)).toBeGreaterThan(8);
  });

  it("samples a polyline while keeping the endpoints", () => {
    const route = [
      { lat: 48.8566, lng: 2.3522 },
      { lat: 48.86, lng: 2.38 },
      { lat: 48.87, lng: 2.41 },
      { lat: 48.8866, lng: 2.4322 },
    ];

    const samples = samplePolyline(route, 3);

    expect(samples).toHaveLength(3);
    expect(samples[0]).toEqual(route[0]);
    expect(samples[2]).toEqual(route[3]);
    expect(getPolylineLengthKm(samples)).toBeGreaterThan(0);
  });
});
