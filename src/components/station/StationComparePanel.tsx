import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDriveTime, formatPrice } from "@/utils/format";
import { FUEL_TYPES, type FuelType, type StationWithMetrics } from "@/types/station";

interface StationComparePanelProps {
  stations: StationWithMetrics[];
  selectedFuel: FuelType;
  onRemove: (stationId: string) => void;
  onClear: () => void;
}

export const StationComparePanel = ({ stations, selectedFuel, onRemove, onClear }: StationComparePanelProps) => {
  if (stations.length === 0) return null;

  const sharedFuels = FUEL_TYPES.filter((fuel) =>
    stations.every((s) => s.fuelPrices[fuel] != null),
  );

  const cheapest = stations.reduce<StationWithMetrics | null>((best, s) => {
    if (s.selectedFuelPrice == null) return best;
    if (!best || (best.selectedFuelPrice ?? Infinity) > s.selectedFuelPrice) return s;
    return best;
  }, null);

  return (
    <div
      aria-label="Panneau de comparaison de stations"
      className="fixed bottom-4 inset-x-4 z-[600] rounded-[24px] border border-white/40 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/95 md:inset-x-auto md:right-4 md:left-auto md:w-[48rem]"
      role="region"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 dark:text-white">Comparaison</span>
          <Badge variant="secondary">{stations.length} station{stations.length > 1 ? "s" : ""}</Badge>
          {stations.length < 3 && (
            <span className="text-xs text-slate-400">Sélectionnez jusqu'à 3 stations</span>
          )}
        </div>
        <Button onClick={onClear} size="icon" variant="ghost" className="h-7 w-7 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="py-2 pl-4 pr-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Critère
              </th>
              {stations.map((s) => (
                <th key={s.id} className="min-w-[9rem] px-3 py-2 text-left">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="truncate font-bold text-slate-800 dark:text-white" title={s.name}>
                        {s.name}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">{s.city}</p>
                    </div>
                    <button
                      aria-label={`Retirer ${s.name} de la comparaison`}
                      className="mt-0.5 shrink-0 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200"
                      onClick={() => onRemove(s.id)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-slate-50 dark:border-slate-800/60">
              <td className="py-2 pl-4 pr-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {selectedFuel}
              </td>
              {stations.map((s) => (
                <td key={s.id} className="px-3 py-2">
                  <span
                    className={`font-display text-base font-bold ${
                      s.id === cheapest?.id ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-white"
                    }`}
                  >
                    {formatPrice(s.selectedFuelPrice)}
                  </span>
                  {s.id === cheapest?.id && (
                    <Badge variant="success" className="ml-1.5 text-[9px]">
                      Moins cher
                    </Badge>
                  )}
                </td>
              ))}
            </tr>

            {sharedFuels
              .filter((f) => f !== selectedFuel)
              .map((fuel) => (
                <tr key={fuel} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-2 pl-4 pr-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {fuel}
                  </td>
                  {stations.map((s) => (
                    <td key={s.id} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
                      {formatPrice(s.fuelPrices[fuel])}
                    </td>
                  ))}
                </tr>
              ))}

            <tr className="border-b border-slate-50 dark:border-slate-800/60">
              <td className="py-2 pl-4 pr-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Distance
              </td>
              {stations.map((s) => (
                <td key={s.id} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {formatDistance(s.distanceKm)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-2 pl-4 pr-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Temps
              </td>
              {stations.map((s) => (
                <td key={s.id} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  ~{formatDriveTime(s.estimatedDriveMinutes)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
