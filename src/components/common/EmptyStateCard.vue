<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <v-card class="surface-card pa-6 text-center">
    <v-avatar
      class="mb-4"
      color="primary"
      variant="tonal"
    >
      <v-icon :icon="icon" />
    </v-avatar>
    <h3 class="text-h6 mb-2">{{ title }}</h3>
    <p class="empty-state__description mb-4">{{ description }}</p>
    <slot />
  </v-card>
</template>

<style scoped>
.empty-state__description {
  max-width: 32rem;
  margin-inline: auto;
  color: rgba(15, 23, 42, 0.66);
}

.v-theme--fuelDark .empty-state__description {
  color: rgba(226, 247, 241, 0.7);
}
</style>
