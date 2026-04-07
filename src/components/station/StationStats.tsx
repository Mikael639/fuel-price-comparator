import { ChartSpline, Fuel, PiggyBank, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, formatPrice } from "@/utils/format";

interface StationStatsProps {
  stationCount: number;
  comparableCount: number;
  averagePrice: number | null;
  maxSavings: number | null;
  maxNetSavings: number | null;
}

export const StationStats = ({ 
  stationCount, 
  comparableCount, 
  averagePrice, 
  maxSavings,
  maxNetSavings 
}: StationStatsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="glass-panel border-none bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">Stations</p>
            <div className="font-display text-2xl font-bold tracking-tight">
              {stationCount}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              {comparableCount} avec prix live
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-none bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <ChartSpline className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">Prix Moyen</p>
            <div className="font-display text-2xl font-bold tracking-tight">
              {formatPrice(averagePrice)}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              Sur zone courante
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-none bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/60 dark:text-emerald-400/60 leading-none mb-1">Économie Max</p>
            <div className="font-display text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMoney(maxSavings)}
            </div>
            <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 font-medium mt-1">
              Par litre économisé
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-none bg-amber-400/5 dark:bg-amber-400/10 border border-amber-400/20">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600/60 dark:text-amber-400/60 leading-none mb-1">Gain Itinéraire</p>
            <div className="font-display text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {maxNetSavings != null ? `+${formatMoney(maxNetSavings)}` : "--"}
            </div>
            <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 font-medium mt-1">
              Plein malin optimisé
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
