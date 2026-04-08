import { Eye, Navigation, Star, TrendingDown, PiggyBank, MapPin, Clock, TrendingUp, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NavigationMenu } from "@/components/station/NavigationMenu";
import { PriceFeedbackPanel } from "@/components/station/PriceFeedbackPanel";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { formatDistance, formatDriveTime, formatMoney, formatPrice, formatFreshness } from "@/utils/format";

import type { FuelType, StationWithMetrics } from "@/types/station";

interface BestStationCardProps {
  station: StationWithMetrics;
  selectedFuel: FuelType;
  averagePrice: number | null;
}

export const BestStationCard = ({ station, selectedFuel, averagePrice }: BestStationCardProps) => {
  const navigate = useNavigate();
  const toggleFavorite = useFuelStationsStore((state) => state.toggleFavorite);
  const consumption = useFuelStationsStore((state) => state.consumptionLitersPer100Km);
  const fillVolume = useFuelStationsStore((state) => state.fillVolumeLiters);
  
  const savings = stationService.getStationSavings(station, averagePrice);
  const netSavings = stationService.getStationNetSavingsForFill(station, averagePrice, fillVolume, consumption);

  const freshness = formatFreshness(station.priceUpdatedAt?.[selectedFuel] ?? station.lastUpdatedAt);

  const trendMap = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };

  const colorMap = {
    up: "text-red-400",
    down: "text-emerald-400",
    stable: "text-white/40",
  };

  const TrendIcon = trendMap[station.priceTrend as keyof typeof trendMap] || Minus;
  const trendColor = colorMap[station.priceTrend as keyof typeof colorMap] || "text-white/40";

  return (
    <Card className="relative overflow-hidden border-none bg-slate-950 text-white shadow-2xl shadow-emerald-900/20">
      {/* Premium Background Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
      
      <CardContent className="relative grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_18rem] md:p-8">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent" className="border-none bg-amber-400 px-3 py-1 font-bold text-slate-900 sm:scale-110 sm:origin-left">
              RECOMMANDEE
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
              {station.isOpen ? "Ouverte" : "Fermee"}
            </Badge>
            {netSavings && netSavings > 0 && (
              <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                PLEIN MALIN
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[.3em] text-emerald-400/80">Option la plus rentable</p>
              <h3 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">{station.name}</h3>
              <p className="text-sm text-white/60 flex items-center gap-2 mt-2">
                <MapPin className="h-3.5 w-3.5" />
                {station.address}, {station.city}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/40 font-medium">
                <Clock className="h-3 w-3" />
                {freshness}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest text-white/50 sm:gap-4">
             <div className="flex items-center gap-2">
               <span className="text-emerald-400 font-black">
                 {station.isRouteDetour
                   ? `${station.hasAccurateRouteDetour ? "Detour reel" : "Detour estime"} ${formatDistance(station.distanceKm)}`
                   : formatDistance(station.distanceKm)}
               </span>
               <span>-</span>
               <span>~{formatDriveTime(station.estimatedDriveMinutes)}</span>
             </div>
             <div className="flex items-center gap-2 border-l border-white/10 pl-4">
               <span>{station.openingHours}</span>
             </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button 
                onClick={() => navigate(`/station/${station.id}`)} 
                variant="secondary"
                className="h-12 w-full rounded-xl border-white/10 bg-white/10 px-6 text-white hover:bg-white/20 sm:w-auto"
              >
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Button>
              <Button 
                aria-label={station.isFavorite ? "Retirer des favorites" : "Ajouter aux favorites"}
                onClick={() => toggleFavorite(station.id)} 
                variant="ghost"
                className="h-12 w-full rounded-xl p-0 text-white hover:bg-white/10 sm:w-12"
              >
                <Star className={`h-5 w-5 ${station.isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
              </Button>
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] px-1">Navigation GPS</p>
              <NavigationMenu className="w-full" lat={station.lat} lng={station.lng} tone="inverse" />
            </div>

            <PriceFeedbackPanel
              className="border-white/10 bg-white/5 text-white dark:bg-white/5"
              compact
              displayedPrice={station.selectedFuelPrice}
              eagerSummary
              fuel={selectedFuel}
              stationId={station.id}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:rounded-[28px] sm:p-6">
          <div className="space-y-0.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">{selectedFuel}</p>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tracking-tighter">{formatPrice(station.selectedFuelPrice)}</span>
              <span className="text-sm text-white/40">/L</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Economie</p>
                <p className="text-lg font-bold">-{formatMoney(savings)}<span className="text-xs font-normal text-white/40 ml-1">/ L</span></p>
              </div>
            </div>

            {netSavings && netSavings > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-900 border border-amber-300/20">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Gain net estime</p>
                  <p className="text-xl font-display font-bold text-amber-400">+{formatMoney(netSavings)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2">
            {station.services.slice(0, 4).map((service) => (
              <Badge key={service} className="bg-white/5 text-white/60 border-none text-[9px] px-2" variant="outline">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

