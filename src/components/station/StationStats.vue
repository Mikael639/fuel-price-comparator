<script setup lang="ts">
import { formatMoney, formatPrice } from "@/utils/format";

defineProps<{
  stationCount: number;
  comparableCount: number;
  averagePrice: number | null;
  maxSavings: number | null;
}>();

const cards = [
  {
    title: "Stations trouvées",
    icon: "mdi-pump",
    color: "primary",
    key: "count",
  },
  {
    title: "Prix moyen local",
    icon: "mdi-chart-line",
    color: "info",
    key: "average",
  },
  {
    title: "Économie maximale",
    icon: "mdi-piggy-bank-outline",
    color: "accent",
    key: "savings",
  },
] as const;
</script>

<template>
  <v-row>
    <v-col
      v-for="card in cards"
      :key="card.key"
      cols="12"
      md="4"
    >
      <v-card class="surface-card pa-4 fill-height">
        <div class="d-flex align-center ga-3">
          <v-avatar
            :color="card.color"
            size="48"
            variant="tonal"
          >
            <v-icon :icon="card.icon" />
          </v-avatar>
          <div>
            <p class="text-body-2 mb-1">{{ card.title }}</p>
            <div
              v-if="card.key === 'count'"
              class="text-h5 font-weight-bold"
            >
              {{ stationCount }}
            </div>
            <div
              v-else-if="card.key === 'average'"
              class="text-h5 font-weight-bold"
            >
              {{ formatPrice(averagePrice) }}
            </div>
            <div
              v-else
              class="text-h5 font-weight-bold"
            >
              {{ formatMoney(maxSavings) }}
            </div>
            <p class="text-caption mb-0 text-medium-emphasis">
              {{
                card.key === "count"
                  ? `${comparableCount} comparables pour le carburant choisi`
                  : card.key === "average"
                    ? "Calculé sur les stations visibles"
                    : "Par litre face au prix moyen local"
              }}
            </p>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
