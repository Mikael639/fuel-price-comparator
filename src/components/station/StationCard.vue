<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/stores/fuelStations";
import {
  formatDistance,
  formatDriveTime,
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
  isBest?: boolean;
}>();

const router = useRouter();
const stationStore = useFuelStationsStore();

const savings = computed(() => stationService.getStationSavings(props.station, props.averagePrice));
const fillSavings = computed(() => stationService.getStationFillSavings(props.station, props.averagePrice));

const sourceChip = computed(() => (props.station.brandSource === "mock" ? "Dataset local" : "Source officielle"));

const brandMeta = computed(() => {
  if (props.station.brandSource === "osm") {
    return `Enseigne enrichie via OpenStreetMap : ${props.station.brand}`;
  }

  if (props.station.brandSource === "inferred") {
    return `Enseigne estim\u00e9e : ${props.station.brand}`;
  }

  if (props.station.brandSource === "not_provided") {
    return "Enseigne non communiqu\u00e9e";
  }

  return props.station.brand;
});

const openDirections = () => {
  window.open(getGoogleMapsDirectionsUrl(props.station.lat, props.station.lng), "_blank", "noopener,noreferrer");
};
</script>

<template>
  <v-card class="surface-card station-card pa-4 pa-md-5">
    <div class="d-flex align-start justify-space-between ga-3 mb-4">
      <div>
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <v-chip
            v-if="isBest"
            color="accent"
            size="small"
          >
            Meilleur prix
          </v-chip>
          <v-chip
            :color="station.isOpen ? 'success' : 'error'"
            size="small"
            variant="tonal"
          >
            {{ station.isOpen ? "Ouverte" : "Ferm\u00e9e" }}
          </v-chip>
          <v-chip
            size="small"
            variant="outlined"
          >
            {{ sourceChip }}
          </v-chip>
        </div>
        <h3 class="station-card__title mb-1">{{ station.name }}</h3>
        <p class="station-card__subtitle mb-0">
          {{ brandMeta }} - {{ station.address }}, {{ station.city }}
        </p>
      </div>

      <div class="text-right">
        <v-btn
          :color="station.isFavorite ? 'accent' : 'secondary'"
          :icon="station.isFavorite ? 'mdi-star' : 'mdi-star-outline'"
          size="small"
          variant="text"
          @click="stationStore.toggleFavorite(station.id)"
        />
        <p class="text-caption mb-1">{{ selectedFuel }}</p>
        <div class="station-card__price">
          {{ formatPrice(station.selectedFuelPrice) }}
        </div>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-2 mb-3">
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
        prepend-icon="mdi-piggy-bank-outline"
        variant="text"
      >
        {{ formatMoney(savings) }} d'\u00e9conomie / L
      </v-chip>
      <v-chip
        v-if="station.selectedFuelPrice == null"
        color="warning"
        prepend-icon="mdi-alert-outline"
        variant="tonal"
      >
        {{ selectedFuel }} indisponible ici
      </v-chip>
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        class="soft-chip"
        prepend-icon="mdi-gas-station-outline"
        variant="text"
      >
        {{ formatFuelFillCost(station.selectedFuelPrice) }}
      </v-chip>
      <v-chip
        class="soft-chip"
        prepend-icon="mdi-cash-plus"
        variant="text"
      >
        Gain 50L : {{ formatMoney(fillSavings) }}
      </v-chip>
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        v-for="service in station.services"
        :key="service"
        size="small"
        variant="tonal"
      >
        {{ service }}
      </v-chip>
    </div>

    <div class="d-flex flex-wrap ga-3">
      <v-btn
        color="secondary"
        prepend-icon="mdi-eye-outline"
        variant="tonal"
        @click="router.push({ name: 'station-detail', params: { id: station.id } })"
      >
        Voir d\u00e9tails
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-navigation-variant-outline"
        @click="openDirections"
      >
        Y aller
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.station-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.station-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.station-card__title {
  font-family: var(--ff-display);
  font-size: 1.15rem;
  line-height: 1.15;
}

.station-card__subtitle {
  color: rgba(15, 23, 42, 0.66);
}

.station-card__price {
  font-family: var(--ff-display);
  font-size: 1.35rem;
  letter-spacing: -0.04em;
}

.v-theme--fuelDark .station-card__subtitle {
  color: rgba(226, 247, 241, 0.68);
}
</style>
