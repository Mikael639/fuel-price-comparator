import type { Coordinates } from "@/types/station";

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineDistance = (
  origin: Coordinates,
  destination: Coordinates,
): number => {
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const estimateDriveTimeMinutes = (distanceKm: number) => {
  const baseMinutes = distanceKm * 1.65 + 2;
  return Math.max(3, Math.round(baseMinutes));
};
