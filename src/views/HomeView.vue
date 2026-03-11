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
import { useStationsBootstrap } from "@/composables/useStationsBootstrap";
import { mockLocations } from "@/data/mockLocations";
import { stationService } from "@/services/stationService";
import { FUEL_TYPES } from "@/types/station";
import { sortModeCopy } from "@/utils/format";

const stationStore = useStationsBootstrap();
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
    ? `Jusqu'a ${stats.value.maxSavings.toFixed(2).replace(".", ",")} EUR d'economie par litre sur ${selectedFuel.value}.`
    : "Affinez vos filtres pour faire ressortir l'offre la plus interessante autour de vous.",
);

const absoluteCheapestStation = computed(() => stationService.getAbsoluteCheapestStation(nearbyStations.value));

const mapStatusCopy = computed(() => {
  if (!userPosition.value || !locationSource.value) {
    return null;
  }

  switch (locationSource.value) {
    case "browser":
      return "Carte recentree sur votre position actuelle";
    case "manual":
    case "demo":
    case "search":
      return `Carte centree sur ${locationLabel.value}`;
    default:
      return null;
  }
});

const geolocationHint = computed(() => {
  if (locationSource.value !== "browser" || !userPosition.value) {
    return null;
  }

  return "La geolocalisation navigateur peut etre approximative. Si la carte semble decalee, recherchez votre ville manuellement.";
});

const sourceHint = computed(() => {
  if (!userPosition.value || isDataUnavailable.value) {
    return null;
  }

  return "Donnees live DGCCRF via prix-carburants.gouv.fr. Les enseignes peuvent etre estimees ou enrichies ponctuellement via OpenStreetMap.";
});

const distanceFocusHint = computed(() => {
  if (!bestStation.value || !absoluteCheapestStation.value) {
    return null;
  }

  if (bestStation.value.id === absoluteCheapestStation.value.id) {
    return null;
  }

  return `Le tarif absolu le plus bas du rayon est a ${absoluteCheapestStation.value.distanceKm
    .toFixed(1)
    .replace(".", ",")} km. La recommandation privilegie une station plus proche pour rester pertinente localement.`;
});

const favoritesSummary = computed(() => {
  if (favoriteStations.value.length === 0) {
    return null;
  }

  return `${favoriteStations.value.length} station(s) favorite(s) dans le rayon courant`;
});

const discoveryCards = [
  {
    title: "Tendances locales",
    subtitle: "Graphique 7 jours, ecarts hebdomadaires et comparaison Diesel / Essence.",
    icon: "mdi-chart-line",
    to: { name: "insights" },
    cta: "Ouvrir les tendances",
  },
  {
    title: "Vue Europe",
    subtitle: "Lecture multi-pays pour prendre du recul sans alourdir l'accueil.",
    icon: "mdi-earth",
    to: { name: "europe" },
    cta: "Voir l'Europe",
  },
];

onMounted(() => {
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
      source === "browser" ? "Carte recentree sur votre position actuelle." : `Carte centree sur ${label}.`;
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
              eyebrow="Recherche locale"
              subtitle="Comparez instantanement les prix SP95, SP98, Diesel, E85 et GPL autour de votre position. Cette page reste centree sur la recherche, la carte et la meilleure recommandation."
              title="Trouvez vite la meilleure station autour de vous"
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
            subtitle="Retrouvez rapidement vos stations enregistrees dans la zone visible."
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

      <section class="mb-6 mb-md-8">
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-end ga-3 mb-4">
          <SectionHeading
            eyebrow="Analyses"
            subtitle="Les vues tendances et Europe sont separees pour garder l'accueil simple, rapide a lire et plus confortable sur mobile."
            title="Approfondir sans surcharger"
          />
        </div>

        <v-row>
          <v-col
            v-for="card in discoveryCards"
            :key="card.title"
            cols="12"
            md="6"
          >
            <v-card
              class="discovery-card pa-4 pa-md-5"
              :to="card.to"
            >
              <div class="d-flex align-start justify-space-between ga-3 mb-4">
                <div>
                  <p class="text-overline mb-1">{{ card.title }}</p>
                  <h3 class="text-h6 mb-2">{{ card.title }}</h3>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ card.subtitle }}
                  </p>
                </div>

                <v-avatar
                  class="discovery-card__icon"
                  size="42"
                >
                  <v-icon
                    :icon="card.icon"
                    size="22"
                  />
                </v-avatar>
              </div>

              <v-btn
                color="secondary"
                variant="tonal"
              >
                {{ card.cta }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <section
        v-if="userPosition && !hasResults"
        class="mb-6 mb-md-8"
      >
        <EmptyStateCard
          description="Aucune station n'apparait avec le rayon et les filtres actuels. Elargissez le rayon ou retirez quelques services."
          icon="mdi-map-marker-remove-outline"
          title="Aucun resultat dans le rayon"
        />
      </section>

      <section
        v-else-if="userPosition && hasResults && !hasComparableResults"
        class="mb-6 mb-md-8"
      >
        <EmptyStateCard
          description="Des stations existent dans cette zone, mais aucune ne propose actuellement le carburant selectionne."
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
            :subtitle="`Les stations sont triees par ${sortModeCopy[sortMode].toLocaleLowerCase('fr-FR')} dans le rayon courant.`"
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
          description="Impossible de charger les donnees officielles et le jeu de secours local."
          icon="mdi-database-off-outline"
          title="Donnees indisponibles"
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

.discovery-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.82), rgba(240, 249, 255, 0.72)),
    rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-soft);
}

.discovery-card__icon {
  flex-shrink: 0;
  color: rgb(var(--v-theme-secondary));
  background: rgba(15, 118, 110, 0.1);
}

.v-theme--fuelDark .hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 209, 102, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(94, 234, 212, 0.12), rgba(125, 211, 252, 0.08)),
    rgba(13, 31, 39, 0.72);
  border-color: rgba(148, 163, 184, 0.08);
}

.v-theme--fuelDark .discovery-card {
  background:
    linear-gradient(155deg, rgba(13, 31, 39, 0.88), rgba(12, 74, 110, 0.34)),
    rgba(13, 31, 39, 0.8);
  border-color: rgba(148, 163, 184, 0.08);
}

.v-theme--fuelDark .discovery-card__icon {
  background: rgba(94, 234, 212, 0.12);
}
</style>
