import type { Coordinates } from "@/types/station";

const EARTH_RADIUS_KM = 6371;
const KM_PER_LAT_DEGREE = 110.574;

const toRadians = (value: number) => (value * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getLongitudeScaleKm = (latitude: number) => 111.320 * Math.cos(toRadians(latitude));

const toCartesianKm = (point: Coordinates, referenceLatitude: number) => ({
  x: point.lng * getLongitudeScaleKm(referenceLatitude),
  y: point.lat * KM_PER_LAT_DEGREE,
});

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

export const getPolylineLengthKm = (points: Coordinates[]) =>
  points.slice(1).reduce((total, point, index) => total + haversineDistance(points[index]!, point), 0);

export const samplePolyline = (points: Coordinates[], targetCount: number) => {
  if (points.length <= 2 || targetCount >= points.length) {
    return points;
  }

  const safeTargetCount = Math.max(2, targetCount);
  const cumulativeDistances = points.reduce<number[]>((distances, point, index) => {
    if (index === 0) {
      distances.push(0);
      return distances;
    }

    distances.push(distances[index - 1]! + haversineDistance(points[index - 1]!, point));
    return distances;
  }, []);

  const totalDistanceKm = cumulativeDistances.at(-1) ?? 0;

  if (totalDistanceKm === 0) {
    return [points[0]!, points.at(-1)!];
  }

  const samples = Array.from({ length: safeTargetCount }, (_, index) => {
    const targetDistanceKm = (totalDistanceKm * index) / (safeTargetCount - 1);
    const segmentIndex = cumulativeDistances.findIndex((distance) => distance >= targetDistanceKm);

    if (segmentIndex <= 0) {
      return points[0]!;
    }

    const start = points[segmentIndex - 1]!;
    const end = points[segmentIndex]!;
    const segmentStartDistance = cumulativeDistances[segmentIndex - 1]!;
    const segmentEndDistance = cumulativeDistances[segmentIndex]!;
    const segmentLength = segmentEndDistance - segmentStartDistance;
    const ratio = segmentLength === 0 ? 0 : (targetDistanceKm - segmentStartDistance) / segmentLength;

    return {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    };
  });

  return samples.filter(
    (point, index, list) =>
      index === 0 ||
      index === list.length - 1 ||
      point.lat !== list[index - 1]?.lat ||
      point.lng !== list[index - 1]?.lng,
  );
};

const getDistanceToSegmentKm = (point: Coordinates, start: Coordinates, end: Coordinates) => {
  const referenceLatitude = (point.lat + start.lat + end.lat) / 3;
  const pointKm = toCartesianKm(point, referenceLatitude);
  const startKm = toCartesianKm(start, referenceLatitude);
  const endKm = toCartesianKm(end, referenceLatitude);
  const segmentX = endKm.x - startKm.x;
  const segmentY = endKm.y - startKm.y;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

  if (segmentLengthSquared === 0) {
    return Math.hypot(pointKm.x - startKm.x, pointKm.y - startKm.y);
  }

  const projectionRatio = clamp(
    ((pointKm.x - startKm.x) * segmentX + (pointKm.y - startKm.y) * segmentY) / segmentLengthSquared,
    0,
    1,
  );

  const projectionX = startKm.x + segmentX * projectionRatio;
  const projectionY = startKm.y + segmentY * projectionRatio;
  return Math.hypot(pointKm.x - projectionX, pointKm.y - projectionY);
};

export const getDistanceToPolylineKm = (point: Coordinates, polyline: Coordinates[]) => {
  if (polyline.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (polyline.length === 1) {
    return haversineDistance(point, polyline[0]!);
  }

  return polyline.slice(1).reduce((minDistanceKm, currentPoint, index) => {
    const distanceKm = getDistanceToSegmentKm(point, polyline[index]!, currentPoint);
    return Math.min(minDistanceKm, distanceKm);
  }, Number.POSITIVE_INFINITY);
};
