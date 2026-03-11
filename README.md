# FuelFlash

Prototype mobile-first de comparaison de prix des carburants, construit avec Vue 3, Vite, Vuetify, Pinia, Vue Router, Leaflet et Chart.js.

## Fonctionnalites

- geolocalisation navigateur avec gestion du refus et erreurs
- fallback manuel via positions simulees et recherche libre par ville/adresse
- donnees live DGCCRF via `prix-carburants.gouv.fr`
- historique de prix enrichi via le dataset quotidien officiel
- comparateur par carburant `SP95`, `SP98`, `Diesel`, `E85`, `GPL`
- tri par prix, distance, economies, favoris
- deduplication de stations tres proches
- carte interactive avec clustering, rayon reel, fiche mobile, temps de trajet estime et navigation GPS
- favoris persistants
- theme clair / sombre
- tests unitaires Vitest et test UI Playwright

## Stack

- Vue 3
- Vite
- TypeScript
- Vuetify
- Vue Router
- Pinia
- Leaflet + `leaflet.markercluster`
- Chart.js + `vue-chartjs`
- Vitest
- Playwright

## Installation

```bash
npm install
npm run dev
```

Application locale par defaut: `http://localhost:3000`

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test:unit
npm run test:e2e
npm test
```

## Arborescence

```text
src/
  components/
    common/
    filters/
    layout/
    map/
    station/
  composables/
  data/
  plugins/
  router/
  services/
  stores/
  styles/
  test/
  types/
  utils/
  views/
tests/
  e2e/
```

## Architecture

- [src/services/apiClient.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/apiClient.ts): client HTTP commun et erreurs API centralisees
- [src/services/fuelApi.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/fuelApi.ts): appels aux datasets officiels carburants
- [src/services/geocodingService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/geocodingService.ts): geocodage libre via Nominatim
- [src/services/osmService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/osmService.ts): enrichissement ponctuel d'enseigne via OpenStreetMap
- [src/services/stationService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/stationService.ts): mapping, normalisation, deduplication, tri, historique
- [src/stores/fuelStations.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/stores/fuelStations.ts): etat global, persistance, filtres, favoris, position
- [src/composables/useGeolocation.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/composables/useGeolocation.ts): acces geolocalisation navigateur
- [src/utils/geo.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/utils/geo.ts): distance Haversine et temps de trajet estime

## Remplacer plus tard par une vraie API

1. conserver [src/types/station.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/types/station.ts) comme contrat unique entre API, store et UI
2. remplacer les endpoints dans [src/services/fuelApi.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/fuelApi.ts) par votre backend
3. garder [src/services/apiClient.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/apiClient.ts) pour la gestion d'erreurs commune
4. conserver [src/services/stationService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/stationService.ts) comme couche de mapping/metier pour ne pas coupler les vues a la forme brute de l'API
5. faire evoluer [src/stores/fuelStations.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/stores/fuelStations.ts) sans changer les composants tant que le format `FuelStation` reste stable
