import { Eye, MapPin, Navigation, PiggyBank, Star, TrendingDown, TrendingUp, Minus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NavigationMenu } from "@/components/station/NavigationMenu";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { formatDistance, formatDriveTime, formatMoney, formatPrice, formatFreshness } from "@/utils/format";

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
  const consumption = useFuelStationsStore((state) => state.consumptionLitersPer100Km);
  const fillVolume = useFuelStationsStore((state) => state.fillVolumeLiters);
  
  const savings = stationService.getStationSavings(station, averagePrice);
  const netSavings = stationService.getStationNetSavingsForFill(station, averagePrice, fillVolume, consumption);

  const freshness = formatFreshness(station.priceUpdatedAt?.[selectedFuel] ?? station.lastUpdatedAt);
  
  const isStale = (date: string | null | undefined) => {
    if (!date) return true;
    return Date.now() - new Date(date).getTime() > 48 * 60 * 60 * 1000;
  };

  const stale = isStale(station.priceUpdatedAt?.[selectedFuel] ?? station.lastUpdatedAt);

  const trendMap = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };

  const colorMap = {
    up: "text-red-500",
    down: "text-emerald-500",
    stable: "text-slate-400",
  };

  const TrendIcon = trendMap[station.priceTrend as keyof typeof trendMap] || Minus;
  const trendColor = colorMap[station.priceTrend as keyof typeof colorMap] || "text-slate-400";

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 glass-panel border-emerald-500/10">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap gap-2">
              {isBest && (
                <Badge variant="accent" className="animate-pulse-subtle bg-emerald-500 text-white border-none">
                  MEILLEUR PRIX
                </Badge>
              )}
              {netSavings && netSavings > 0 && (
                <Badge variant="success" className="bg-amber-400 text-slate-900 border-none font-bold">
                  PLEIN MALIN
                </Badge>
              )}
              <Badge variant={station.isOpen ? "success" : "danger"} className={station.isOpen ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""}>
                {station.isOpen ? "Ouverte" : "Fermee"}
              </Badge>
              {stale && (
                <Badge variant="warning" className="animate-pulse-subtle">
                  PRIX ANCIEN ({">"}48H)
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-display text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">
                  {station.name}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                   {station.address} - {station.city}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground/80 font-medium">
                  <Clock className="h-3 w-3" />
                  {freshness}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <button 
              onClick={() => toggleFavorite(station.id)} 
              className="p-2 -mr-2 rounded-full hover:bg-primary/10 transition-colors"
              type="button"
            >
              <Star className={`h-5 w-5 ${station.isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`} />
            </button>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">{selectedFuel}</p>
              <div className="flex items-center justify-end gap-2">
                 <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                 <div className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {formatPrice(station.selectedFuelPrice)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900/50 p-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="font-semibold">{formatDistance(station.distanceKm)}</span>
          </div>
          
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900/50 p-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm text-primary">
              <Navigation className="h-4 w-4" />
            </div>
            <span className="font-semibold">{formatDriveTime(station.estimatedDriveMinutes)}</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-primary/5 dark:bg-emerald-500/10 p-2 text-sm col-span-2 lg:col-span-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-primary block leading-none">-{formatMoney(savings)}</span>
              <span className="text-[10px] text-primary/70 uppercase font-bold">par litre</span>
            </div>
          </div>
        </div>

        {netSavings && netSavings > 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-900">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none mb-1">Gain net estime</p>
              <p className="text-lg font-display font-bold text-slate-900 dark:text-white">+{formatMoney(netSavings)} <span className="text-sm font-normal text-muted-foreground">sur un plein de {fillVolume}L</span></p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 pt-2">
           <div className="flex flex-col gap-3 sm:flex-row">
              <Button 
                variant="tonal" 
                className="h-11 w-full flex-1 rounded-xl"
                onClick={() => navigate(`/station/${station.id}`)} 
              >
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Button>
              
              <Button 
                variant="tonal" 
                className={`h-11 w-full flex-1 rounded-xl ${useFuelStationsStore((state) => state.confirmedStationIds).includes(station.id) ? "bg-emerald-500/20 text-emerald-600 cursor-default" : ""}`}
                disabled={useFuelStationsStore((state) => state.confirmedStationIds).includes(station.id)}
                onClick={() => useFuelStationsStore.getState().confirmStationPrice(station.id)}
              >
                {useFuelStationsStore((state) => state.confirmedStationIds).includes(station.id) ? "Prix confirme" : "Confirmer prix"}
              </Button>
           </div>
           
           <div className="space-y-2">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">GPS Navigation</p>
             <NavigationMenu className="w-full" lat={station.lat} lng={station.lng} />
           </div>
        </div>
      </CardContent>
    </Card>
  );
};

