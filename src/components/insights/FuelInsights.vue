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
import type { Coordinates, FuelType, StationWithMetrics } from "@/types/station";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const props = defineProps<{
  stations: StationWithMetrics[];
  selectedFuel: FuelType;
  mode?: "all" | "local" | "europe";
  userPosition?: Coordinates | null;
  radiusKm?: number;
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

const localWeeklyTrend = computed(() =>
  stationService.getAreaWeeklyFuelTrend(props.stations, props.selectedFuel, {
    fallbackPosition: props.userPosition ?? null,
    fallbackRadiusKm: props.radiusKm,
  }),
);
const localTrendDirection = computed(() => stationService.getPriceTrendFromSeries(localWeeklyTrend.value.prices));
const localComparator = computed(() => stationService.getDieselEssenceComparator(props.stations));
const localFuelComparison = computed(() => stationService.getAreaFuelComparison(props.stations));
const localBrandComparison = computed(() => stationService.getAreaBrandComparison(props.stations, props.selectedFuel));
const hasWeeklyTrendData = computed(
  () => localWeeklyTrend.value.seriesCount > 0 && localWeeklyTrend.value.prices.length > 1,
);
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
const europeAllMarketsChartData = computed<ChartData<"bar">>(() => ({
  labels: europeMarkets.value.map(m => m.name),
  datasets: [
    {
      label: "Diesel",
      data: europeMarkets.value.map(m => m.snapshots.at(-1)?.prices.Diesel ?? null),
      backgroundColor: "#0f766e",
      borderRadius: 6,
    },
    {
      label: "SP95",
      data: europeMarkets.value.map(m => m.snapshots.at(-1)?.prices.SP95 ?? null),
      backgroundColor: "#ffb703",
      borderRadius: 6,
    }
  ]
}));

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

const brandComparisonChartData = computed<ChartData<"bar">>(() => ({
  labels: localBrandComparison.value.map((item) => item.brand),
  datasets: [
    {
      label: `Prix moyen (${props.selectedFuel})`,
      data: localBrandComparison.value.map((item) => item.averagePrice),
      backgroundColor: ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
      borderRadius: 6,
    },
  ],
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
              :color="localWeeklyTrend.source === 'official' ? 'primary' : 'warning'"
              variant="tonal"
            >
              {{
                localWeeklyTrend.source === "official"
                  ? `${localWeeklyTrend.seriesCount} station(s) exploitees`
                  : `${localWeeklyTrend.seriesCount} station(s) mock exploitees`
              }}
            </v-chip>
          </div>

          <v-alert
            v-if="hasWeeklyTrendData && localWeeklyTrend.source === 'mock'"
            class="mb-4"
            color="warning"
            icon="mdi-database-refresh-outline"
            variant="tonal"
          >
            Historique officiel local insuffisant dans cette zone. Affichage d'une tendance 7 jours basee sur le dataset local de secours.
          </v-alert>

          <div
            v-if="hasWeeklyTrendData"
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
            Pas assez d'historique local fiable, meme avec le dataset de secours, pour afficher une tendance hebdomadaire sur 7 jours.
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

    <v-row v-if="showLocal && localBrandComparison.length > 0" class="mt-1">
      <v-col cols="12">
        <v-card class="surface-card pa-4 pa-md-5">
          <div class="mb-4">
            <p class="text-overline mb-1">Palmarès des Enseignes</p>
            <h4 class="text-h6 mb-1">Moyennes locales ({{ selectedFuel }})</h4>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Classement des enseignes les moins chères dans la zone visible.
            </p>
          </div>

          <div class="fuel-insights__chart fuel-insights__chart--compact mb-4">
            <Bar
              :data="brandComparisonChartData"
              :options="{
                ...barChartOptions,
                plugins: { legend: { display: false } },
                scales: {
                  ...barChartOptions.scales,
                  y: { min: Math.max(0, (localBrandComparison[0]?.averagePrice ?? 1) - 0.2) }
                }
              } as any"
            />
          </div>

          <div class="d-flex flex-wrap ga-2 mt-4">
            <v-chip
              v-for="(brand, i) in localBrandComparison"
              :key="brand.brand"
              :color="i === 0 ? 'success' : 'default'"
              :variant="i === 0 ? 'flat' : 'tonal'"
            >
              #{{ i + 1 }} {{ brand.brand }} ({{ formatPrice(brand.averagePrice) }})
            </v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row
      v-if="showEurope"
      class="mt-1"
    >
      <v-col cols="12" md="6">
        <v-card class="surface-card pa-4 pa-md-5 fill-height">
          <div class="mb-4">
            <p class="text-overline mb-1">Classement Europe</p>
            <h4 class="text-h6 mb-1">Prix actuels au litre</h4>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Comparatif des prix du Diesel et du SP95 sur les derniers relevés européens. 
            </p>
          </div>
          
          <v-alert
            class="mb-4"
            :color="europePayload.source === 'live' ? 'success' : 'info'"
            variant="tonal"
          >
            {{ europePayload.sourceLabel }}<span v-if="europePayload.updatedAt"> • mis a jour {{ formatDateTime(europePayload.updatedAt) }}</span>
          </v-alert>

          <div
            v-if="isLoadingEurope"
            class="fuel-insights__chart"
          >
            <v-skeleton-loader type="image" />
          </div>
          <div
            v-else
            class="fuel-insights__chart"
          >
            <Bar
              :data="europeAllMarketsChartData"
              :options="{
                ...barChartOptions, 
                plugins: { legend: { display: true, position: 'bottom' } },
              } as ChartOptions<'bar'>"
            />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="surface-card pa-4 pa-md-5 fill-height">
          <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center ga-3 mb-4">
            <div>
              <p class="text-overline mb-1">Focus Pays</p>
              <h4 class="text-h6 mb-1">Tendance {{ selectedMarket.name }}</h4>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Lecture sur 7 points hebdomadaires pour un pays spécifique.
              </p>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip color="secondary" variant="tonal">
                {{ selectedMarket.currency }}
              </v-chip>
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

          <div class="fuel-insights__market-summary mb-4">
            <div class="fuel-insights__comparison-row">
              <span>Diesel moyen ({{ selectedMarket.code }})</span>
              <strong>{{ formatPrice(europeComparator.dieselAverage) }}</strong>
            </div>
            <div class="fuel-insights__comparison-row">
              <span>Essence moyenne ({{ selectedMarket.code }})</span>
              <strong>{{ formatPrice(europeComparator.gasolineAverage) }}</strong>
            </div>
          </div>

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
