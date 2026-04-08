import { ApiServiceError } from "@/services/apiClient";
import type { Coordinates, LocationSource, PersistedLocation } from "@/types/station";
import type { FuelStationsState } from "@/store/fuelStationsStore.types";

type StoreSet = (
  partial:
    | Partial<FuelStationsState>
    | ((state: FuelStationsState) => Partial<FuelStationsState>),
) => void;

export const persistLocation = (
  position: Coordinates | null,
  source: LocationSource,
  placeId: string | null,
): PersistedLocation | null =>
  position && source
    ? {
        ...position,
        source,
        placeId,
        savedAt: new Date().toISOString(),
      }
    : null;

export const applyLocationState = (
  set: StoreSet,
  location: Coordinates,
  source: Exclude<LocationSource, null>,
  options?: { placeId?: string | null },
) => {
  set({
    userPosition: location,
    locationSource: source,
    locationPlaceId: options?.placeId ?? null,
    geoError: null,
    geocodingError: null,
    genericError: null,
  });
};

export const coordinatesMatch = (
  left: Coordinates | null | undefined,
  right: Coordinates | null | undefined,
) => {
  if (!left || !right) {
    return false;
  }

  return (
    Math.abs(left.lat - right.lat) < 0.0001 &&
    Math.abs(left.lng - right.lng) < 0.0001
  );
};

export const isAbortedRequestError = (error: unknown) =>
  error instanceof ApiServiceError && error.code === "aborted";
