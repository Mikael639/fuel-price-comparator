import { beforeEach, describe, expect, it, vi } from "vitest";
import { routingService } from "@/services/routingService";

const origin = { lat: 48.6899, lng: 2.3734, label: "Juvisy-sur-Orge" };
const destination = { lat: 48.7075, lng: 2.3928, label: "Athis-Mons" };
const waypoint = { lat: 48.6998, lng: 2.3856, label: "Station test" };

describe("routingService", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    (
      routingService as unknown as {
        routeCache: Map<string, unknown>;
      }
    ).routeCache.clear();
  });

  it("caches direct routes", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          routes: [
            {
              distance: 6200,
              duration: 780,
              geometry: {
                coordinates: [
                  [2.3734, 48.6899],
                  [2.382, 48.6925],
                  [2.3928, 48.7075],
                ],
              },
            },
          ],
        }),
    } as Response);

    const firstRoute = await routingService.getRoute(origin, destination);
    const secondRoute = await routingService.getRoute(origin, destination);

    expect(firstRoute.distanceKm).toBeCloseTo(6.2, 3);
    expect(secondRoute.durationMinutes).toBe(13);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("calculates a precise detour against the direct route", async () => {
    fetchMock.mockImplementation(async (input) => {
      const requestUrl = String(input);
      const isWaypointRoute = requestUrl.includes(`${waypoint.lng},${waypoint.lat}`);

      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            routes: [
              {
                distance: isWaypointRoute ? 7600 : 6200,
                duration: isWaypointRoute ? 1080 : 780,
                geometry: {
                  coordinates: isWaypointRoute
                    ? [
                        [origin.lng, origin.lat],
                        [waypoint.lng, waypoint.lat],
                        [destination.lng, destination.lat],
                      ]
                    : [
                        [origin.lng, origin.lat],
                        [destination.lng, destination.lat],
                      ],
                },
              },
            ],
          }),
      } as Response;
    });

    const directRoute = await routingService.getRoute(origin, destination);
    const detour = await routingService.analyzeDetour(origin, waypoint, destination, {
      directRoute,
    });

    expect(detour.totalDistanceKm).toBeCloseTo(7.6, 3);
    expect(detour.detourDistanceKm).toBeCloseTo(1.4, 3);
    expect(detour.detourDurationMinutes).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
