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
  trendColor,
  trendIcon,
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

import { getBrandLogoUrl } from "@/utils/brand";

const sourceChip = computed(() => (props.station.dataOrigin === "mock" ? "Dataset local" : "Source officielle"));

const brandLogo = computed(() => getBrandLogoUrl(props.station.brand));

const brandMeta = computed(() => {
  if (props.station.brandSource === "osm") {
    return `Enseigne enrichie via OpenStreetMap : ${props.station.brand}`;
  }

  if (props.station.brandSource === "inferred") {
    return `Enseigne estimee : ${props.station.brand}`;
  }

  if (props.station.brandSource === "not_provided") {
    return "Enseigne non communiquee";
  }

  return props.station.brand;
});

const openDirections = () => {
  window.open(getGoogleMapsDirectionsUrl(props.station.lat, props.station.lng), "_blank", "noopener,noreferrer");
};

const isAlertTriggered = computed(() => {
  if (!props.station.isFavorite || props.station.selectedFuelPrice == null || stationStore.favoriteAlertPrice == null) {
    return false;
  }
  return props.station.selectedFuelPrice <= stationStore.favoriteAlertPrice;
});
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
            Meilleure reco
          </v-chip>
          <v-chip
            :color="station.isOpen ? 'success' : 'error'"
            size="small"
            variant="tonal"
          >
            {{ station.isOpen ? "Ouverte" : "Fermee" }}
          </v-chip>
          <v-chip
            size="small"
            variant="outlined"
          >
            {{ sourceChip }}
          </v-chip>
        </div>
        <div class="d-flex align-center ga-3 mb-1">
          <v-avatar v-if="brandLogo" size="32" rounded="0">
            <v-img :src="brandLogo" lazy-src="data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" alt="Logo de l'enseigne" />
          </v-avatar>
          <h3 class="station-card__title">{{ station.name }}</h3>
        </div>
        <p class="station-card__subtitle mb-1">
          {{ brandMeta }} - {{ station.address }}, {{ station.city }}
        </p>
        <p class="text-caption mb-0">{{ freshnessLabel }}</p>
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
        <div class="station-card__price-wrapper d-flex align-center ga-2 justify-end">
          <v-icon
            v-if="station.priceTrend"
            :color="trendColor[station.priceTrend]"
            :icon="trendIcon[station.priceTrend]"
            size="small"
          />
          <div class="station-card__price">
            {{ formatPrice(station.selectedFuelPrice) }}
          </div>
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
        {{ formatMoney(savings) }} / L
      </v-chip>
      <v-chip
        v-if="station.selectedFuelPrice == null"
        color="warning"
        prepend-icon="mdi-alert-outline"
        variant="tonal"
      >
        {{ selectedFuel }} indisponible ici
      </v-chip>
      
      <v-chip
        v-if="isAlertTriggered"
        color="accent"
        prepend-icon="mdi-bell-ring"
        class="pulse-alert"
      >
        Victoire ! Prix cible atteint
      </v-chip>
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        class="soft-chip"
        prepend-icon="mdi-gas-station-outline"
        variant="text"
      >
        {{ formatFuelFillCost(station.selectedFuelPrice, station.fillVolumeLiters) }}
      </v-chip>
      <v-chip
        class="soft-chip"
        prepend-icon="mdi-road-variant"
        variant="text"
      >
        Detour estime : {{ formatMoney(station.estimatedDetourCost) }}
      </v-chip>
      <v-chip
        class="soft-chip"
        prepend-icon="mdi-cash-plus"
        variant="text"
      >
        Gain net : {{ formatMoney(netSavings) }}
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
        :color="stationStore.confirmedStationIds.includes(station.id) ? 'success' : 'secondary'"
        :disabled="stationStore.confirmedStationIds.includes(station.id)"
        :prepend-icon="stationStore.confirmedStationIds.includes(station.id) ? 'mdi-check-circle' : 'mdi-check'"
        variant="tonal"
        @click="stationStore.confirmStationPrice(station.id)"
      >
        {{ stationStore.confirmedStationIds.includes(station.id) ? "Prix confirme" : "Confirmer prix" }}
      </v-btn>
      <v-chip
        class="soft-chip"
        prepend-icon="mdi-cash-fast"
        variant="text"
      >
        Gain brut : {{ formatMoney(fillSavings) }}
      </v-chip>
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

.pulse-alert {
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}
</style>
