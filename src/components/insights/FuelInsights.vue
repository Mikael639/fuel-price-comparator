<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { computed, onMounted, ref } from "vue";
import { Bar, Line } from "vue-chartjs";
import {
  europeFuelMarkets,
  type EuropeFuelMarket,
  type EuropeFuelMarketsPayload,
} from "@/data/europeFuelSnapshots";
import { europeFuelService } from "@/services/europeFuelService";
import { stationService } from "@/services/stationService";
import { formatDateLabel, formatDateTime, formatMoney, formatPrice, trendCopy } from "@/utils/format";
import type { FuelType, StationWithMetrics } from "@/types/station";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const props = defineProps<{
  stations: StationWithMetrics[];
  selectedFuel: FuelType;
  mode?: "all" | "local" | "europe";
}>();

const selectedCountryCode = ref("FR");
const europePayload = ref<EuropeFuelMarketsPayload>({
  markets: europeFuelMarkets,
  source: "fallback",
  updatedAt: europeFuelMarkets[0]?.snapshots.at(-1)?.date ?? null,
  sourceLabel: "Snapshots locaux integres",
});
const isLoadingEurope = ref(false);

const showLocal = computed(() => props.mode !== "europe");
const showEurope = computed(() => props.mode !== "local");
const europeMarkets = computed<EuropeFuelMarket[]>(() => europePayload.value.markets);

const localWeeklyTrend = computed(() => stationService.getAreaWeeklyFuelTrend(props.stations, props.selectedFuel));
const localTrendDirection = computed(() => stationService.getPriceTrendFromSeries(localWeeklyTrend.value.prices));
const localComparator = computed(() => stationService.getDieselEssenceComparator(props.stations));
const localFuelComparison = computed(() => stationService.getAreaFuelComparison(props.stations));
const selectedMarket = computed(
  () => europeMarkets.value.find((market) => market.code === selectedCountryCode.value) ?? europeMarkets.value[0]!,
);
const europeComparator = computed(() => stationService.getEuropeDieselEssenceComparator(selectedMarket.value));

const localDelta = computed(() => {
  if (localWeeklyTrend.value.prices.length < 2) {
    return null;
  }

  const first = localWeeklyTrend.value.prices[0] ?? 0;
  const last = localWeeklyTrend.value.prices[localWeeklyTrend.value.prices.length - 1] ?? first;
  return last - first;
});

const localCheapestFuel = computed(
  () =>
    localFuelComparison.value
      .filter((entry) => entry.averagePrice != null)
      .sort(
        (left, right) =>
          (left.averagePrice ?? Number.POSITIVE_INFINITY) - (right.averagePrice ?? Number.POSITIVE_INFINITY),
      )[0] ?? null,
);

const europeSeriesLabels = computed(() => selectedMarket.value.snapshots.map((snapshot) => snapshot.date));
const europeSeriesChartData = computed<ChartData<"line">>(() => ({
  labels: europeSeriesLabels.value.map((label) => formatDateLabel(label)),
  datasets: [
    {
      label: "Diesel",
      data: selectedMarket.value.snapshots.map((snapshot) => snapshot.prices.Diesel ?? null),
      borderColor: "#0f766e",
      backgroundColor: "rgba(15, 118, 110, 0.08)",
      tension: 0.28,
      pointRadius: 3,
    },
    {
      label: "SP95",
      data: selectedMarket.value.snapshots.map((snapshot) => snapshot.prices.SP95 ?? null),
      borderColor: "#ffb703",
      backgroundColor: "rgba(255, 183, 3, 0.08)",
      tension: 0.28,
      pointRadius: 3,
    },
  ],
}));

const lineChartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "bottom",
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (value) => `${value} EUR/L`,
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

const localTrendChartData = computed<ChartData<"line">>(() => ({
  labels: localWeeklyTrend.value.labels.map((label) => formatDateLabel(label)),
  datasets: [
    {
      label: props.selectedFuel,
      data: localWeeklyTrend.value.prices,
      borderColor: "#0f766e",
      backgroundColor: "rgba(15, 118, 110, 0.14)",
      fill: true,
      borderWidth: 3,
      tension: 0.32,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
  ],
}));

const fuelComparisonChartData = computed<ChartData<"bar">>(() => ({
  labels: localFuelComparison.value.map((item) => item.fuel),
  datasets: [
    {
      label: "Prix moyen local",
      data: localFuelComparison.value.map((item) => item.averagePrice),
      backgroundColor: ["#0f766e", "#0891b2", "#ffb703", "#84cc16", "#f97316"],
      borderRadius: 10,
    },
  ],
}));

const barChartOptions = computed<ChartOptions<"bar">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      ticks: {
        callback: (value) => `${value} EUR/L`,
      },
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
    },
    x: {
      grid: { display: false },
    },
  },
}));

const loadEuropeMarkets = async () => {
  if (!showEurope.value) {
    return;
  }

  isLoadingEurope.value = true;

  try {
    europePayload.value = await europeFuelService.getMarkets();
  } finally {
    isLoadingEurope.value = false;
  }
};

onMounted(() => {
  void loadEuropeMarkets();
});
</script>

<template>
  <section class="fuel-insights">
    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-end ga-3 mb-4">
      <div>
        <p class="text-overline mb-1">{{ showEurope && showLocal ? "Suivi prix" : showEurope ? "Europe" : "Tendances" }}</p>
        <h3 class="text-h5 section-title mb-1">
          {{ showEurope && showLocal ? "Marche carburants" : showEurope ? "Panorama europeen" : "Marche local" }}
        </h3>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{
            showEurope && showLocal
              ? "Lecture locale sur 7 jours, comparaison Diesel / Essence et ouverture progressive vers l'Europe."
              : showEurope
                ? "Lecture comparee de plusieurs pays europeens avec fallback local si la source live est indisponible."
                : "Lecture locale sur 7 jours avec comparaison Diesel / Essence et panorama multi-carburants."
          }}
        </p>
      </div>

      <v-chip
        color="accent"
        prepend-icon="mdi-chart-line"
        variant="tonal"
      >
        {{ showEurope && !showLocal ? "Vue Europe" : "Analyse et comparaisons" }}
      </v-chip>
    </div>

    <v-row
      v-if="showLocal"
      class="mb-2"
    >
      <v-col
        cols="12"
        md="4"
      >
        <v-card class="surface-card pa-4 fuel-insights__metric-card">
          <p class="text-overline mb-1">Prix local actuel</p>
          <h4 class="text-h6 mb-2">{{ selectedFuel }}</h4>
          <div class="fuel-insights__metric-value mb-1">
            {{ formatPrice(localWeeklyTrend.latestPrice) }}
          </div>
          <p class="text-body-2 text-medium-emphasis mb-2">
            Ecart hebdomadaire :
            <strong>{{ formatMoney(localDelta) }}</strong>
          </p>
          <v-chip
            :color="localTrendDirection === 'down' ? 'success' : localTrendDirection === 'up' ? 'warning' : 'info'"
            variant="tonal"
          >
            {{ trendCopy[localTrendDirection] }}
          </v-chip>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="4"
      >
        <v-card class="surface-card pa-4 fuel-insights__metric-card">
          <p class="text-overline mb-1">Diesel / Essence</p>
          <h4 class="text-h6 mb-2">Comparateur local</h4>
          <div class="fuel-insights__comparison-row">
            <span>Diesel moyen</span>
            <strong>{{ formatPrice(localComparator.dieselAverage) }}</strong>
          </div>
          <div class="fuel-insights__comparison-row">
            <span>Essence moyenne</span>
            <strong>{{ formatPrice(localComparator.gasolineAverage) }}</strong>
          </div>
          <div class="fuel-insights__comparison-row">
            <span>Moins cher aujourd'hui</span>
            <strong>{{ localComparator.cheaperFuel ?? "Indisponible" }}</strong>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="showLocal">
      <v-col
        cols="12"
        md="7"
      >
        <v-card class="surface-card pa-4 pa-md-5">
          <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center ga-3 mb-4">
            <div>
              <p class="text-overline mb-1">Tendance locale</p>
              <h4 class="text-h6 mb-1">Graphique hebdomadaire</h4>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Moyenne du {{ selectedFuel }} sur les 7 derniers jours autour de la zone visible.
              </p>
            </div>
            <v-chip
              color="primary"
              variant="tonal"
            >
              {{ localWeeklyTrend.seriesCount }} station(s) exploitees
            </v-chip>
          </div>

          <div
            v-if="localWeeklyTrend.prices.length > 0"
            class="fuel-insights__chart"
          >
            <Line
              :data="localTrendChartData"
              :options="lineChartOptions"
            />
          </div>

          <v-alert
            v-else
            color="info"
            variant="tonal"
          >
            Pas assez d'historique local pour afficher le graphique hebdomadaire.
          </v-alert>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="5"
      >
        <v-card class="surface-card pa-4 pa-md-5">
          <div class="mb-4">
            <p class="text-overline mb-1">Panorama local</p>
            <h4 class="text-h6 mb-1">Comparateur multi-carburants</h4>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Vue rapide des moyennes locales pour Diesel, Essence, E85 et GPL.
            </p>
          </div>

          <div class="fuel-insights__bar-chart mb-4">
            <Bar
              :data="fuelComparisonChartData"
              :options="barChartOptions"
            />
          </div>

          <div class="d-flex flex-column ga-2">
            <div
              v-for="entry in localFuelComparison"
              :key="entry.fuel"
              class="fuel-insights__comparison-row"
            >
              <span>{{ entry.fuel }}</span>
              <strong>{{ formatPrice(entry.averagePrice) }}</strong>
            </div>
          </div>

          <v-alert
            v-if="localCheapestFuel"
            class="mt-4"
            color="success"
            icon="mdi-trophy-outline"
            variant="tonal"
          >
            Le carburant le plus bas localement est {{ localCheapestFuel.fuel }} a
            {{ formatPrice(localCheapestFuel.averagePrice) }}.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <v-row
      v-if="showEurope"
      class="mt-1"
    >
      <v-col cols="12">
        <v-card class="surface-card pa-4 pa-md-5">
          <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center ga-3 mb-4">
            <div>
              <p class="text-overline mb-1">Europe</p>
              <h4 class="text-h6 mb-1">Tendance hebdomadaire {{ selectedMarket.name }}</h4>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Lecture comparative Diesel / SP95 sur 7 points hebdomadaires pour le pays selectionne.
              </p>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip
                color="secondary"
                variant="tonal"
              >
                {{ selectedMarket.currency }}
              </v-chip>
              <v-chip
                :color="europePayload.source === 'live' ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ europePayload.source === "live" ? "Source live" : "Fallback local" }}
              </v-chip>
            </div>
          </div>

          <v-alert
            class="mb-4"
            :color="europePayload.source === 'live' ? 'success' : 'info'"
            variant="tonal"
          >
            {{ europePayload.sourceLabel }}<span v-if="europePayload.updatedAt"> • mis a jour {{ formatDateTime(europePayload.updatedAt) }}</span>
          </v-alert>

          <div class="fuel-insights__market-summary mb-4">
            <div class="fuel-insights__comparison-row">
              <span>Diesel moyen</span>
              <strong>{{ formatPrice(europeComparator.dieselAverage) }}</strong>
            </div>
            <div class="fuel-insights__comparison-row">
              <span>Essence moyenne</span>
              <strong>{{ formatPrice(europeComparator.gasolineAverage) }}</strong>
            </div>
            <div class="fuel-insights__comparison-row">
              <span>Pays selectionne</span>
              <strong>{{ selectedMarket.name }}</strong>
            </div>
          </div>

          <v-select
            class="fuel-insights__country-select mb-4"
            :items="europeMarkets"
            item-title="name"
            item-value="code"
            :model-value="selectedCountryCode"
            density="compact"
            hide-details
            variant="solo-filled"
            @update:model-value="(value) => (selectedCountryCode = String(value))"
          />

          <div
            v-if="isLoadingEurope"
            class="fuel-insights__chart fuel-insights__chart--compact"
          >
            <v-skeleton-loader type="image" />
          </div>
          <div
            v-else
            class="fuel-insights__chart fuel-insights__chart--compact"
          >
            <Line
              :data="europeSeriesChartData"
              :options="lineChartOptions"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<style scoped>
.fuel-insights__metric-card {
  height: 100%;
}

.fuel-insights__metric-value {
  font-family: var(--ff-display);
  font-size: 2rem;
  letter-spacing: -0.05em;
}

.fuel-insights__comparison-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.fuel-insights__comparison-row:last-child {
  border-bottom: 0;
}

.fuel-insights__country-select {
  width: min(100%, 11rem);
}

.fuel-insights__market-summary {
  display: grid;
  gap: 0.25rem;
}

.fuel-insights__chart {
  height: 19rem;
}

.fuel-insights__chart--compact {
  height: 16rem;
}

.fuel-insights__bar-chart {
  height: 16rem;
}

@media (max-width: 600px) {
  .fuel-insights__country-select {
    width: 100%;
  }
}
</style>
