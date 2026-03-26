<script setup lang="ts">
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
import { computed } from "vue";
import { Line } from "vue-chartjs";
import { stationService } from "@/services/stationService";
import { formatDateLabel, trendCopy } from "@/utils/format";
import type { FuelStation, FuelType } from "@/types/station";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const props = defineProps<{
  station: FuelStation;
  fuel: FuelType;
}>();

const history = computed(() => props.station.priceHistory[props.fuel] ?? []);
const trend = computed(() => stationService.getTrend(props.station, props.fuel));

const paddedHistory = computed(() => {
  if (history.value.length === 0) return [];
  
  const sorted = [...history.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  return days.map(dayStr => {
    const dayEnd = new Date(`${dayStr}T23:59:59.999Z`).getTime();
    
    let currentPrice = sorted[0].price;
    for (const point of sorted) {
      if (new Date(point.date).getTime() <= dayEnd) {
        currentPrice = point.price;
      }
    }
    
    return {
      date: `${dayStr}T12:00:00Z`,
      price: currentPrice
    };
  });
});

const chartData = computed<ChartData<"line">>(() => ({
  labels: paddedHistory.value.map((point) => formatDateLabel(point.date)),
  datasets: [
    {
      label: props.fuel,
      data: paddedHistory.value.map((point) => point.price),
      borderColor: "#0f766e",
      backgroundColor: "rgba(15, 118, 110, 0.12)",
      fill: true,
      borderWidth: 3,
      tension: 0.1,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
  ],
}));

const chartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (value) => `${Number(value).toFixed(3)} €/L`,
      },
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
}));
</script>

<template>
  <v-card class="surface-card pa-4 pa-md-5">
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3 mb-5">
      <div>
        <p class="text-overline mb-1">Historique officiel</p>
        <h3 class="text-h6 section-title mb-1">Evolution du prix {{ fuel }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ history.length }} releve(s) disponible(s) - Tendance : {{ trendCopy[trend] }}
        </p>
      </div>
      <v-chip
        :color="trend === 'down' ? 'success' : trend === 'up' ? 'warning' : 'info'"
        variant="tonal"
      >
        {{ trendCopy[trend] }}
      </v-chip>
    </div>

    <div
      v-if="history.length > 0"
      class="history-chart"
    >
      <Line
        :data="chartData"
        :options="chartOptions"
      />
    </div>

    <v-alert
      v-else
      color="info"
      variant="tonal"
    >
      Aucun historique disponible pour ce carburant.
    </v-alert>
  </v-card>
</template>

<style scoped>
.history-chart {
  height: 18rem;
}
</style>
