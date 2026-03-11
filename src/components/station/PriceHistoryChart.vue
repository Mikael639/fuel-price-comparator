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

const chartData = computed<ChartData<"line">>(() => ({
  labels: history.value.map((point) => formatDateLabel(point.date)),
  datasets: [
    {
      label: props.fuel,
      data: history.value.map((point) => point.price),
      borderColor: "#0f766e",
      backgroundColor: "rgba(15, 118, 110, 0.12)",
      fill: true,
      borderWidth: 3,
      tension: 0.35,
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
        callback: (value) => `${value} €/L`,
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
        <h3 class="text-h6 section-title mb-1">Évolution du prix {{ fuel }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ history.length }} relevé(s) disponible(s) • Tendance : {{ trendCopy[trend] }}
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
