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
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Filtres</p>
          <div className="flex flex-wrap gap-2">
            {fuelOptions.map((fuel) => (
              <button
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  selectedFuel === fuel
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "border-border bg-card hover:bg-muted",
                )}
                key={fuel}
                onClick={() => onSelectedFuelChange(fuel)}
                type="button"
              >
                {fuel}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Rayon de recherche</span>
              <strong>{radiusKm} km</strong>
            </div>
            <Slider max={25} min={2} onValueChange={([value]) => onRadiusKmChange(value)} step={1} value={[radiusKm]} />
          </div>

          <Select
            onValueChange={onSortModeChange}
            options={Object.entries(sortModeCopy).map(([value, label]) => ({
              value: value as SortMode,
              label,
            }))}
            value={sortMode}
          />

          <label className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium">
            <Switch checked={openOnly} onCheckedChange={onOpenOnlyChange} />
            Stations ouvertes uniquement
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Services souhaites</p>
          <div className="flex flex-wrap gap-2">
            {serviceOptions.map((service) => {
              const active = selectedServices.includes(service);
              return (
                <button
                  className="rounded-full"
                  key={service}
                  onClick={() =>
                    onSelectedServicesChange(
                      active ? selectedServices.filter((item) => item !== service) : [...selectedServices, service],
                    )
                  }
                  type="button"
                >
                  <Badge variant={active ? "accent" : "outline"}>{service}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
