<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import EmptyStateCard from "@/components/common/EmptyStateCard.vue";
import SectionHeading from "@/components/common/SectionHeading.vue";
import PriceHistoryChart from "@/components/station/PriceHistoryChart.vue";
import { useFuelStationsStore } from "@/stores/fuelStations";
import { formatDistance, formatDriveTime, formatPrice } from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import { haversineDistance } from "@/utils/geo";
import type { FuelStation, FuelType } from "@/types/station";

const route = useRoute();
const router = useRouter();
const stationStore = useFuelStationsStore();
const { isLoading, stations, selectedFuel, userPosition, favoriteIds } = storeToRefs(stationStore);
const remoteStation = ref<FuelStation | null>(null);

const station = computed(
  () => remoteStation.value ?? stations.value.find((item) => item.id === String(route.params.id)) ?? null,
);

const activeFuel = ref<FuelType>("Diesel");

const travelDistance = computed(() => {
  if (!station.value || !userPosition.value) {
    return null;
  }

  return haversineDistance(userPosition.value, station.value);
});

const travelMinutes = computed(() => {
  if (travelDistance.value == null) {
    return null;
  }

  return Math.max(3, Math.round(travelDistance.value * 1.65 + 2));
});

const isFavorite = computed(() => station.value != null && favoriteIds.value.includes(station.value.id));

watch(
  station,
  (value) => {
    if (!value) {
      return;
    }

    const preferredFuel = value.fuels.includes(selectedFuel.value) ? selectedFuel.value : (value.fuels[0] ?? "Diesel");
    activeFuel.value = preferredFuel;
  },
  { immediate: true },
);

onMounted(() => {
  void (async () => {
    await stationStore.initialize();
    remoteStation.value = await stationStore.loadStationById(String(route.params.id));
  })();
});

const directionsUrl = computed(() =>
  station.value ? getGoogleMapsDirectionsUrl(station.value.lat, station.value.lng) : "#",
);

const sourceEyebrow = computed(() => {
  if (!station.value) {
    return "";
  }

  if (station.value.brandSource === "mock") {
    return station.value.brand;
  }

  return "Source officielle DGCCRF";
});

const brandDetail = computed(() => {
  if (!station.value) {
    return null;
  }

  if (station.value.brandSource === "osm") {
    return `Enseigne enrichie via OpenStreetMap : ${station.value.brand}`;
  }

  if (station.value.brandSource === "inferred") {
    return `Enseigne estimée : ${station.value.brand}`;
  }

  if (station.value.brandSource === "not_provided") {
    return "Enseigne non communiquée dans le dataset officiel";
  }

  return null;
});
</script>

<template>
  <v-container class="py-6 py-md-8">
    <template v-if="station">
      <section class="mb-6 mb-md-8">
        <v-card class="glass-card pa-5 pa-md-8">
          <div class="d-flex flex-column flex-md-row justify-space-between ga-5">
            <div>
              <v-btn
                class="mb-4"
                color="secondary"
                prepend-icon="mdi-arrow-left"
                variant="tonal"
                @click="router.back()"
              >
                Retour
              </v-btn>

              <SectionHeading
                :eyebrow="sourceEyebrow"
                :subtitle="`${station.address}, ${station.city}`"
                :title="station.name"
              />

              <div class="d-flex flex-wrap ga-2 mt-4">
                <v-chip
                  v-if="brandDetail"
                  color="secondary"
                  variant="tonal"
                >
                  {{ brandDetail }}
                </v-chip>
                <v-chip
                  :color="station.isOpen ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ station.isOpen ? "Ouverte" : "Fermée" }}
                </v-chip>
                <v-chip
                  class="soft-chip"
                  prepend-icon="mdi-clock-outline"
                  variant="text"
                >
                  {{ station.openingHours }}
                </v-chip>
                <v-chip
                  v-if="travelDistance != null && travelMinutes != null"
                  class="soft-chip"
                  prepend-icon="mdi-car-clock"
                  variant="text"
                >
                  {{ formatDistance(travelDistance) }} • ~ {{ formatDriveTime(travelMinutes) }}
                </v-chip>
              </div>
            </div>

            <div class="detail-hero__actions">
              <v-btn
                color="primary"
                prepend-icon="mdi-home-outline"
                variant="tonal"
                @click="router.push('/')"
              >
                Retour accueil
              </v-btn>
              <v-btn
                color="primary"
                :href="directionsUrl"
                prepend-icon="mdi-navigation-variant-outline"
                target="_blank"
              >
                Y aller
              </v-btn>
              <v-btn
                :color="isFavorite ? 'accent' : 'secondary'"
                :prepend-icon="isFavorite ? 'mdi-star' : 'mdi-star-outline'"
                variant="tonal"
                @click="stationStore.toggleFavorite(station.id)"
              >
                {{ isFavorite ? "Retirer des favorites" : "Ajouter aux favorites" }}
              </v-btn>
            </div>
          </div>
        </v-card>
      </section>

      <section class="mb-6">
        <v-row>
          <v-col
            v-for="fuel in station.fuels"
            :key="fuel"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              class="surface-card pa-4 detail-fuel-card"
              :class="{ 'detail-fuel-card--active': activeFuel === fuel }"
              @click="activeFuel = fuel"
            >
              <div class="d-flex align-center justify-space-between mb-3">
                <strong>{{ fuel }}</strong>
                <v-icon
                  color="primary"
                  icon="mdi-chevron-right"
                />
              </div>
              <div class="text-h5 font-weight-bold mb-2">
                {{ formatPrice(station.fuelPrices[fuel]) }}
              </div>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Appuyez pour afficher l'historique détaillé.
              </p>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <section class="mb-6 mb-md-8">
        <PriceHistoryChart
          :fuel="activeFuel"
          :station="station"
        />
      </section>

      <section>
        <v-row>
          <v-col
            cols="12"
            md="6"
          >
            <v-card class="surface-card pa-5 fill-height">
              <p class="text-overline mb-2">Services</p>
              <h3 class="text-h6 section-title mb-4">Équipements disponibles</h3>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="service in station.services"
                  :key="service"
                  color="primary"
                  variant="tonal"
                >
                  {{ service }}
                </v-chip>
              </div>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <v-card class="surface-card pa-5 fill-height">
              <p class="text-overline mb-2">Infos</p>
              <h3 class="text-h6 section-title mb-4">Horaires et statut</h3>
              <v-list bg-color="transparent">
                <v-list-item
                  prepend-icon="mdi-clock-outline"
                  :subtitle="station.openingHours"
                  title="Horaires"
                />
                <v-list-item
                  prepend-icon="mdi-storefront-outline"
                  :subtitle="station.isOpen ? 'Disponible maintenant' : 'Actuellement fermée'"
                  title="Statut"
                />
                <v-list-item
                  prepend-icon="mdi-map-marker-outline"
                  :subtitle="`${station.address}, ${station.city}`"
                  title="Adresse complète"
                />
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </section>
    </template>

    <section
      v-else-if="isLoading"
      class="mb-6"
    >
      <v-skeleton-loader
        class="surface-card"
        type="article, image"
      />
    </section>

    <section v-else>
      <EmptyStateCard
        description="Cette station n'existe pas ou n'est plus disponible dans les données officielles."
        icon="mdi-map-marker-question-outline"
        title="Station introuvable"
      >
        <v-btn
          color="primary"
          prepend-icon="mdi-arrow-left"
          @click="router.push('/')"
        >
          Retour à l'accueil
        </v-btn>
      </EmptyStateCard>
    </section>
  </v-container>
</template>

<style scoped>
.detail-hero__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: min(100%, 15rem);
}

.detail-fuel-card {
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.detail-fuel-card:hover,
.detail-fuel-card--active {
  transform: translateY(-4px);
  border-color: rgba(15, 118, 110, 0.2);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}
</style>
