<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useFuelStationsStore } from "@/stores/fuelStations";

const stationStore = useFuelStationsStore();
const route = useRoute();

const isDark = computed(() => stationStore.themeName === "fuelDark");
const navigationItems = [
  { label: "Accueil", to: { name: "home" } },
  { label: "Tendances", to: { name: "insights" } },
  { label: "Europe", to: { name: "europe" } },
];
const activeRouteName = computed(() => String(route.name ?? "home"));

const toggleTheme = () => {
  stationStore.setTheme(isDark.value ? "fuelLight" : "fuelDark");
};
</script>

<template>
  <v-app-bar
    class="header-bar"
    flat
  >
    <v-container class="header-bar__inner py-3">
      <div class="d-flex align-center ga-3">
        <router-link
          class="header-bar__brand"
          :to="{ name: 'home' }"
        >
          <v-avatar
            class="header-bar__badge"
            size="46"
          >
            <v-icon
              color="white"
              icon="mdi-fuel"
              size="24"
            />
          </v-avatar>

          <div>
            <p class="header-bar__eyebrow mb-1">Comparateur carburants geolocalise</p>
            <h1 class="header-bar__title">FuelFlash</h1>
          </div>
        </router-link>
      </div>

      <div class="header-bar__actions">
        <nav class="header-bar__nav">
          <v-btn
            v-for="item in navigationItems"
            :key="item.label"
            class="header-bar__nav-link"
            :color="activeRouteName === String(item.to.name) ? 'secondary' : undefined"
            :to="item.to"
            :variant="activeRouteName === String(item.to.name) ? 'flat' : 'text'"
          >
            {{ item.label }}
          </v-btn>
        </nav>

        <v-btn
          :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
          class="header-bar__theme"
          color="secondary"
          variant="tonal"
          @click="toggleTheme"
        />
      </div>
    </v-container>
  </v-app-bar>
</template>

<style scoped>
.header-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.header-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-bar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.header-bar__badge {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-info)));
  box-shadow: 0 12px 30px rgba(15, 118, 110, 0.25);
}

.header-bar__eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(15, 23, 42, 0.58);
}

.header-bar__title {
  margin: 0;
  font-family: var(--ff-display);
  font-size: 1.15rem;
  letter-spacing: -0.04em;
}

.header-bar__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-bar__nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.header-bar__nav-link {
  min-width: 0;
  border-radius: 999px;
}

.header-bar__theme {
  backdrop-filter: blur(12px);
}

.v-theme--fuelDark .header-bar {
  background: rgba(13, 31, 39, 0.68);
  border-color: rgba(148, 163, 184, 0.08);
}

.v-theme--fuelDark .header-bar__eyebrow {
  color: rgba(226, 247, 241, 0.62);
}

.v-theme--fuelDark .header-bar__nav {
  background: rgba(8, 20, 28, 0.62);
  border-color: rgba(148, 163, 184, 0.08);
}

@media (max-width: 720px) {
  .header-bar__inner {
    flex-wrap: wrap;
  }

  .header-bar__actions {
    width: 100%;
    justify-content: space-between;
  }

  .header-bar__nav {
    flex: 1;
    justify-content: space-between;
    overflow-x: auto;
  }
}
</style>
