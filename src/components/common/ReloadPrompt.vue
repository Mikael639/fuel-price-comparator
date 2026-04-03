<script setup lang="ts">
import { ref } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW({
  onRegisteredSW(swUrl: string, r?: ServiceWorkerRegistration) {
    if (r) {
      setInterval(
        () => {
          if (!(!r.installing && navigator)) return;
          if ("connection" in navigator && !navigator.onLine) return;
          r.update();
        },
        60 * 60 * 1000,
      );
    }
  },
});

const close = async () => {
  offlineReady.value = false;
  needRefresh.value = false;
};

// Install prompt logic
const showInstallPrompt = ref(false);
const deferredPrompt = ref<any>(null);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt.value = e;
  showInstallPrompt.value = true;
});

const installApp = async () => {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === "accepted") {
    showInstallPrompt.value = false;
  }
  deferredPrompt.value = null;
};
</script>

<template>
  <div class="pwa-prompt-container">
    <v-snackbar
      v-model="needRefresh"
      color="primary"
      location="bottom right"
      timeout="-1"
      z-index="9999"
    >
      Une nouvelle version est disponible !
      <template #actions>
        <v-btn color="white" variant="text" @click="updateServiceWorker()">
          Mettre à jour
        </v-btn>
        <v-btn color="white" icon="mdi-close" variant="text" @click="close" />
      </template>
    </v-snackbar>

    <v-snackbar
      v-model="offlineReady"
      color="success"
      location="bottom right"
      timeout="4000"
      z-index="9999"
    >
      L'application est prête pour une utilisation hors-ligne.
      <template #actions>
        <v-btn color="white" icon="mdi-close" variant="text" @click="close" />
      </template>
    </v-snackbar>

    <v-snackbar
      v-model="showInstallPrompt"
      color="secondary"
      location="bottom left"
      timeout="-1"
      z-index="9998"
    >
      <div class="d-flex align-center ga-3">
        <v-icon icon="mdi-cellphone-arrow-down" />
        Installer FuelFlash sur cet appareil ?
      </div>
      <template #actions>
        <v-btn color="white" variant="text" @click="installApp">
          Installer
        </v-btn>
        <v-btn color="white" icon="mdi-close" variant="text" @click="showInstallPrompt = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.pwa-prompt-container {
  pointer-events: none;
}
.pwa-prompt-container > * {
  pointer-events: auto;
}
</style>
