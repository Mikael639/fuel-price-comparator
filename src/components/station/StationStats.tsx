import { ChartSpline, Fuel, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, formatPrice } from "@/utils/format";

interface StationStatsProps {
  stationCount: number;
  comparableCount: number;
  averagePrice: number | null;
  maxSavings: number | null;
}

const cards = [
  { title: "Stations trouvees", icon: Fuel, key: "count" },
  { title: "Prix moyen local", icon: ChartSpline, key: "average" },
  { title: "Economie maximale", icon: PiggyBank, key: "savings" },
] as const;

export const StationStats = ({ stationCount, comparableCount, averagePrice, maxSavings }: StationStatsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <div className="font-display text-2xl tracking-tight">
                  {card.key === "count"
                    ? stationCount
                    : card.key === "average"
                      ? formatPrice(averagePrice)
                      : formatMoney(maxSavings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.key === "count"
                    ? `${comparableCount} comparables pour le carburant choisi`
                    : card.key === "average"
                      ? "Calcule sur les stations visibles"
                      : "Par litre face au prix moyen local"}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
