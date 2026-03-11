<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { appConfig } from "@/config/app";
import L from "leaflet";
import "leaflet.markercluster";
import { useFuelStationsStore } from "@/stores/fuelStations";
import { formatDistance, formatDriveTime, formatPrice } from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import type { Coordinates, FuelType, StationWithMetrics } from "@/types/station";

const props = defineProps<{
  userPosition: Coordinates | null;
  stations: StationWithMetrics[];
  selectedFuel: FuelType;
  radiusKm: number;
  bestStationId?: string | null;
}>();

const router = useRouter();
const stationStore = useFuelStationsStore();
const { themeName } = storeToRefs(stationStore);
const { smAndDown } = useDisplay();

const mapElement = ref<HTMLDivElement | null>(null);
const mapShell = ref<HTMLDivElement | null>(null);
const isFullscreen = ref(false);
const selectedStationId = ref<string | null>(null);
const isLegendExpanded = ref(false);

let map: L.Map | null = null;
let overlayLayer: L.LayerGroup | null = null;
let stationClusterLayer: L.MarkerClusterGroup | null = null;
let baseTileLayer: L.TileLayer | null = null;
let currentBounds: L.LatLngBounds | null = null;

const tileLayerConfig = computed(() => {
  if (themeName.value === "fuelDark") {
    return {
      url: appConfig.map.darkTilesUrl,
      options: {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: appConfig.map.tileAttribution,
      },
    };
  }

  return {
    url: appConfig.map.lightTilesUrl,
    options: {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: appConfig.map.tileAttribution,
    },
  };
});

const hasBestStation = computed(() => props.stations.some((station) => station.id === props.bestStationId));
const pricedStations = computed(() => props.stations.filter((station) => station.selectedFuelPrice != null));
const mobilePriceMarkerIds = computed(() => pricedStations.value.slice(0, 2).map((station) => station.id));
const selectedStation = computed(
  () => props.stations.find((station) => station.id === selectedStationId.value) ?? null,
);
const showLegend = computed(() => !smAndDown.value || isLegendExpanded.value);
const fullscreenButtonLabel = computed(() => {
  if (!smAndDown.value) {
    return undefined;
  }

  return isFullscreen.value ? "Quitter" : "Plein ecran";
});

const createMarkerIcon = (
  className: string,
  options?: {
    label?: string;
    state?: "open" | "closed";
  },
) =>
  L.divIcon({
    className: "",
    html: `
      <div class="map-marker-shell">
        <div class="map-marker-status map-marker-status--${options?.state ?? "open"}"></div>
        <div class="${className}"></div>
        ${options?.label ? `<div class="map-marker-price">${options.label}</div>` : ""}
      </div>
    `,
    iconSize: [84, 54],
    iconAnchor: [16, 16],
  });

const formatBrandMeta = (station: StationWithMetrics) => {
  if (station.brandSource === "osm") {
    return `Enseigne enrichie via OpenStreetMap : ${station.brand}`;
  }

  if (station.brandSource === "inferred") {
    return `Enseigne estimee : ${station.brand}`;
  }

  if (station.brandSource === "not_provided") {
    return "Enseigne non communiquee - source officielle";
  }

  return station.brand;
};

const summarizeServices = (station: StationWithMetrics) => station.services.slice(0, 3).join(" - ");

const popupContent = (station: StationWithMetrics) => {
  const stationUrl = `/station/${station.id}`;
  const directionsUrl = getGoogleMapsDirectionsUrl(station.lat, station.lng);
  const statusClass = station.isOpen ? "" : " map-popup__status--closed";
  const servicesSummary = summarizeServices(station);

  return `
    <div class="map-popup">
      <h4 class="map-popup__title">${station.name}</h4>
      <p class="map-popup__meta">${formatBrandMeta(station)} - ${station.address}, ${station.city}</p>
      <div class="map-popup__price-row">
        <span class="map-popup__fuel">${props.selectedFuel}</span>
        <strong class="map-popup__price">${formatPrice(station.selectedFuelPrice)}</strong>
      </div>
      <p class="map-popup__meta">${formatDistance(station.distanceKm)} - ~ ${formatDriveTime(station.estimatedDriveMinutes)}</p>
      <p class="map-popup__meta">${station.openingHours}</p>
      <span class="map-popup__status${statusClass}">
        ${station.isOpen ? "Ouverte" : "Fermee"}
      </span>
      ${
        servicesSummary
          ? `<div class="map-popup__services">
              <span class="map-popup__service">${servicesSummary}</span>
            </div>`
          : ""
      }
      <div class="map-popup__actions">
        <a class="map-popup__button map-popup__button--ghost" href="${stationUrl}">Voir details</a>
        <a class="map-popup__button" href="${directionsUrl}" target="_blank" rel="noopener noreferrer">Y aller</a>
      </div>
    </div>
  `;
};

const applyBaseLayer = () => {
  if (!map) {
    return;
  }

  if (baseTileLayer) {
    map.removeLayer(baseTileLayer);
  }

  baseTileLayer = L.tileLayer(tileLayerConfig.value.url, tileLayerConfig.value.options).addTo(map);
};

const ensureMap = () => {
  if (!mapElement.value || map) {
    return;
  }

  map = L.map(mapElement.value, {
    zoomControl: false,
  }).setView([48.8566, 2.3522], 12);

  applyBaseLayer();
  L.control.zoom({ position: "bottomright" }).addTo(map);
  overlayLayer = L.layerGroup().addTo(map);
  stationClusterLayer = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: 56,
    iconCreateFunction: (cluster) =>
      L.divIcon({
        className: "map-cluster",
        html: `<span>${cluster.getChildCount()}</span>`,
        iconSize: [42, 42],
      }),
  }).addTo(map);
};

const fitMapToContent = (bounds: L.LatLngTuple[]) => {
  if (!map) {
    return;
  }

  if (bounds.length > 1) {
    currentBounds = L.latLngBounds(bounds);
    map.fitBounds(currentBounds, {
      padding: [40, 40],
      maxZoom: 14,
    });
    return;
  }

  currentBounds = null;

  if (props.userPosition) {
    map.setView([props.userPosition.lat, props.userPosition.lng], 13);
  }
};

const recenterMap = () => {
  if (!map) {
    return;
  }

  if (currentBounds) {
    map.fitBounds(currentBounds, {
      padding: [40, 40],
      maxZoom: 14,
    });
    return;
  }

  if (props.userPosition) {
    map.setView([props.userPosition.lat, props.userPosition.lng], 13);
  }
};

const invalidateMapSize = () => {
  window.setTimeout(() => {
    map?.invalidateSize();
    recenterMap();
  }, 180);
};

const renderMap = () => {
  if (!map || !overlayLayer || !stationClusterLayer) {
    return;
  }

  overlayLayer.clearLayers();
  stationClusterLayer.clearLayers();

  const bounds: L.LatLngTuple[] = [];

  if (props.userPosition) {
    const userLatLng: L.LatLngTuple = [props.userPosition.lat, props.userPosition.lng];
    const searchBounds = L.latLng(userLatLng).toBounds(props.radiusKm * 1000);

    bounds.push(userLatLng);
    bounds.push([searchBounds.getNorthEast().lat, searchBounds.getNorthEast().lng]);
    bounds.push([searchBounds.getSouthWest().lat, searchBounds.getSouthWest().lng]);

    L.circle(userLatLng, {
      radius: props.radiusKm * 1000,
      color: "#0f766e",
      fillColor: "#5eead4",
      fillOpacity: 0.07,
      opacity: 0.9,
      weight: 1.2,
      dashArray: "8 8",
    }).addTo(overlayLayer);

    L.circle(userLatLng, {
      radius: 260,
      color: "#0f766e",
      fillColor: "#5eead4",
      fillOpacity: 0.16,
      weight: 1.2,
    }).addTo(overlayLayer);

    L.marker(userLatLng, {
      icon: createMarkerIcon("map-user-pin"),
    })
      .bindPopup(props.userPosition.label ?? "Votre position")
      .addTo(overlayLayer);
  }

  props.stations.forEach((station) => {
    const latLng: L.LatLngTuple = [station.lat, station.lng];
    const isBest = station.id === props.bestStationId;
    const showPriceLabel = isBest || mobilePriceMarkerIds.value.includes(station.id);
    const marker = L.marker(latLng, {
      icon: createMarkerIcon(isBest ? "map-station-pin map-station-pin--best" : "map-station-pin", {
        label: showPriceLabel && station.selectedFuelPrice != null ? formatPrice(station.selectedFuelPrice) : undefined,
        state: station.isOpen ? "open" : "closed",
      }),
    });

    marker.bindPopup(popupContent(station));
    marker.on("click", () => {
      selectedStationId.value = station.id;
    });

    stationClusterLayer?.addLayer(marker);
    bounds.push(latLng);
  });

  fitMapToContent(bounds);
};

const syncFullscreenState = () => {
  isFullscreen.value = document.fullscreenElement === mapShell.value;
  invalidateMapSize();
};

const toggleFullscreen = async () => {
  if (!mapShell.value) {
    return;
  }

  if (document.fullscreenElement === mapShell.value) {
    await document.exitFullscreen();
    return;
  }

  await mapShell.value.requestFullscreen();
};

const openSelectedStation = () => {
  if (selectedStation.value) {
    router.push({ name: "station-detail", params: { id: selectedStation.value.id } });
  }
};

const toggleLegend = () => {
  isLegendExpanded.value = !isLegendExpanded.value;
};

watch(
  () => props.bestStationId,
  (value) => {
    if (value && !selectedStationId.value) {
      selectedStationId.value = value;
    }
  },
  { immediate: true },
);

watch(
  () => props.stations.map((station) => station.id),
  (ids) => {
    if (selectedStationId.value && !ids.includes(selectedStationId.value)) {
      selectedStationId.value = props.bestStationId ?? ids[0] ?? null;
    }
  },
  { immediate: true },
);

onMounted(() => {
  ensureMap();
  renderMap();
  document.addEventListener("fullscreenchange", syncFullscreenState);
});

watch(
  () => [props.userPosition, props.stations, props.selectedFuel, props.radiusKm, props.bestStationId],
  () => {
    renderMap();
  },
  { deep: true },
);

watch(tileLayerConfig, () => {
  applyBaseLayer();
  invalidateMapSize();
});

watch(
  smAndDown,
  (value) => {
    isLegendExpanded.value = !value;
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenState);
  map?.remove();
  map = null;
  baseTileLayer = null;
  currentBounds = null;
});
</script>

<template>
  <v-card class="surface-card overflow-hidden">
    <div class="d-flex align-center justify-space-between px-4 px-md-6 pt-4 pt-md-5 pb-3">
      <div>
        <p class="text-overline mb-1">Carte interactive</p>
        <h3 class="text-h6 section-title mb-1">Stations visibles autour de vous</h3>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            color="primary"
            prepend-icon="mdi-fuel"
            variant="tonal"
          >
            {{ selectedFuel }}
          </v-chip>
          <v-chip
            color="secondary"
            prepend-icon="mdi-map-marker-multiple"
            variant="tonal"
          >
            {{ stations.length }} stations
          </v-chip>
          <v-chip
            color="accent"
            prepend-icon="mdi-radius"
            variant="tonal"
          >
            Rayon {{ radiusKm }} km
          </v-chip>
        </div>
      </div>

      <div class="d-flex ga-2">
        <v-btn
          color="secondary"
          icon="mdi-crosshairs-gps"
          variant="tonal"
          @click="recenterMap"
        />
        <v-btn
          color="secondary"
          :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
          :text="fullscreenButtonLabel"
          variant="tonal"
          @click="toggleFullscreen"
        />
      </div>
    </div>

    <div
      ref="mapShell"
      class="stations-map-shell"
      :class="{ 'stations-map-shell--fullscreen': isFullscreen }"
    >
      <div class="stations-map__aurora stations-map__aurora--top" />
      <div class="stations-map__aurora stations-map__aurora--bottom" />

      <v-btn
        v-if="smAndDown"
        class="stations-map__legend-toggle"
        color="white"
        :prepend-icon="showLegend ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
        rounded="pill"
        size="small"
        variant="elevated"
        @click="toggleLegend"
      >
        {{ showLegend ? "Masquer" : "Repères" }}
      </v-btn>

      <div
        v-if="showLegend"
        class="stations-map__legend"
      >
        <div class="map-legend__item">
          <span class="map-legend__dot map-legend__dot--user" />
          <span>Votre position</span>
        </div>
        <div class="map-legend__item">
          <span class="map-legend__dot map-legend__dot--station" />
          <span>Station</span>
        </div>
        <div class="map-legend__item">
          <span class="map-legend__status map-legend__status--open" />
          <span>Ouverte</span>
        </div>
        <div class="map-legend__item">
          <span class="map-legend__status map-legend__status--closed" />
          <span>Fermee</span>
        </div>
        <div class="map-legend__item">
          <span class="map-legend__ring" />
          <span>Zone de recherche</span>
        </div>
        <div
          v-if="hasBestStation"
          class="map-legend__item"
        >
          <span class="map-legend__dot map-legend__dot--best" />
          <span>Meilleur prix recommande</span>
        </div>
      </div>

      <div
        v-if="smAndDown"
        class="stations-map__mobile-tip"
      >
        Astuce : ouvre la carte en plein ecran pour bouger plus facilement.
      </div>

      <div class="stations-map__credit">
        Fond CARTO + OpenStreetMap
      </div>

      <div
        ref="mapElement"
        class="stations-map"
      />

      <transition name="map-sheet">
        <div
          v-if="selectedStation"
          class="map-selection-sheet"
          :class="{ 'map-selection-sheet--dark': themeName === 'fuelDark' }"
        >
          <div
            v-if="smAndDown"
            class="map-selection-sheet__handle"
          />

          <div class="d-flex align-start justify-space-between ga-3 mb-2">
            <div>
              <p class="text-caption mb-1">{{ selectedStation.brand }}</p>
              <h4 class="map-selection-sheet__title mb-1">{{ selectedStation.name }}</h4>
              <p class="text-body-2 mb-0">{{ selectedStation.address }}, {{ selectedStation.city }}</p>
            </div>

            <v-btn
              :color="selectedStation.isFavorite ? 'accent' : 'secondary'"
              :icon="selectedStation.isFavorite ? 'mdi-star' : 'mdi-star-outline'"
              size="small"
              variant="text"
              @click="stationStore.toggleFavorite(selectedStation.id)"
            />
          </div>

          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip
              color="primary"
              variant="tonal"
            >
              {{ selectedFuel }} - {{ formatPrice(selectedStation.selectedFuelPrice) }}
            </v-chip>
            <v-chip
              class="soft-chip"
              prepend-icon="mdi-map-marker-distance"
              variant="text"
            >
              {{ formatDistance(selectedStation.distanceKm) }}
            </v-chip>
            <v-chip
              class="soft-chip"
              prepend-icon="mdi-car-clock"
              variant="text"
            >
              ~ {{ formatDriveTime(selectedStation.estimatedDriveMinutes) }}
            </v-chip>
          </div>

          <div class="map-selection-sheet__actions">
            <v-btn
              color="secondary"
              prepend-icon="mdi-eye-outline"
              variant="tonal"
              :block="smAndDown"
              @click="openSelectedStation"
            >
              Voir details
            </v-btn>
            <v-btn
              color="primary"
              :href="getGoogleMapsDirectionsUrl(selectedStation.lat, selectedStation.lng)"
              prepend-icon="mdi-navigation-variant-outline"
              :block="smAndDown"
              target="_blank"
            >
              Y aller
            </v-btn>
          </div>
        </div>
      </transition>
    </div>
  </v-card>
</template>

<style scoped>
.stations-map-shell {
  position: relative;
  padding: 0 1rem 1rem;
}

.stations-map-shell--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  padding: 1rem;
  background:
    radial-gradient(circle at top left, rgba(94, 234, 212, 0.18), transparent 24%),
    radial-gradient(circle at top right, rgba(255, 209, 102, 0.16), transparent 18%),
    rgba(10, 16, 24, 0.72);
  backdrop-filter: blur(18px);
}

.stations-map {
  min-height: 24rem;
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 18px 40px rgba(15, 23, 42, 0.12);
}

.stations-map-shell--fullscreen .stations-map {
  min-height: calc(100vh - 2rem);
}

.stations-map__aurora {
  position: absolute;
  z-index: 2;
  width: 10rem;
  height: 10rem;
  border-radius: 999px;
  filter: blur(28px);
  pointer-events: none;
  opacity: 0.38;
}

.stations-map__aurora--top {
  top: -1.5rem;
  left: 1rem;
  background: rgba(94, 234, 212, 0.65);
}

.stations-map__aurora--bottom {
  right: 1.5rem;
  bottom: 1rem;
  background: rgba(255, 209, 102, 0.42);
}

.stations-map__legend-toggle {
  position: absolute;
  z-index: 4;
  top: 1rem;
  right: 1.25rem;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
}

.stations-map__legend {
  position: absolute;
  z-index: 3;
  top: 1rem;
  left: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: calc(100% - 4rem);
  padding: 0.7rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
}

.stations-map__mobile-tip {
  position: absolute;
  z-index: 3;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 7rem;
  padding: 0.65rem 0.8rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.74);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  backdrop-filter: blur(10px);
}

.stations-map__credit {
  position: absolute;
  z-index: 3;
  right: 2rem;
  bottom: 2rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.7);
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.74rem;
  letter-spacing: 0.01em;
  backdrop-filter: blur(10px);
}

.map-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.82);
}

.map-legend__dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.65);
}

.map-legend__status {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
}

.map-legend__status--open {
  background: #0f766e;
}

.map-legend__status--closed {
  background: #b91c1c;
}

.map-legend__ring {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px dashed rgba(15, 118, 110, 0.9);
  border-radius: 999px;
}

.map-legend__dot--user {
  background: #0f172a;
}

.map-legend__dot--station {
  background: #0f766e;
}

.map-legend__dot--best {
  background: #ffb703;
}

.map-selection-sheet {
  position: absolute;
  z-index: 4;
  right: 1.25rem;
  bottom: 1.25rem;
  left: 1.25rem;
  padding: 1rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 22px 50px rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(18px);
}

.map-selection-sheet--dark {
  border-color: rgba(125, 211, 252, 0.12);
  background: linear-gradient(180deg, rgba(7, 22, 28, 0.92), rgba(13, 31, 39, 0.9));
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.35);
  color: rgba(226, 247, 241, 0.82);
}

.map-selection-sheet__handle {
  width: 3.2rem;
  height: 0.28rem;
  margin: 0 auto 0.9rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.6);
}

.map-selection-sheet--dark .map-selection-sheet__title {
  color: #f8fafc;
}

.map-selection-sheet--dark .text-caption,
.map-selection-sheet--dark .text-body-2 {
  color: rgba(226, 247, 241, 0.78) !important;
}

.map-selection-sheet--dark .soft-chip {
  color: rgba(226, 247, 241, 0.88);
}

.map-selection-sheet__title {
  font-family: var(--ff-display);
  font-size: 1.05rem;
  line-height: 1.15;
}

.map-selection-sheet__actions {
  display: grid;
  gap: 0.65rem;
}

.map-sheet-enter-active,
.map-sheet-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.map-sheet-enter-from,
.map-sheet-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

:global(.v-theme--fuelDark) .stations-map {
  border-color: rgba(125, 211, 252, 0.1);
}

:global(.v-theme--fuelDark) .stations-map__legend {
  border-color: rgba(125, 211, 252, 0.12);
  background: rgba(7, 22, 28, 0.74);
}

:global(.v-theme--fuelDark) .map-legend__item {
  color: rgba(226, 247, 241, 0.86);
}

:global(.v-theme--fuelDark) .map-legend__ring {
  border-color: rgba(94, 234, 212, 0.9);
}

:global(.v-theme--fuelDark) .stations-map__credit {
  background: rgba(7, 22, 28, 0.76);
  color: rgba(226, 247, 241, 0.8);
}

@media (min-width: 960px) {
  .stations-map-shell {
    padding: 0 1.5rem 1.5rem;
  }

  .stations-map {
    min-height: 30rem;
  }

  .map-selection-sheet {
    width: min(27rem, calc(100% - 3rem));
    left: auto;
  }
}

@media (max-width: 600px) {
  .stations-map-shell {
    padding: 0 0.85rem 0.85rem;
  }

  .stations-map {
    min-height: 34rem;
    border-radius: 24px;
  }

  .stations-map__legend {
    top: 3.9rem;
    left: 1.2rem;
    right: 1.2rem;
    max-width: 14rem;
    padding: 0.65rem 0.7rem;
    gap: 0.45rem;
  }

  .stations-map__credit {
    left: 1.2rem;
    right: auto;
    bottom: 10.9rem;
  }

  .stations-map__mobile-tip {
    bottom: 8rem;
  }

  .map-selection-sheet {
    right: 0.85rem;
    bottom: 0.85rem;
    left: 0.85rem;
    padding: 0.9rem;
    border-radius: 22px;
  }

  .map-selection-sheet__actions :global(.v-btn) {
    min-height: 2.9rem;
  }
}
</style>
