<script setup lang="ts">
import { computed } from "vue";
import { getAppleMapsUrl, getGoogleMapsDirectionsUrl, getWazeUrl } from "@/utils/navigation";

const props = defineProps<{
  lat: number;
  lng: number;
  color?: string;
  variant?: "flat" | "text" | "elevated" | "tonal" | "outlined" | "plain";
}>();

const buttonColor = computed(() => props.color ?? "primary");
const buttonVariant = computed(() => props.variant ?? "elevated");

const googleMapsUrl = computed(() => getGoogleMapsDirectionsUrl(props.lat, props.lng));
const wazeUrl = computed(() => getWazeUrl(props.lat, props.lng));
const appleMapsUrl = computed(() => getAppleMapsUrl(props.lat, props.lng));

const openUrl = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <v-menu>
    <template #activator="{ props: menuProps }">
      <v-btn
        :color="buttonColor"
        :variant="buttonVariant"
        prepend-icon="mdi-navigation-variant-outline"
        v-bind="menuProps"
      >
        <span>Y aller</span>
        <v-icon end icon="mdi-menu-down" />
      </v-btn>
    </template>

    <v-list class="pa-2 rounded-xl elevation-3 mt-1" slim>
      <v-list-item
        class="rounded-lg mb-1"
        prepend-icon="mdi-google-maps"
        title="Google Maps"
        @click="openUrl(googleMapsUrl)"
      />
      <v-list-item
        class="rounded-lg mb-1"
        prepend-icon="mdi-car-connected"
        title="Waze"
        @click="openUrl(wazeUrl)"
      />
      <v-list-item
        class="rounded-lg"
        prepend-icon="mdi-apple"
        title="Apple Plans"
        @click="openUrl(appleMapsUrl)"
      />
    </v-list>
  </v-menu>
</template>
