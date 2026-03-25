<script setup lang="ts">
import { storeToRefs } from "pinia";
import EmptyStateCard from "@/components/common/EmptyStateCard.vue";
import SectionHeading from "@/components/common/SectionHeading.vue";
import FuelInsights from "@/components/insights/FuelInsights.vue";
import { useStationsBootstrap } from "@/composables/useStationsBootstrap";

const stationStore = useStationsBootstrap();
const { selectedFuel, nearbyStations, userPosition, hasResults, isLoading, genericError, isDataUnavailable } =
  storeToRefs(stationStore);
const { radiusKm } = storeToRefs(stationStore);
</script>

<template>
  <v-container class="py-6 py-md-8">
    <section class="mb-6">
      <v-card class="page-hero pa-5 pa-md-7">
        <SectionHeading
          eyebrow="Tendances"
          subtitle="Suivez la dynamique des prix autour de votre zone active avec un graphique hebdomadaire et des comparaisons locales entre carburants."
          title="Analyse locale des prix"
        />
      </v-card>
    </section>

    <v-alert
      v-if="genericError"
      class="mb-6"
      color="error"
      icon="mdi-alert-circle-outline"
      variant="tonal"
    >
      {{ genericError }}
    </v-alert>

    <section v-if="isLoading">
      <v-skeleton-loader
        class="surface-card"
        type="article, image"
      />
    </section>

    <section
      v-else-if="userPosition && hasResults"
      class="mb-6"
    >
      <FuelInsights
        mode="local"
        :selected-fuel="selectedFuel"
        :stations="nearbyStations"
        :user-position="userPosition"
        :radius-km="radiusKm"
      />
    </section>

    <section
      v-else-if="isDataUnavailable"
      class="mb-6"
    >
      <EmptyStateCard
        description="Les donnees stations sont indisponibles. Revenez sur l'accueil pour relancer une zone ou une recherche."
        icon="mdi-database-off-outline"
        title="Donnees indisponibles"
      />
    </section>

    <section v-else>
      <EmptyStateCard
        description="Activez votre position, une ville de demonstration ou une recherche d'adresse depuis l'accueil pour afficher les tendances locales."
        icon="mdi-map-search-outline"
        title="Choisissez d'abord une zone"
      />
    </section>
  </v-container>
</template>

<style scoped>
.page-hero {
  background:
    radial-gradient(circle at top right, rgba(255, 183, 3, 0.14), transparent 26%),
    linear-gradient(135deg, rgba(15, 118, 110, 0.1), rgba(3, 105, 161, 0.08)),
    rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-soft);
}

.v-theme--fuelDark .page-hero {
  background:
    radial-gradient(circle at top right, rgba(255, 209, 102, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(94, 234, 212, 0.12), rgba(125, 211, 252, 0.08)),
    rgba(13, 31, 39, 0.72);
  border-color: rgba(148, 163, 184, 0.08);
}
</style>
