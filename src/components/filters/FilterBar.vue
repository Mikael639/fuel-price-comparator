<script setup lang="ts">
import { computed } from "vue";
import { sortModeCopy } from "@/utils/format";
import type { FuelType, ServiceType, SortMode } from "@/types/station";

const props = defineProps<{
  selectedFuel: FuelType;
  radiusKm: number;
  openOnly: boolean;
  selectedServices: ServiceType[];
  sortMode: SortMode;
  tankVolumeLiters: number;
  consumptionLitersPer100Km: number;
  favoriteAlertPrice: number | null;
  fuelOptions: readonly FuelType[];
  serviceOptions: readonly ServiceType[];
}>();

const emit = defineEmits<{
  "update:selectedFuel": [fuel: FuelType];
  "update:radiusKm": [value: number];
  "update:openOnly": [value: boolean];
  "update:selectedServices": [value: ServiceType[]];
  "update:sortMode": [value: SortMode];
  "update:tankVolumeLiters": [value: number];
  "update:consumptionLitersPer100Km": [value: number];
  "update:favoriteAlertPrice": [value: number | null];
}>();

const sortItems = computed(() =>
  (Object.keys(sortModeCopy) as SortMode[]).map((value) => ({
    title: sortModeCopy[value],
    value,
  })),
);

const alertPriceText = computed(() =>
  props.favoriteAlertPrice == null ? "" : props.favoriteAlertPrice.toFixed(3).replace(".", ","),
);
</script>

<template>
  <v-card class="surface-card pa-4 pa-md-5">
    <div class="d-flex flex-column ga-5">
      <div>
        <p class="text-overline mb-2">Filtres</p>
        <v-chip-group
          :model-value="selectedFuel"
          column
          mandatory
          @update:model-value="(value) => emit('update:selectedFuel', value)"
        >
          <v-chip
            v-for="fuel in fuelOptions"
            :key="fuel"
            :value="fuel"
            color="primary"
            filter
            size="large"
            variant="elevated"
          >
            {{ fuel }}
          </v-chip>
        </v-chip-group>
      </div>

      <div class="d-flex flex-column flex-lg-row ga-4 align-start align-lg-center">
        <div class="flex-grow-1 w-100">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2">Rayon de recherche</span>
            <strong>{{ radiusKm }} km</strong>
          </div>
          <v-slider
            :max="25"
            :min="2"
            :model-value="radiusKm"
            :step="1"
            color="primary"
            hide-details
            thumb-label
            @update:model-value="(value) => emit('update:radiusKm', Number(value))"
          />
        </div>

        <v-select
          class="filter-bar__select"
          :items="sortItems"
          :model-value="sortMode"
          hide-details
          item-title="title"
          item-value="value"
          label="Trier par"
          prepend-inner-icon="mdi-sort"
          @update:model-value="(value) => emit('update:sortMode', value as SortMode)"
        />

        <v-switch
          :model-value="openOnly"
          class="filter-bar__switch"
          color="primary"
          hide-details
          inset
          label="Stations ouvertes uniquement"
          @update:model-value="(value) => emit('update:openOnly', Boolean(value))"
        />
      </div>

      <div class="filter-bar__planner">
        <div>
          <p class="text-overline mb-1">Plein malin</p>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Calcule les gains nets selon votre reservoir et le cout du detour.
          </p>
        </div>

        <div class="d-flex flex-column flex-lg-row ga-4 align-start align-lg-center">
          <div class="flex-grow-1 w-100">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Volume du reservoir</span>
              <strong>{{ tankVolumeLiters }} L</strong>
            </div>
            <v-slider
              :max="90"
              :min="20"
              :model-value="tankVolumeLiters"
              :step="5"
              color="secondary"
              hide-details
              thumb-label
              @update:model-value="(value) => emit('update:tankVolumeLiters', Number(value))"
            />
          </div>

          <div class="flex-grow-1 w-100">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Conso estimee</span>
              <strong>{{ consumptionLitersPer100Km.toFixed(1).replace(".", ",") }} L/100</strong>
            </div>
            <v-slider
              :max="14"
              :min="3"
              :model-value="consumptionLitersPer100Km"
              :step="0.5"
              color="secondary"
              hide-details
              thumb-label
              @update:model-value="(value) => emit('update:consumptionLitersPer100Km', Number(value))"
            />
          </div>

          <v-text-field
            class="filter-bar__alert-field"
            clearable
            :model-value="alertPriceText"
            hint="Vide pour couper l'alerte"
            label="Seuil alerte favoris"
            persistent-hint
            prefix="EUR/L"
            @click:clear="emit('update:favoriteAlertPrice', null)"
            @update:model-value="
              (value) => {
                const normalized = String(value ?? '').replace(',', '.').trim();
                const parsed = normalized ? Number(normalized) : null;
                emit('update:favoriteAlertPrice', parsed != null && Number.isFinite(parsed) ? parsed : null);
              }
            "
          />
        </div>
      </div>

      <v-select
        :items="serviceOptions"
        :model-value="selectedServices"
        chips
        clearable
        closable-chips
        label="Services souhaites"
        multiple
        prepend-inner-icon="mdi-tune-variant"
        @update:model-value="(value) => emit('update:selectedServices', value as ServiceType[])"
      />
    </div>
  </v-card>
</template>

<style scoped>
.filter-bar__switch {
  min-width: 260px;
}

.filter-bar__select {
  min-width: 200px;
}

.filter-bar__planner {
  padding: 1rem;
  border-radius: 20px;
  background: rgba(15, 118, 110, 0.05);
}

.filter-bar__alert-field {
  min-width: 220px;
}

.v-theme--fuelDark .filter-bar__planner {
  background: rgba(94, 234, 212, 0.08);
}
</style>
