import { beforeEach, describe, expect, it, vi } from "vitest";
import { fuelApiService, isOfficialStationId } from "@/services/fuelApi";
import * as apiClient from "@/services/apiClient";

describe("isOfficialStationId", () => {
  it("accepte uniquement des identifiants numeriques", () => {
    expect(isOfficialStationId("91170007")).toBe(true);
    expect(isOfficialStationId("")).toBe(false);
    expect(isOfficialStationId("station-bercy-total")).toBe(false);
    expect(isOfficialStationId("1 OR 1=1")).toBe(false);
    expect(isOfficialStationId("1) OR (id=2")).toBe(false);
  });
});

describe("fuelApiService - identifiants invalides", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("n'interroge pas l'API avec un identifiant non numerique", async () => {
    const fetchSpy = vi.spyOn(apiClient, "fetchJson");

    await expect(fuelApiService.getStationById("1 OR 1=1")).resolves.toBeNull();
    await expect(fuelApiService.getDailyHistory("x';--")).resolves.toEqual([]);
    await expect(fuelApiService.getDailyHistoryForStations(["abc", "station-1"])).resolves.toEqual([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
