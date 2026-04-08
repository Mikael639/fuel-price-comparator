import { appConfig } from "@/config/app";
import { fetchJson } from "@/services/apiClient";
import type { Coordinates, RoutePath } from "@/types/station";

interface OsrmRouteResponse {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
}

interface RequestOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

interface CacheEntry {
  expiresAt: number;
  value: RoutePath;
}

const ROUTE_CACHE_TTL_MS = 30 * 60 * 1000;

const buildCoordinatePair = (point: Coordinates) => `${point.lng},${point.lat}`;
const coordinatesMatch = (left: Coordinates, right: Coordinates) =>
  Math.abs(left.lat - right.lat) < 0.0001 && Math.abs(left.lng - right.lng) < 0.0001;

const buildRouteRequestUrl = (points: Coordinates[]) => {
  const baseUrl = appConfig.routing.url;

  if (!baseUrl) {
    return "";
  }

  const requestUrl = new URL(baseUrl, window.location.origin);
  const coordinates = points.map(buildCoordinatePair).join(";");

  if (requestUrl.pathname.includes("/route/v1/")) {
    requestUrl.pathname = `${requestUrl.pathname.replace(/\/+$/, "")}/${coordinates}`;
  } else {
    if (points.length === 2) {
      requestUrl.searchParams.set("origin", buildCoordinatePair(points[0]!));
      requestUrl.searchParams.set("destination", buildCoordinatePair(points[1]!));
    } else {
      requestUrl.searchParams.set("coordinates", coordinates);
    }
  }

  requestUrl.searchParams.set("overview", "full");
  requestUrl.searchParams.set("geometries", "geojson");
  requestUrl.searchParams.set("steps", "false");
  return requestUrl.toString();
};

const toRoutePath = (points: Coordinates[], payload: OsrmRouteResponse): RoutePath => {
  const bestRoute = payload.routes?.[0];
  const geometry = bestRoute?.geometry?.coordinates?.map(([lng, lat]) => ({ lat, lng })) ?? [];
  const origin = points[0]!;
  const destination = points.at(-1)!;

  if (!bestRoute || geometry.length < 2) {
    throw new Error("route_unavailable");
  }

  return {
    origin,
    destination,
    geometry,
    distanceKm: bestRoute.distance / 1000,
    durationMinutes: Math.max(1, Math.round(bestRoute.duration / 60)),
  };
};

export interface RouteDetourAnalysis {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  detourDistanceKm: number;
  detourDurationMinutes: number;
}

class RoutingService {
  private readonly routeCache = new Map<string, CacheEntry>();

  private getCachedValue(cacheKey: string) {
    const cachedEntry = this.routeCache.get(cacheKey);

    if (!cachedEntry) {
      return null;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
      this.routeCache.delete(cacheKey);
      return null;
    }

    return cachedEntry.value;
  }

  private async getRoutePath(points: Coordinates[], options?: RequestOptions) {
    if (!appConfig.routing.url) {
      throw new Error("routing_disabled");
    }

    const cacheKey = points.map(buildCoordinatePair).join(">");
    const cachedRoute = options?.forceRefresh ? null : this.getCachedValue(cacheKey);

    if (cachedRoute) {
      return cachedRoute;
    }

    const payload = await fetchJson<OsrmRouteResponse>(buildRouteRequestUrl(points), {
      signal: options?.signal,
      timeoutMs: appConfig.routing.timeoutMs,
      errorMessage: "Le calcul du trajet est indisponible pour le moment.",
    });

    const routePath = toRoutePath(points, payload);
    this.routeCache.set(cacheKey, {
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
      value: routePath,
    });

    return routePath;
  }

  async getRoute(origin: Coordinates, destination: Coordinates, options?: RequestOptions) {
    return this.getRoutePath([origin, destination], options);
  }

  async analyzeDetour(
    origin: Coordinates,
    waypoint: Coordinates,
    destination: Coordinates,
    options?: RequestOptions & { directRoute?: RoutePath | null },
  ): Promise<RouteDetourAnalysis> {
    const directRoutePromise =
      options?.directRoute &&
      coordinatesMatch(options.directRoute.origin, origin) &&
      coordinatesMatch(options.directRoute.destination, destination) &&
      !options.forceRefresh
        ? Promise.resolve(options.directRoute)
        : this.getRoute(origin, destination, options);
    const routeViaWaypointPromise = this.getRoutePath([origin, waypoint, destination], options);

    const [directRoute, routeViaWaypoint] = await Promise.all([
      directRoutePromise,
      routeViaWaypointPromise,
    ]);

    return {
      totalDistanceKm: routeViaWaypoint.distanceKm,
      totalDurationMinutes: routeViaWaypoint.durationMinutes,
      detourDistanceKm: Math.max(0, routeViaWaypoint.distanceKm - directRoute.distanceKm),
      detourDurationMinutes: Math.max(1, routeViaWaypoint.durationMinutes - directRoute.durationMinutes),
    };
  }
}

export const routingService = new RoutingService();
