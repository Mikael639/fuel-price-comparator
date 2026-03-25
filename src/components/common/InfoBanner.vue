<script setup lang="ts">
import { computed } from "vue";

type BannerColor = "info" | "secondary" | "accent" | "warning" | "error";

interface BannerMessage {
  key: string;
  message: string | null;
  color: BannerColor;
  icon: string;
}

const props = defineProps<{
  messages: BannerMessage[];
}>();

const activeMessage = computed(
  () => props.messages.find((entry) => typeof entry.message === "string" && entry.message.trim().length > 0) ?? null,
);
</script>

<template>
  <transition name="banner-fade">
    <v-alert
      v-if="activeMessage"
      :key="activeMessage.key"
      :color="activeMessage.color"
      :icon="activeMessage.icon"
      class="mb-6"
      variant="tonal"
    >
      {{ activeMessage.message }}
    </v-alert>
  </transition>
</template>

<style scoped>
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
