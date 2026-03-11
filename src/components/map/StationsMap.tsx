import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, LocateFixed, Navigation, Star } from "lucide-react";
import L from "leaflet";
import "leaflet.markercluster";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistance, formatDriveTime, formatPrice } from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { cn } from "@/lib/utils";
import type { Coordinates, FuelType, StationWithMetrics } from "@/types/station";

const userIcon = L.divIcon({
  className: "map-user-marker",
  html: '<div class="h-6 w-6 rounded-full border-4 border-teal-300 bg-slate-900 shadow-lg"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createStationIcon = (best: boolean, open: boolean, showPrice: boolean, price?: string) =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative">
        <div class="${best ? "animate-pulsepin bg-amber-400" : "bg-teal-600"} h-6 w-6 rounded-full border-4 border-white shadow-lg"></div>
        <div class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-white ${open ? "bg-emerald-500" : "bg-red-500"}"></div>
        ${showPrice && price ? `<div class="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">${price}</div>` : ""}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const ClusteredStationsLayer = ({
  stations,
  selectedFuel,
  bestStationId,
  onSelectStation,
}: {
  stations: StationWithMetrics[];
  selectedFuel: FuelType;
  bestStationId: string | null;
  onSelectStation: (station: StationWithMetrics) => void;
}) => {
  const map = useMap();
  const clusterLayerRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const clusterLayer =
      clusterLayerRef.current ??
      L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 56,
        iconCreateFunction: (cluster) =>
          L.divIcon({
            className: "map-cluster",
            html: `<span>${cluster.getChildCount()}</span>`,
            iconSize: [44, 44],
          }),
      });

    clusterLayer.clearLayers();

    stations.forEach((station, index) => {
      const marker = L.marker([station.lat, station.lng], {
        icon: createStationIcon(
          station.id === bestStationId,
          station.isOpen,
          station.id === bestStationId || index < 2,
          station.selectedFuelPrice != null ? formatPrice(station.selectedFuelPrice) : undefined,
        ),
      });

      marker.bindPopup(`
        <div class="map-popup">
          <h4 class="map-popup__title">${station.name}</h4>
          <p class="map-popup__meta">${station.address}, ${station.city}</p>
          <p class="map-popup__meta">${selectedFuel} - ${formatPrice(station.selectedFuelPrice)}</p>
          <p class="map-popup__meta">${formatDistance(station.distanceKm)} - ~ ${formatDriveTime(station.estimatedDriveMinutes)}</p>
          <div class="map-popup__actions">
            <a class="map-popup__button" href="/station/${station.id}">Voir details</a>
            <a class="map-popup__button map-popup__button--ghost" href="${getGoogleMapsDirectionsUrl(station.lat, station.lng)}" target="_blank" rel="noopener noreferrer">Y aller</a>
          </div>
        </div>
      `);

      marker.on("click", () => onSelectStation(station));
      clusterLayer.addLayer(marker);
    });

    if (!clusterLayerRef.current) {
      clusterLayerRef.current = clusterLayer;
      map.addLayer(clusterLayer);
    }

    return () => {
      map.removeLayer(clusterLayer);
      clusterLayerRef.current = null;
    };
  }, [bestStationId, map, onSelectStation, selectedFuel, stations]);

  return null;
};

const FitBounds = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [bounds, map]);

  return null;
};

interface StationsMapProps {
  userPosition: Coordinates | null;
  stations: StationWithMetrics[];
  selectedFuel: FuelType;
  radiusKm: number;
  bestStationId?: string | null;
}

export const StationsMap = ({
  userPosition,
  stations,
  selectedFuel,
  radiusKm,
  bestStationId = null,
}: StationsMapProps) => {
  const navigate = useNavigate();
  const [selectedStation, setSelectedStation] = useState<StationWithMetrics | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const themeName = useFuelStationsStore((state) => state.themeName);
  const toggleFavorite = useFuelStationsStore((state) => state.toggleFavorite);
  const mapShellRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const tileLayerConfig = useMemo(
    () =>
      themeName === "fuelDark"
        ? {
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          }
        : {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          },
    [themeName],
  );

  const bounds = useMemo(() => {
    if (!userPosition && stations.length === 0) {
      return null;
    }

    const latLngs: L.LatLngTuple[] = stations.map((station) => [station.lat, station.lng]);
    if (userPosition) {
      latLngs.push([userPosition.lat, userPosition.lng]);
      const searchBounds = L.latLng([userPosition.lat, userPosition.lng]).toBounds(radiusKm * 1000);
      latLngs.push([searchBounds.getNorthEast().lat, searchBounds.getNorthEast().lng]);
      latLngs.push([searchBounds.getSouthWest().lat, searchBounds.getSouthWest().lng]);
    }
    return L.latLngBounds(latLngs);
  }, [radiusKm, stations, userPosition]);

  useEffect(() => {
    if (!selectedStation && bestStationId) {
      setSelectedStation(stations.find((station) => station.id === bestStationId) ?? null);
    }
  }, [bestStationId, selectedStation, stations]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === mapShellRef.current);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const handleFullscreen = async () => {
    if (!mapShellRef.current) {
      return;
    }

    if (document.fullscreenElement === mapShellRef.current) {
      await document.exitFullscreen();
    } else {
      await mapShellRef.current.requestFullscreen();
    }

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 120);
  };

  const recenterMap = () => {
    if (bounds) {
      mapRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-0">
        <div className="flex flex-col gap-4 px-5 pt-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Carte interactive</p>
              <h3 className="font-display text-xl tracking-tight">Stations visibles autour de vous</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{selectedFuel}</Badge>
              <Badge variant="secondary">{stations.length} stations</Badge>
              <Badge variant="accent">Rayon {radiusKm} km</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={recenterMap} size="icon" variant="tonal">
              <LocateFixed className="h-4 w-4" />
            </Button>
            <Button onClick={handleFullscreen} size="icon" variant="tonal">
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "relative px-4 pb-4 md:px-5 md:pb-5",
            isFullscreen && "bg-slate-950/90 px-4 py-4 backdrop-blur-xl",
          )}
          ref={mapShellRef}
        >
          <div className="pointer-events-none absolute left-8 top-4 z-[500] flex max-w-[calc(100%-4rem)] flex-wrap gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <span>Votre position</span>
            <span>•</span>
            <span>Zone de recherche</span>
            {bestStationId ? (
              <>
                <span>•</span>
                <span>Meilleur prix recommande</span>
              </>
            ) : null}
          </div>

          <div className={cn("overflow-hidden rounded-[28px] border", isFullscreen ? "h-[calc(100vh-2rem)]" : "h-[26rem] md:h-[32rem]")}>
            <MapContainer
              center={userPosition ? [userPosition.lat, userPosition.lng] : [48.8566, 2.3522]}
              className="h-full w-full"
              ref={(instance) => {
                mapRef.current = instance;
              }}
              zoom={12}
            >
              <TileLayer attribution={tileLayerConfig.attribution} url={tileLayerConfig.url} />
              {bounds ? <FitBounds bounds={bounds} /> : null}
              {userPosition ? (
                <>
                  <Circle center={[userPosition.lat, userPosition.lng]} pathOptions={{ color: "#0f766e", dashArray: "8 8" }} radius={radiusKm * 1000} />
                  <Circle center={[userPosition.lat, userPosition.lng]} pathOptions={{ color: "#0f766e", fillColor: "#5eead4", fillOpacity: 0.2 }} radius={260} />
                  <Marker icon={userIcon} position={[userPosition.lat, userPosition.lng]} />
                </>
              ) : null}
              <ClusteredStationsLayer
                bestStationId={bestStationId}
                onSelectStation={setSelectedStation}
                selectedFuel={selectedFuel}
                stations={stations}
              />
            </MapContainer>
          </div>

          {selectedStation ? (
            <div className="absolute inset-x-4 bottom-4 z-[500] rounded-[24px] border border-white/40 bg-white/90 p-4 shadow-2xl backdrop-blur md:left-auto md:w-[26rem] dark:border-white/10 dark:bg-slate-950/85">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{selectedStation.brand}</p>
                  <h4 className="font-display text-lg tracking-tight">{selectedStation.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedStation.address}, {selectedStation.city}
                  </p>
                </div>
                <button onClick={() => toggleFavorite(selectedStation.id)} type="button">
                  <Star className={`h-5 w-5 ${selectedStation.isFavorite ? "fill-current text-amber-500" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{selectedFuel} • {formatPrice(selectedStation.selectedFuelPrice)}</Badge>
                <Badge variant="secondary">{formatDistance(selectedStation.distanceKm)}</Badge>
                <Badge variant="secondary">~ {formatDriveTime(selectedStation.estimatedDriveMinutes)}</Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate(`/station/${selectedStation.id}`)} variant="tonal">
                  Voir details
                </Button>
                <Button asChild>
                  <a href={getGoogleMapsDirectionsUrl(selectedStation.lat, selectedStation.lng)} rel="noreferrer" target="_blank">
                    <Navigation className="h-4 w-4" />
                    Y aller
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
