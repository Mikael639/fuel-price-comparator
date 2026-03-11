import { Eye, MapPin, Navigation, PiggyBank, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { formatDistance, formatDriveTime, formatMoney, formatPrice } from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import type { FuelType, StationWithMetrics } from "@/types/station";

interface StationCardProps {
  station: StationWithMetrics;
  selectedFuel: FuelType;
  averagePrice: number | null;
  isBest?: boolean;
}

export const StationCard = ({ station, selectedFuel, averagePrice, isBest = false }: StationCardProps) => {
  const navigate = useNavigate();
  const toggleFavorite = useFuelStationsStore((state) => state.toggleFavorite);
  const savings = stationService.getStationSavings(station, averagePrice);

  const brandMeta =
    station.brandSource === "osm"
      ? `Enseigne enrichie via OpenStreetMap : ${station.brand}`
      : station.brandSource === "inferred"
        ? `Enseigne estimee : ${station.brand}`
        : station.brandSource === "not_provided"
          ? "Enseigne non communiquee"
          : station.brand;

  return (
    <Card className="transition-transform duration-200 hover:-translate-y-1">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {isBest ? <Badge variant="accent">Meilleur prix</Badge> : null}
              <Badge variant={station.isOpen ? "success" : "danger"}>{station.isOpen ? "Ouverte" : "Fermee"}</Badge>
              <Badge variant="outline">{station.brandSource === "mock" ? "Dataset local" : "Source officielle"}</Badge>
            </div>
            <div>
              <h3 className="font-display text-xl tracking-tight">{station.name}</h3>
              <p className="text-sm text-muted-foreground">{brandMeta}</p>
              <p className="text-sm text-muted-foreground">
                {station.address}, {station.city}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <button onClick={() => toggleFavorite(station.id)} type="button">
              <Star className={`h-5 w-5 ${station.isFavorite ? "fill-current text-amber-500" : "text-muted-foreground"}`} />
            </button>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{selectedFuel}</p>
            <div className="font-display text-2xl tracking-tight">{formatPrice(station.selectedFuelPrice)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <MapPin className="mr-1 h-3.5 w-3.5" />
            {formatDistance(station.distanceKm)}
          </Badge>
          <Badge variant="secondary">~ {formatDriveTime(station.estimatedDriveMinutes)}</Badge>
          <Badge variant="secondary">
            <PiggyBank className="mr-1 h-3.5 w-3.5" />
            {formatMoney(savings)} / L
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {station.services.map((service) => (
            <Badge key={service} variant="outline">
              {service}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate(`/station/${station.id}`)} variant="tonal">
            <Eye className="h-4 w-4" />
            Voir details
          </Button>
          <Button asChild>
            <a href={getGoogleMapsDirectionsUrl(station.lat, station.lng)} rel="noreferrer" target="_blank">
              <Navigation className="h-4 w-4" />
              Y aller
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
