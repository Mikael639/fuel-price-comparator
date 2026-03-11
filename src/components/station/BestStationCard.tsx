import { Eye, Navigation, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { formatDistance, formatDriveTime, formatMoney, formatPrice } from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import type { FuelType, StationWithMetrics } from "@/types/station";

interface BestStationCardProps {
  station: StationWithMetrics;
  selectedFuel: FuelType;
  averagePrice: number | null;
}

export const BestStationCard = ({ station, selectedFuel, averagePrice }: BestStationCardProps) => {
  const navigate = useNavigate();
  const toggleFavorite = useFuelStationsStore((state) => state.toggleFavorite);
  const savings = stationService.getStationSavings(station, averagePrice);

  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-teal-700 via-teal-600 to-sky-700 text-white shadow-glow">
      <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">Meilleur prix</Badge>
            <Badge variant={station.isOpen ? "success" : "danger"}>{station.isOpen ? "Ouverte" : "Fermee"}</Badge>
            <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
              {station.brandSource === "mock" ? "Dataset local" : "Source officielle"}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Station recommandee</p>
            <h3 className="font-display text-3xl tracking-tight">{station.name}</h3>
            <p className="mt-2 text-sm text-white/80">
              {station.address}, {station.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 text-white" variant="outline">
              {formatDistance(station.distanceKm)}
            </Badge>
            <Badge className="bg-white/10 text-white" variant="outline">
              ~ {formatDriveTime(station.estimatedDriveMinutes)}
            </Badge>
            <Badge className="bg-white/10 text-white" variant="outline">
              {station.openingHours}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(`/station/${station.id}`)} variant="secondary">
              <Eye className="h-4 w-4" />
              Voir details
            </Button>
            <Button asChild variant="accent">
              <a href={getGoogleMapsDirectionsUrl(station.lat, station.lng)} rel="noreferrer" target="_blank">
                <Navigation className="h-4 w-4" />
                Y aller
              </a>
            </Button>
            <Button onClick={() => toggleFavorite(station.id)} variant="outline">
              <Star className={`h-4 w-4 ${station.isFavorite ? "fill-current" : ""}`} />
              {station.isFavorite ? "Favorite" : "Ajouter aux favorites"}
            </Button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm text-white/70">{selectedFuel}</p>
          <div className="font-display text-4xl tracking-tight">{formatPrice(station.selectedFuelPrice)}</div>
          <p className="mt-3 text-sm text-white/80">
            Economie potentielle : <strong>{formatMoney(savings)}</strong> / L
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {station.services.map((service) => (
              <Badge className="bg-white/10 text-white" key={service} variant="outline">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
