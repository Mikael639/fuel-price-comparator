import { ChartSpline, Fuel, PiggyBank, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatFreshness, formatMoney, formatPrice } from "@/utils/format";

interface StationStatsProps {
  stationCount: number;
  comparableCount: number;
  averagePrice: number | null;
  maxSavings: number | null;
  maxNetSavings: number | null;
  freshestPriceUpdate: string | null;
  staleCount: number;
  isRouteMode?: boolean;
}

export const StationStats = ({
  stationCount,
  comparableCount,
  averagePrice,
  maxSavings,
  maxNetSavings,
  freshestPriceUpdate,
  staleCount,
  isRouteMode = false,
}: StationStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <Card className="glass-panel border-none bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-12 sm:w-12">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Stations</p>
            <div className="font-display text-xl font-bold tracking-tight sm:text-2xl">{stationCount}</div>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">{comparableCount} avec prix live</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-none bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 sm:h-12 sm:w-12">
            <ChartSpline className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Prix moyen</p>
            <div className="font-display text-xl font-bold tracking-tight sm:text-2xl">{formatPrice(averagePrice)}</div>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              {freshestPriceUpdate ? `Maj ${formatFreshness(freshestPriceUpdate)}` : "Sur la selection courante"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 sm:h-12 sm:w-12">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/60 dark:text-emerald-400/60">
              Economie max
            </p>
            <div className="font-display text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-2xl">
              {formatMoney(maxSavings)}
            </div>
            <p className="mt-1 text-[10px] font-medium text-emerald-600/60 dark:text-emerald-400/60">
              Par litre economise
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border border-amber-400/20 bg-amber-400/5 dark:bg-amber-400/10">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 sm:h-12 sm:w-12">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600/60 dark:text-amber-400/60">
              {isRouteMode ? "Gain trajet" : "Gain net"}
            </p>
            <div className="font-display text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 sm:text-2xl">
              {maxNetSavings != null ? `+${formatMoney(maxNetSavings)}` : "--"}
            </div>
            <p className="mt-1 text-[10px] font-medium text-amber-600/60 dark:text-amber-400/60">
              {staleCount > 0 ? `${staleCount} prix anciens` : "Plein malin optimise"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
