<script setup lang="ts">
import type { FavoriteAlert } from "@/types/station";

defineProps<{
  alerts: FavoriteAlert[];
}>();
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <v-alert
      v-for="alert in alerts"
      :key="alert.id"
      :color="alert.severity"
      variant="tonal"
    >
      <div class="d-flex flex-column ga-1">
        <strong>{{ alert.title }}</strong>
        <span>{{ alert.description }}</span>
      </div>
    </v-alert>
  </div>
</template>
