<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
}>();
</script>

<template>
  <div class="section-heading">
    <p
      v-if="eyebrow"
      class="section-heading__eyebrow mb-2"
    >
      {{ eyebrow }}
    </p>
    <h2 class="section-heading__title section-title">
      {{ title }}
    </h2>
    <p
      v-if="subtitle"
      class="section-heading__subtitle"
    >
      {{ subtitle }}
    </p>
  </div>
</template>

<style scoped>
.section-heading__eyebrow {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
}

.section-heading__title {
  margin: 0;
  font-size: clamp(1.45rem, 2vw, 2.4rem);
  line-height: 1.05;
}

.section-heading__subtitle {
  margin: 0.65rem 0 0;
  max-width: 42rem;
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.6;
}

.v-theme--fuelDark .section-heading__subtitle {
  color: rgba(226, 247, 241, 0.72);
}
</style>
