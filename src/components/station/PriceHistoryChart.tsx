import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { stationService } from "@/services/stationService";
import { formatDateLabel, trendCopy } from "@/utils/format";
import type { FuelStation, FuelType } from "@/types/station";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface PriceHistoryChartProps {
  station: FuelStation;
  fuel: FuelType;
}

export const PriceHistoryChart = ({ station, fuel }: PriceHistoryChartProps) => {
  const history = station.priceHistory[fuel] ?? [];
  const trend = stationService.getTrend(station, fuel);

  const chartData: ChartData<"line"> = {
    labels: history.map((point) => formatDateLabel(point.date)),
    datasets: [
      {
        label: fuel,
        data: history.map((point) => point.price),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15,118,110,0.12)",
        fill: true,
        borderWidth: 3,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Historique officiel</p>
            <h3 className="font-display text-xl tracking-tight">Evolution du prix {fuel}</h3>
            <p className="text-sm text-muted-foreground">
              {history.length} releve(s) disponible(s) • Tendance : {trendCopy[trend]}
            </p>
          </div>
          <Badge variant={trend === "down" ? "success" : trend === "up" ? "warning" : "secondary"}>
            {trendCopy[trend]}
          </Badge>
        </div>

        {history.length > 0 ? (
          <div className="h-72">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="rounded-[20px] bg-muted p-4 text-sm text-muted-foreground">
            Aucun historique disponible pour ce carburant.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
