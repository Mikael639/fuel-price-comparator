<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  Coordinates,
  GeocodingResult,
  LocationSource,
  MockLocation,
} from "@/types/station";

const props = defineProps<{
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  geoError: string | null;
  geocodingError: string | null;
  locationLabel: string | null;
  locationSource: LocationSource;
  userPosition: Coordinates | null;
  manualLocationId: string | null;
  searchQuery: string;
  searchResults: GeocodingResult[];
  mockLocations: MockLocation[];
}>();

const emit = defineEmits<{
  locate: [];
  refresh: [];
  demo: [];
  selectManual: [locationId: string];
  searchAddress: [query: string];
  selectSearchResult: [result: GeocodingResult];
}>();

const localSearchQuery = ref(props.searchQuery);

watch(
  () => props.searchQuery,
  (value) => {
    localSearchQuery.value = value;
  },
);

const sourceLabel = computed(() => {
  switch (props.locationSource) {
    case "browser":
      return "Position GPS";
    case "manual":
      return "Position manuelle";
    case "demo":
      return "Mode demonstration";
    case "search":
      return "Recherche libre";
    default:
      return "Aucune position";
  }
});

const coordinatesLabel = computed(() => {
  if (!props.userPosition) {
    return null;
  }

  return `${props.userPosition.lat.toFixed(5)}, ${props.userPosition.lng.toFixed(5)}`;
});

const runSearch = () => {
  emit("searchAddress", localSearchQuery.value);
};

const getManualLocationId = (value: string | MockLocation | null) =>
  typeof value === "string" ? value : value?.id ?? null;
</script>

<template>
  <v-card class="glass-card pa-5 pa-md-6">
    <div class="d-flex flex-column flex-md-row ga-6 justify-space-between">
      <div class="location-panel__copy">
        <p class="location-panel__eyebrow mb-2">Geolocalisation</p>
        <h3 class="text-h5 section-title mb-2">Retrouvez les meilleures stations autour de vous</h3>
        <p class="location-panel__text mb-4">
          Autorisez la geolocalisation pour un resultat live, choisissez une position
          simulee ou recherchez librement une ville/adresse en France.
        </p>

        <div class="d-flex flex-wrap ga-3">
          <v-btn
            color="primary"
            :loading="isGeolocating"
            prepend-icon="mdi-crosshairs-gps"
            @click="emit('locate')"
          >
            Utiliser ma position
          </v-btn>
          <v-btn
            color="secondary"
            prepend-icon="mdi-refresh"
            variant="tonal"
            @click="emit('refresh')"
          >
            Actualiser
          </v-btn>
          <v-btn
            color="accent"
            prepend-icon="mdi-map-marker-star"
            @click="emit('demo')"
          >
            Position de demonstration
          </v-btn>
        </div>
      </div>

      <div class="location-panel__inputs">
        <v-sheet
          class="location-panel__status pa-4 mb-4"
          color="surface"
          rounded="xl"
        >
          <div class="d-flex align-center ga-3">
            <v-avatar
              color="primary"
              size="42"
              variant="tonal"
            >
              <v-icon icon="mdi-map-marker-radius" />
            </v-avatar>
            <div>
              <p class="text-body-2 mb-1">{{ sourceLabel }}</p>
              <strong>{{ locationLabel ?? "Choisissez une position pour commencer" }}</strong>
              <p
                v-if="coordinatesLabel"
                class="location-panel__coords mt-2 mb-0"
              >
                Coordonnees detectees : {{ coordinatesLabel }}
              </p>
            </div>
          </div>
        </v-sheet>

        <v-autocomplete
          :items="mockLocations"
          :model-value="manualLocationId"
          clearable
          item-title="label"
          item-value="id"
          label="Ville de demonstration"
          prepend-inner-icon="mdi-map-search-outline"
          @update:model-value="(value) => getManualLocationId(value) && emit('selectManual', getManualLocationId(value)!)"
        />

        <div class="d-flex ga-2 mt-3">
          <v-text-field
            v-model="localSearchQuery"
            class="flex-grow-1"
            clearable
            density="comfortable"
            hide-details
            label="Rechercher une ville ou une adresse"
            prepend-inner-icon="mdi-home-search-outline"
            @keydown.enter.prevent="runSearch"
          />
          <v-btn
            color="primary"
            :loading="isSearchingLocation"
            prepend-icon="mdi-magnify"
            @click="runSearch"
          >
            Rechercher
          </v-btn>
        </div>

        <v-list
          v-if="searchResults.length > 0"
          class="location-panel__search-results mt-3"
          bg-color="transparent"
        >
          <v-list-item
            v-for="result in searchResults"
            :key="result.id"
            append-icon="mdi-chevron-right"
            class="location-panel__result"
            :subtitle="result.address"
            :title="`${result.label} - ${result.city}`"
            @click="emit('selectSearchResult', result)"
          />
        </v-list>

        <v-alert
          v-if="geoError"
          class="mt-4"
          color="warning"
          icon="mdi-alert-circle-outline"
          variant="tonal"
        >
          {{ geoError }}
        </v-alert>

        <v-alert
          v-if="geocodingError"
          class="mt-4"
          color="info"
          icon="mdi-map-search"
          variant="tonal"
        >
          {{ geocodingError }}
        </v-alert>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.location-panel__copy {
  flex: 1 1 60%;
}

.location-panel__inputs {
  flex: 1 1 26rem;
}

.location-panel__eyebrow {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
}

.location-panel__text {
  color: rgba(15, 23, 42, 0.68);
  line-height: 1.6;
}

.location-panel__status {
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.location-panel__coords {
  font-size: 0.8rem;
  color: rgba(15, 23, 42, 0.62);
  font-family: var(--ff-display);
  letter-spacing: -0.02em;
}

.location-panel__search-results {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
}

.location-panel__result {
  border-radius: 16px;
}

.location-panel__result + .location-panel__result {
  margin-top: 0.25rem;
}

.v-theme--fuelDark .location-panel__text {
  color: rgba(226, 247, 241, 0.74);
}

.v-theme--fuelDark .location-panel__status {
  border-color: rgba(148, 163, 184, 0.08);
}

.v-theme--fuelDark .location-panel__coords {
  color: rgba(226, 247, 241, 0.68);
}

.v-theme--fuelDark .location-panel__search-results {
  background: rgba(13, 31, 39, 0.72);
}
</style>
