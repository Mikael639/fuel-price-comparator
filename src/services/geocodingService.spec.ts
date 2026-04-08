import { beforeEach, describe, expect, it, vi } from "vitest";
import { geocodingService } from "@/services/geocodingService";

const mockFetch = vi.fn();

describe("geocodingService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    (geocodingService as unknown as { searchCache: Map<string, unknown> }).searchCache.clear();
    (geocodingService as unknown as { rateLimitedUntil: number }).rateLimitedUntil = 0;
  });

  it("caches successful geocoding responses", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify([
          {
            place_id: 1,
            lat: "48.6899",
            lon: "2.3734",
            display_name: "Juvisy-sur-Orge, Essonne, Ile-de-France, France",
            address: { city: "Juvisy-sur-Orge" },
            name: "Juvisy-sur-Orge",
          },
        ]),
    });

    const firstResults = await geocodingService.search("Juvisy-sur-Orge");
    const secondResults = await geocodingService.search("Juvisy-sur-Orge");

    expect(firstResults).toHaveLength(1);
    expect(secondResults[0]?.city).toBe("Juvisy-sur-Orge");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("shows a friendly message and enters cooldown after a 429", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: "rate_limited" }),
    });

    await expect(geocodingService.search("Choisy")).rejects.toThrow(
      "Le geocodeur public est temporairement limite. Reessayez dans quelques instants.",
    );

    mockFetch.mockReset();

    await expect(geocodingService.search("Choisy-le-Roi")).rejects.toThrow(
      "Le geocodeur public est temporairement limite. Reessayez dans quelques instants.",
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
