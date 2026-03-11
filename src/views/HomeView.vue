<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import EmptyStateCard from "@/components/common/EmptyStateCard.vue";
import LocationPanel from "@/components/common/LocationPanel.vue";
import SectionHeading from "@/components/common/SectionHeading.vue";
import FilterBar from "@/components/filters/FilterBar.vue";
import StationsMap from "@/components/map/StationsMap.vue";
import BestStationCard from "@/components/station/BestStationCard.vue";
import StationCard from "@/components/station/StationCard.vue";
import StationStats from "@/components/station/StationStats.vue";
import { mockLocations } from "@/data/mockLocations";
import { stationService } from "@/services/stationService";
import { FUEL_TYPES } from "@/types/station";
import { sortModeCopy } from "@/utils/format";
import { useFuelStationsStore } from "@/stores/fuelStations";

const stationStore = useFuelStationsStore();
const {
  userPosition,
  locationLabel,
  locationSource,
  isLoading,
  isGeolocating,
  isSearchingLocation,
  geoError,
  geocodingError,
  genericError,
  selectedFuel,
  radiusKm,
  openOnly,
  selectedServices,
  sortMode,
  manualLocationId,
  searchQuery,
  geocodingResults,
  availableServices,
  nearbyStations,
  bestStation,
  favoriteStations,
  stats,
  hasResults,
  hasComparableResults,
  isDataUnavailable,
} = storeToRefs(stationStore);

const isMapSnackbarVisible = ref(false);
const mapSnackbarMessage = ref("");
const hasHydratedView = ref(false);

const savingsHero = computed(() =>
  stats.value.maxSavings != null && bestStation.value
    ? `Jusqu'à ${stats.value.maxSavings.toFixed(2).replace(".", ",")} € d'économie par litre sur ${selectedFuel.value}.`
    : "Affinez vos filtres pour faire ressortir l'offre la plus intéressante autour de vous.",
);

const absoluteCheapestStation = computed(() => stationService.getAbsoluteCheapestStation(nearbyStations.value));

const mapStatusCopy = computed(() => {
  if (!userPosition.value || !locationSource.value) {
    return null;
  }

  switch (locationSource.value) {
    case "browser":
      return "Carte recentrée sur votre position actuelle";
    case "manual":
      return `Carte centrée sur ${locationLabel.value}`;
    case "demo":
      return `Carte centrée sur ${locationLabel.value}`;
    case "search":
      return `Carte centrée sur ${locationLabel.value}`;
    default:
      return null;
  }
});

const geolocationHint = computed(() => {
  if (locationSource.value !== "browser" || !userPosition.value) {
    return null;
  }

  return "La géolocalisation navigateur peut être approximative. Si la carte semble décalée, recherchez votre ville manuellement.";
});

const sourceHint = computed(() => {
  if (!userPosition.value || isDataUnavailable.value) {
    return null;
  }

  return "Données live DGCCRF via prix-carburants.gouv.fr. Les enseignes peuvent être estimées ou enrichies ponctuellement via OpenStreetMap quand la source officielle ne les fournit pas.";
});

const distanceFocusHint = computed(() => {
  if (!bestStation.value || !absoluteCheapestStation.value) {
    return null;
  }

  if (bestStation.value.id === absoluteCheapestStation.value.id) {
    return null;
  }

  return `Le tarif absolu le plus bas du rayon est à ${absoluteCheapestStation.value.distanceKm
    .toFixed(1)
    .replace(".", ",")} km. La recommandation met en avant une station plus proche pour rester pertinente localement.`;
});

const favoritesSummary = computed(() => {
  if (favoriteStations.value.length === 0) {
    return null;
  }

  return `${favoriteStations.value.length} station(s) favorite(s) dans le rayon courant`;
});

onMounted(() => {
  void stationStore.initialize();

  setTimeout(() => {
    hasHydratedView.value = true;
  }, 0);
});

watch(
  () => [locationSource.value, locationLabel.value] as const,
  ([source, label], [previousSource, previousLabel]) => {
    if (!hasHydratedView.value || !source) {
      return;
    }

    if (source === previousSource && label === previousLabel) {
      return;
    }

    mapSnackbarMessage.value =
      source === "browser" ? "Carte recentrée sur votre position actuelle." : `Carte centrée sur ${label}.`;
    isMapSnackbarVisible.value = true;
  },
);
</script>

<template>
  <v-container class="py-6 py-md-8">
    <section class="mb-6 mb-md-8">
      <v-card class="hero-card pa-5 pa-md-8">
        <v-row align="center">
          <v-col
            cols="12"
            md="8"
          >
            <SectionHeading
              eyebrow="Prototype mobile-first"
              subtitle="Comparez instantanément les prix SP95, SP98, Diesel, E85 et GPL autour de votre position. L'interface met en avant le meilleur prix, la carte interactive, les favorites et l'économie locale potentielle."
              title="Le comparateur carburants qui va droit au point"
            />
          </v-col>

          <v-col
            cols="12"
            md="4"
          >
            <div class="hero-card__stats">
              <div>
                <span class="hero-card__stat-value">{{ nearbyStations.length }}</span>
                <span class="hero-card__stat-label">stations dans le rayon</span>
              </div>
              <div>
                <span class="hero-card__stat-value">{{ selectedFuel }}</span>
                <span class="hero-card__stat-label">carburant actif</span>
              </div>
              <div>
                <span class="hero-card__stat-value">{{ sortModeCopy[sortMode] }}</span>
                <span class="hero-card__stat-label">tri actuel</span>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card>
    </section>

    <section class="mb-6 mb-md-8">
      <LocationPanel
        :geo-error="geoError"
        :geocoding-error="geocodingError"
        :is-geolocating="isGeolocating"
        :is-searching-location="isSearchingLocation"
        :location-label="locationLabel"
        :location-source="locationSource"
        :manual-location-id="manualLocationId"
        :mock-locations="mockLocations"
        :search-query="searchQuery"
        :search-results="geocodingResults"
        :user-position="userPosition"
        @demo="stationStore.useDemoLocation"
        @locate="stationStore.requestUserLocation"
        @refresh="stationStore.refreshPosition"
        @search-address="stationStore.searchLocations"
        @select-manual="stationStore.selectManualLocation"
        @select-search-result="stationStore.selectSearchLocation"
      />
    </section>

    <v-alert
      v-if="geolocationHint"
      class="mb-6"
      color="info"
      icon="mdi-crosshairs-question"
      variant="tonal"
    >
      {{ geolocationHint }}
    </v-alert>

    <v-alert
      v-if="sourceHint"
      class="mb-6"
      color="secondary"
      icon="mdi-database-eye-outline"
      variant="tonal"
    >
      {{ sourceHint }}
    </v-alert>

    <v-alert
      v-if="favoritesSummary"
      class="mb-6"
      color="accent"
      icon="mdi-star-circle"
      variant="tonal"
    >
      {{ favoritesSummary }}
    </v-alert>

    <v-alert
      v-if="genericError"
      class="mb-6"
      color="error"
      icon="mdi-alert-circle-outline"
      variant="tonal"
    >
      {{ genericError }}
    </v-alert>

    <section
      v-if="isLoading"
      class="mb-6 mb-md-8"
    >
      <v-row>
        <v-col cols="12">
          <v-skeleton-loader
            class="surface-card"
            type="image, article"
          />
        </v-col>
        <v-col
          cols="12"
          md="4"
        >
          <v-skeleton-loader
            class="surface-card"
            type="article, actions"
          />
        </v-col>
        <v-col
          cols="12"
          md="4"
        >
          <v-skeleton-loader
            class="surface-card"
            type="article, actions"
          />
        </v-col>
        <v-col
          cols="12"
          md="4"
        >
          <v-skeleton-loader
            class="surface-card"
            type="article, actions"
          />
        </v-col>
      </v-row>
    </section>

    <template v-else>
      <section
        v-if="userPosition && !isDataUnavailable"
        class="mb-6 mb-md-8"
      >
        <FilterBar
          :fuel-options="FUEL_TYPES"
          :open-only="openOnly"
          :radius-km="radiusKm"
          :selected-fuel="selectedFuel"
          :selected-services="selectedServices"
          :service-options="availableServices"
          :sort-mode="sortMode"
          @update:open-only="(value) => (stationStore.openOnly = value)"
          @update:radius-km="(value) => (stationStore.radiusKm = value)"
          @update:selected-fuel="(value) => (stationStore.selectedFuel = value)"
          @update:selected-services="(value) => (stationStore.selectedServices = value)"
          @update:sort-mode="(value) => (stationStore.sortMode = value)"
        />
      </section>

      <section
        v-if="userPosition && hasResults"
        class="mb-6"
      >
        <StationStats
          :average-price="stats.averagePrice"
          :comparable-count="stats.comparableCount"
          :max-savings="stats.maxSavings"
          :station-count="stats.stationCount"
        />
      </section>

      <section
        v-if="bestStation && hasComparableResults"
        class="mb-6 mb-md-8"
      >
        <v-alert
          v-if="distanceFocusHint"
          class="mb-4"
          color="warning"
          icon="mdi-map-marker-distance"
          variant="tonal"
        >
          {{ distanceFocusHint }}
        </v-alert>

        <BestStationCard
          :average-price="stats.averagePrice"
          :selected-fuel="selectedFuel"
          :station="bestStation"
        />
      </section>

      <section
        v-if="favoriteStations.length > 0"
        class="mb-6 mb-md-8"
      >
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-end ga-3 mb-4">
          <SectionHeading
            eyebrow="Favorites"
            subtitle="Retrouvez rapidement vos stations enregistrées dans la zone visible."
            title="Vos stations favorites"
          />
        </div>

        <v-row>
          <v-col
            v-for="station in favoriteStations"
            :key="station.id"
            cols="12"
            md="6"
          >
            <StationCard
              :average-price="stats.averagePrice"
              :is-best="station.id === bestStation?.id"
              :selected-fuel="selectedFuel"
              :station="station"
            />
          </v-col>
        </v-row>
      </section>

      <section
        v-if="userPosition"
        class="mb-6 mb-md-8"
      >
        <div class="d-flex justify-space-between align-center mb-3">
          <v-chip
            v-if="mapStatusCopy"
            color="info"
            prepend-icon="mdi-crosshairs-gps"
            variant="tonal"
          >
            {{ mapStatusCopy }}
          </v-chip>
        </div>

        <StationsMap
          :best-station-id="bestStation?.id ?? null"
          :radius-km="radiusKm"
          :selected-fuel="selectedFuel"
          :stations="nearbyStations"
          :user-position="userPosition"
        />
      </section>

      <section
        v-if="userPosition && !hasResults"
        class="mb-6 mb-md-8"
      >
        <EmptyStateCard
          description="Aucune station n'apparaît avec le rayon et les filtres actuels. Élargissez le rayon ou retirez quelques services."
          icon="mdi-map-marker-remove-outline"
          title="Aucun résultat dans le rayon"
        />
      </section>

      <section
        v-else-if="userPosition && hasResults && !hasComparableResults"
        class="mb-6 mb-md-8"
      >
        <EmptyStateCard
          description="Des stations existent dans cette zone, mais aucune ne propose actuellement le carburant sélectionné."
          icon="mdi-fuel-off"
          title="Carburant indisponible"
        />
      </section>

      <section
        v-if="hasResults"
        class="mb-6 mb-md-8"
      >
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-end ga-3 mb-4">
          <SectionHeading
            eyebrow="Classement"
            :subtitle="`Les stations sont triées par ${sortModeCopy[sortMode].toLocaleLowerCase('fr-FR')} dans le rayon courant.`"
            title="Liste des stations"
          />
          <v-chip
            class="soft-chip"
            prepend-icon="mdi-cash-multiple"
            variant="text"
          >
            {{ savingsHero }}
          </v-chip>
        </div>

        <v-row>
          <v-col
            v-for="station in nearbyStations"
            :key="station.id"
            cols="12"
            md="6"
          >
            <StationCard
              :average-price="stats.averagePrice"
              :is-best="station.id === bestStation?.id"
              :selected-fuel="selectedFuel"
              :station="station"
            />
          </v-col>
        </v-row>
      </section>

      <section
        v-if="isDataUnavailable"
        class="mb-6"
      >
        <EmptyStateCard
          description="Le prototype n'a pas pu charger les données officielles ni le jeu de secours local."
          icon="mdi-database-off-outline"
          title="Données indisponibles"
        />
      </section>
    </template>

    <v-snackbar
      v-model="isMapSnackbarVisible"
      color="secondary"
      location="bottom"
      rounded="pill"
      timeout="2600"
    >
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-map-marker-check-outline" />
        <span>{{ mapSnackbarMessage }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.hero-card {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(255, 183, 3, 0.2), transparent 28%),
    linear-gradient(135deg, rgba(15, 118, 110, 0.1), rgba(3, 105, 161, 0.08)),
    rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-soft);
}

.hero-card__stats {
  display: grid;
  gap: 1rem;
  padding: 1.15rem;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.86);
  color: white;
}

.hero-card__stat-value {
  display: block;
  font-family: var(--ff-display);
  font-size: 1.8rem;
  letter-spacing: -0.05em;
}

.hero-card__stat-label {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.9rem;
}

.v-theme--fuelDark .hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 209, 102, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(94, 234, 212, 0.12), rgba(125, 211, 252, 0.08)),
    rgba(13, 31, 39, 0.72);
  border-color: rgba(148, 163, 184, 0.08);
}
</style>
