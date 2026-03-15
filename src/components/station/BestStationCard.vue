<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/stores/fuelStations";
import {
  formatDistance,
  formatDriveTime,
  formatFreshness,
  formatFuelFillCost,
  formatMoney,
  formatPrice,
} from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import type { FuelType, StationWithMetrics } from "@/types/station";

const props = defineProps<{
  station: StationWithMetrics;
  selectedFuel: FuelType;
  averagePrice: number | null;
}>();

const router = useRouter();
const stationStore = useFuelStationsStore();

const savings = computed(() => stationService.getStationSavings(props.station, props.averagePrice));
const fillSavings = computed(() => stationService.getStationFillSavings(props.station, props.averagePrice, props.station.fillVolumeLiters));
const netSavings = computed(() =>
  stationService.getStationNetSavingsForFill(
    props.station,
    props.averagePrice,
    props.station.fillVolumeLiters,
    stationStore.consumptionLitersPer100Km,
  ),
);
const freshnessLabel = computed(() =>
  formatFreshness(props.station.priceUpdatedAt[props.selectedFuel] ?? props.station.lastUpdatedAt),
);

const sourceChip = computed(() => (props.station.dataOrigin === "mock" ? "Dataset local" : "Source officielle"));

const brandMeta = computed(() => {
  if (props.station.brandSource === "osm") {
    return `Enseigne enrichie via OpenStreetMap : ${props.station.brand}`;
  }

  if (props.station.brandSource === "inferred") {
    return `Enseigne estimee : ${props.station.brand}`;
  }

  if (props.station.brandSource === "not_provided") {
    return "Enseigne non communiquee dans la source officielle";
  }

  return props.station.brand;
});

const openDirections = () => {
  window.open(getGoogleMapsDirectionsUrl(props.station.lat, props.station.lng), "_blank", "noopener,noreferrer");
};
</script>

<template>
  <v-card class="best-station pa-5 pa-md-6">
    <div class="d-flex flex-column flex-md-row justify-space-between ga-5">
      <div>
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <v-chip
            color="accent"
            prepend-icon="mdi-star-circle"
            variant="flat"
          >
            Recommandation active
          </v-chip>
          <v-chip
            :color="station.isOpen ? 'success' : 'error'"
            variant="tonal"
          >
            {{ station.isOpen ? "Ouverte" : "Fermee" }}
          </v-chip>
          <v-chip
            color="white"
            variant="tonal"
          >
            {{ sourceChip }}
          </v-chip>
        </div>

        <p class="text-overline mb-2">Station recommandee</p>
        <h3 class="best-station__title mb-2">{{ station.name }}</h3>
        <p class="best-station__meta mb-2">
          {{ brandMeta }} - {{ station.address }}, {{ station.city }}
        </p>
        <p class="text-body-2 mb-4">{{ freshnessLabel }}</p>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-chip
            class="soft-chip"
            prepend-icon="mdi-map-marker-distance"
            variant="text"
          >
            {{ formatDistance(station.distanceKm) }}
          </v-chip>
          <v-chip
            class="soft-chip"
            prepend-icon="mdi-car-clock"
            variant="text"
          >
            ~ {{ formatDriveTime(station.estimatedDriveMinutes) }}
          </v-chip>
          <v-chip
            class="soft-chip"
            prepend-icon="mdi-clock-outline"
            variant="text"
          >
            {{ station.openingHours }}
          </v-chip>
        </div>

        <div class="d-flex flex-wrap ga-3">
          <v-btn
            color="secondary"
            prepend-icon="mdi-eye-outline"
            variant="tonal"
            @click="router.push({ name: 'station-detail', params: { id: station.id } })"
          >
            Voir details
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-navigation-variant-outline"
            @click="openDirections"
          >
            Y aller
          </v-btn>
          <v-btn
            :color="station.isFavorite ? 'accent' : 'white'"
            :prepend-icon="station.isFavorite ? 'mdi-star' : 'mdi-star-outline'"
            variant="tonal"
            @click="stationStore.toggleFavorite(station.id)"
          >
            {{ station.isFavorite ? "Favorite" : "Ajouter aux favorites" }}
          </v-btn>
        </div>
      </div>

      <div class="best-station__price-panel">
        <p class="text-body-2 mb-1">{{ selectedFuel }}</p>
        <div class="best-station__price mb-2">
          {{ formatPrice(station.selectedFuelPrice) }}
        </div>
        <p class="text-body-2 mb-2 text-medium-emphasis">
          Economie potentielle : <strong>{{ formatMoney(savings) }}</strong> / L
        </p>
        <p class="text-body-2 mb-2 text-medium-emphasis">
          Plein {{ station.fillVolumeLiters }}L : <strong>{{ formatFuelFillCost(station.selectedFuelPrice, station.fillVolumeLiters) }}</strong>
        </p>
        <p class="text-body-2 mb-2 text-medium-emphasis">
          Detour estime : <strong>{{ formatMoney(station.estimatedDetourCost) }}</strong>
        </p>
        <p class="text-body-2 mb-4 text-medium-emphasis">
          Gain net : <strong>{{ formatMoney(netSavings) }}</strong>
        </p>
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-chip
            v-for="service in station.services"
            :key="service"
            color="white"
            variant="flat"
          >
            {{ service }}
          </v-chip>
        </div>
        <v-alert
          color="white"
          variant="tonal"
        >
          Gain brut avant detour : <strong>{{ formatMoney(fillSavings) }}</strong>
        </v-alert>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.best-station {
  background:
    linear-gradient(135deg, rgba(15, 118, 110, 0.96), rgba(3, 105, 161, 0.92)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
  color: white;
  box-shadow: 0 20px 46px rgba(15, 118, 110, 0.28);
}

.best-station__title {
  font-family: var(--ff-display);
  font-size: clamp(1.6rem, 2vw, 2.3rem);
  line-height: 1.05;
}

.best-station__meta {
  color: rgba(255, 255, 255, 0.76);
}

.best-station__price-panel {
  min-width: min(100%, 18rem);
  padding: 1.15rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.13);
  backdrop-filter: blur(16px);
}

.best-station__price {
  font-family: var(--ff-display);
  font-size: 2rem;
  letter-spacing: -0.05em;
}
</style>
