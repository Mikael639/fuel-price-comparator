# FuelFlash

Prototype mobile-first de comparaison de prix des carburants migre vers React + Vite + TypeScript + Tailwind + Zustand + React Router + react-leaflet.

## Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- composants UI style shadcn
- Zustand
- React Router
- react-leaflet + leaflet.markercluster
- Chart.js + react-chartjs-2
- Vitest
- Playwright

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
- dark mode
- tests unitaires Vitest et test UI Playwright

## Installation

```bash
npm install
npm run dev
```

Application locale par defaut : `http://localhost:3000`

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
  app/
  components/
    common/
    filters/
    layout/
    map/
    station/
    ui/
  data/
  hooks/
  lib/
  routes/
  services/
  store/
  styles/
  test/
  types/
  utils/
tests/
  e2e/
```

## Architecture

- [src/services/apiClient.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/apiClient.ts) : client HTTP commun et erreurs API centralisees
- [src/services/fuelApi.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/fuelApi.ts) : appels aux datasets officiels carburants
- [src/services/geocodingService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/geocodingService.ts) : geocodage libre via Nominatim
- [src/services/osmService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/osmService.ts) : enrichissement ponctuel d'enseigne via OpenStreetMap
- [src/services/stationService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/stationService.ts) : mapping, normalisation, deduplication, tri, historique
- [src/store/useFuelStationsStore.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/store/useFuelStationsStore.ts) : etat global Zustand, persistance, filtres, favoris, position
- [src/hooks/useGeolocation.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/hooks/useGeolocation.ts) : acces geolocalisation navigateur
- [src/hooks/useFuelStationsViewModel.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/hooks/useFuelStationsViewModel.ts) : derivees UI a partir du store
- [src/components/map/StationsMap.tsx](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/components/map/StationsMap.tsx) : carte react-leaflet + clustering
- [src/routes/HomePage.tsx](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/routes/HomePage.tsx) : page principale
- [src/routes/StationDetailPage.tsx](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/routes/StationDetailPage.tsx) : page detail station

## Notes de migration

- les composables Vue ont ete remplaces par des hooks React
- Pinia a ete remplace par Zustand
- Vue Router a ete remplace par React Router
- Vuetify a ete remplace par une couche Tailwind avec composants UI style shadcn
- la logique metier, les datasets mock, les services API, les utilitaires geo et les tests metier ont ete conserves

## Remplacer plus tard par une vraie API

1. conserver [src/types/station.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/types/station.ts) comme contrat unique entre API, store et UI
2. remplacer les endpoints dans [src/services/fuelApi.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/fuelApi.ts) par votre backend
3. garder [src/services/apiClient.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/apiClient.ts) pour la gestion d'erreurs commune
4. conserver [src/services/stationService.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/services/stationService.ts) comme couche de mapping metier
5. faire evoluer [src/store/useFuelStationsStore.ts](/c:/Users/mikae/Mika2026/fuel-price-comparator/src/store/useFuelStationsStore.ts) sans changer les composants tant que le format `FuelStation` reste stable
