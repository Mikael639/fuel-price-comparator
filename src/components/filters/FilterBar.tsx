import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FuelType, ServiceType, SortMode } from "@/types/station";
import { sortModeCopy } from "@/utils/format";

interface FilterBarProps {
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  sortMode: SortMode;
  fillVolumeLiters: number;
  consumptionLitersPer100Km: number;
  favoriteAlertPrice: number | null;
  fuelOptions: readonly FuelType[];
  serviceOptions: readonly ServiceType[];
  onSelectedFuelChange: (value: FuelType) => void;
  onRadiusKmChange: (value: number) => void;
  onOpenOnlyChange: (value: boolean) => void;
  onSelectedServicesChange: (value: ServiceType[]) => void;
  onSortModeChange: (value: SortMode) => void;
  onFillVolumeLitersChange: (value: number) => void;
  onConsumptionLitersPer100KmChange: (value: number) => void;
  onFavoriteAlertPriceChange: (value: number | null) => void;
}

export const FilterBar = ({
  selectedFuel,
  radiusKm,
  openOnly,
  selectedServices,
  sortMode,
  fillVolumeLiters,
  consumptionLitersPer100Km,
  favoriteAlertPrice,
  fuelOptions,
  serviceOptions,
  onSelectedFuelChange,
  onRadiusKmChange,
  onOpenOnlyChange,
  onSelectedServicesChange,
  onSortModeChange,
  onFillVolumeLitersChange,
  onConsumptionLitersPer100KmChange,
  onFavoriteAlertPriceChange,
}: FilterBarProps) => {
  return (
    <Card className="glass-panel border-emerald-500/10">
      <CardContent className="space-y-6 p-5 md:p-6">
        <div className="space-y-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Choix du carburant</p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {fuelOptions.map((fuel) => (
              <button
                className={cn(
                  "relative min-h-11 overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-300 sm:px-5",
                  selectedFuel === fuel
                    ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 sm:scale-105"
                    : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                )}
                key={fuel}
                onClick={() => onSelectedFuelChange(fuel)}
                type="button"
              >
                {fuel}
                {selectedFuel === fuel ? (
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-center">
          <div className="space-y-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-900/50">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>Perimetre de recherche</span>
              <span className="text-primary">{radiusKm} km</span>
            </div>
            <Slider
              className="py-2"
              max={50}
              min={2}
              onValueChange={([value]) => onRadiusKmChange(value)}
              step={1}
              value={[radiusKm]}
            />
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Mode de tri</p>
            <Select
              className="rounded-xl border-border bg-card/50 font-semibold"
              onValueChange={onSortModeChange}
              options={Object.entries(sortModeCopy).map(([value, label]) => ({
                value: value as SortMode,
                label: value === "smartFill" ? `Plein malin - ${label}` : label,
              }))}
              value={sortMode}
            />
          </div>

          <label className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card/50 px-4 py-4 text-sm font-bold transition-all hover:bg-muted/50 lg:h-full lg:w-auto lg:justify-start lg:px-5">
            <Switch checked={openOnly} onCheckedChange={onOpenOnlyChange} />
            <span className="transition-colors group-hover:text-primary">Ouvertes uniquement</span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Volume du plein</p>
            <Input
              min={5}
              onChange={(event) => onFillVolumeLitersChange(Math.max(5, Number(event.target.value) || 0))}
              type="number"
              value={fillVolumeLiters}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Consommation</p>
            <Input
              min={1}
              onChange={(event) => onConsumptionLitersPer100KmChange(Math.max(1, Number(event.target.value) || 0))}
              step="0.1"
              type="number"
              value={consumptionLitersPer100Km}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Seuil favoris</p>
            <Input
              min={0}
              onChange={(event) =>
                onFavoriteAlertPriceChange(event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0))
              }
              step="0.001"
              type="number"
              value={favoriteAlertPrice ?? ""}
            />
          </div>
        </div>

        {serviceOptions.length > 0 ? (
          <div className="space-y-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-primary/80">Services additionnels</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {serviceOptions.map((service) => {
                const active = selectedServices.includes(service);
                return (
                  <button
                    className={cn(
                      "min-h-10 rounded-lg border px-3 py-2 text-xs font-bold transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card/30 text-muted-foreground hover:bg-muted/50",
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
        ) : null}
      </CardContent>
    </Card>
  );
};
