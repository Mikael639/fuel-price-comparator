<script setup lang="ts">
import { watch } from "vue";
import { useTheme } from "vuetify";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useFuelStationsStore } from "@/stores/fuelStations";

const stationStore = useFuelStationsStore();
const theme = useTheme();

watch(
  () => stationStore.themeName,
  (value) => {
    theme.change(value);
  },
  { immediate: true },
);
</script>

<template>
  <v-app class="app-shell">
    <div class="app-shell__glow app-shell__glow--left" />
    <div class="app-shell__glow app-shell__glow--right" />

    <AppHeader />

    <v-main>
      <router-view v-slot="{ Component, route }">
        <transition
          mode="out-in"
          name="page-fade"
        >
          <component
            :is="Component"
            :key="route.fullPath"
          />
        </transition>
      </router-view>
    </v-main>
  </v-app>
</template>
