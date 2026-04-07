import { cn } from "@/lib/utils";
import { sortModeCopy } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { FuelType, ServiceType, SortMode } from "@/types/station";

interface FilterBarProps {
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  sortMode: SortMode;
  fuelOptions: readonly FuelType[];
  serviceOptions: readonly ServiceType[];
  onSelectedFuelChange: (value: FuelType) => void;
  onRadiusKmChange: (value: number) => void;
  onOpenOnlyChange: (value: boolean) => void;
  onSelectedServicesChange: (value: ServiceType[]) => void;
  onSortModeChange: (value: SortMode) => void;
}

export const FilterBar = ({
  selectedFuel,
  radiusKm,
  openOnly,
  selectedServices,
  sortMode,
  fuelOptions,
  serviceOptions,
  onSelectedFuelChange,
  onRadiusKmChange,
  onOpenOnlyChange,
  onSelectedServicesChange,
  onSortModeChange,
}: FilterBarProps) => {
  return (
    <Card className="glass-panel border-emerald-500/10">
      <CardContent className="space-y-6 p-5 md:p-6">
        <div className="space-y-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Choix du carburant</p>
          <div className="flex flex-wrap gap-2">
            {fuelOptions.map((fuel) => (
              <button
                className={cn(
                  "relative overflow-hidden rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-300",
                  selectedFuel === fuel
                    ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                    : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                )}
                key={fuel}
                onClick={() => onSelectedFuelChange(fuel)}
                type="button"
              >
                {fuel}
                {selectedFuel === fuel && (
                   <span className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-center">
          <div className="space-y-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>Périmètre de recherche</span>
              <span className="text-primary">{radiusKm} km</span>
            </div>
            <Slider 
              max={50} 
              min={2} 
              onValueChange={([value]) => onRadiusKmChange(value)} 
              step={1} 
              value={[radiusKm]} 
              className="py-2"
            />
          </div>

          <div className="space-y-2">
             <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80 px-1">Mode de tri</p>
             <Select
               onValueChange={onSortModeChange}
               options={Object.entries(sortModeCopy).map(([value, label]) => ({
                 value: value as SortMode,
                 label: value === "smartFill" ? `✨ ${label}` : label,
               }))}
               value={sortMode}
               className="rounded-xl border-border bg-card/50 font-semibold"
             />
          </div>

          <label className="flex h-full items-center gap-4 rounded-xl border border-border bg-card/50 px-5 py-4 text-sm font-bold transition-all hover:bg-muted/50 cursor-pointer group">
            <Switch checked={openOnly} onCheckedChange={onOpenOnlyChange} />
            <span className="group-hover:text-primary transition-colors">Ouvertes uniquement</span>
          </label>
        </div>

        {serviceOptions.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Services additionnels</p>
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((service) => {
                const active = selectedServices.includes(service);
                return (
                  <button
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-bold transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card/30 text-muted-foreground hover:bg-muted/50"
                    )}
                    key={service}
                    onClick={() =>
                      onSelectedServicesChange(
                        active ? selectedServices.filter((item) => item !== service) : [...selectedServices, service],
                      )
                    }
                    type="button"
                  >
                    {service}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
