# FuelFlash

Prototype mobile-first de comparaison de prix des carburants, construit avec Vue 3, Vite, Vuetify, Pinia, Vue Router, Leaflet et Chart.js.

## Fonctionnalites

- geolocalisation navigateur avec gestion du refus et erreurs
- fallback manuel via positions simulees et recherche libre par ville/adresse
- donnees live DGCCRF via `prix-carburants.gouv.fr`
- historique de prix enrichi via le dataset quotidien officiel
- historique local hydrate en batch via le dataset quotidien officiel
- comparateur par carburant `SP95`, `SP98`, `Diesel`, `E85`, `GPL`
- tri par prix, distance, economies, favoris
- mode `plein malin` avec volume reservoir, consommation et gain net apres detour
- deduplication de stations tres proches
- carte interactive avec clustering, rayon reel, fiche mobile, temps de trajet estime et navigation GPS
- favoris persistants
- alertes favoris et indicateurs de fraicheur des donnees
- theme clair / sombre
- compatibilite PWA avec installation sur mobile et desktop
- proxy backend leger optionnel pour DGCCRF, geocodage et Europe live
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
- `vite-plugin-pwa`
- Vitest
- Playwright

## Installation

```bash
npm install
npm run dev
```

Application locale par defaut: `http://localhost:3000`

La build de production genere aussi le manifest web et le service worker PWA pour rendre l'application installable.

## Variables d'environnement

Toutes les variables listees ci-dessous sont optionnelles: si elles ne sont pas definies, FuelFlash utilise les valeurs de repli configurees dans l'application. Dupliquez `.env.example` en `.env` pour personnaliser votre environnement local.

| Variable | Obligatoire | Exemple | Description |
| --- | --- | --- | --- |
| `VITE_DEFAULT_RADIUS_KM` | Optionnelle | `10` | Rayon de recherche initial autour de la position utilisateur. |
| `VITE_RECOMMENDED_FOCUS_RADIUS_KM` | Optionnelle | `8` | Rayon conseille pour mettre en avant les stations les plus proches. |
| `VITE_STATION_RELOAD_DEBOUNCE_MS` | Optionnelle | `250` | Delai d'anti-rebond avant de recharger la liste de stations. |
| `VITE_DEFAULT_TANK_VOLUME_LITERS` | Optionnelle | `50` | Volume de reservoir pre-rempli dans les calculs de plein. |
| `VITE_DEFAULT_CONSUMPTION_L_PER_100KM` | Optionnelle | `6.5` | Consommation moyenne utilisee pour les estimations de trajet. |
| `VITE_DEFAULT_FAVORITE_ALERT_PRICE` | Optionnelle | `1.7` | Seuil de prix par defaut pour les alertes sur favoris. |
| `VITE_GEOCODING_SEARCH_DEBOUNCE_MS` | Optionnelle | `300` | Delai d'anti-rebond pour la recherche de ville ou d'adresse. |
| `VITE_PROXY_API_BASE_URL` | Optionnelle | `http://localhost:8787` | Base URL du proxy backend optionnel; lorsqu'elle est definie, les appels carburants, geocodage et Europe transitent par ce proxy. |
| `VITE_GEOCODING_URL` | Optionnelle | `https://nominatim.openstreetmap.org/search` | Endpoint de geocodage utilise en acces direct si aucun proxy n'est configure. |
| `VITE_GEOCODING_TIMEOUT_MS` | Optionnelle | `8000` | Timeout des requetes de geocodage. |
| `VITE_GEOCODING_CACHE_TTL_MS` | Optionnelle | `1800000` | Duree de vie du cache local pour les reponses de geocodage. |
| `VITE_FUEL_API_RECORDS_URL` | Optionnelle | `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records` | Endpoint officiel DGCCRF pour la liste des stations et prix courants. |
| `VITE_FUEL_API_DAILY_HISTORY_URL` | Optionnelle | `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records` | Endpoint officiel de l'historique quotidien des prix. |
| `VITE_FUEL_API_TIMEOUT_MS` | Optionnelle | `10000` | Timeout applique aux appels API carburants. |
| `VITE_FUEL_API_NEARBY_CACHE_TTL_MS` | Optionnelle | `60000` | Duree de cache des recherches de stations proches. |
| `VITE_FUEL_API_DETAIL_CACHE_TTL_MS` | Optionnelle | `300000` | Duree de cache des fiches station/detail. |
| `VITE_FUEL_API_HISTORY_CACHE_TTL_MS` | Optionnelle | `1800000` | Duree de cache de l'historique de prix. |
| `VITE_EUROPE_MARKETS_URL` | Optionnelle | `https://api.example.com/europe/markets` | Endpoint pour les prix Europe live; laissez vide pour desactiver la source directe et/ou passer par le proxy. |
| `VITE_EUROPE_TIMEOUT_MS` | Optionnelle | `12000` | Timeout des appels Europe live. |
| `VITE_EUROPE_CACHE_TTL_MS` | Optionnelle | `21600000` | Duree de cache des donnees Europe live. |
| `VITE_OVERPASS_URL` | Optionnelle | `https://overpass-api.de/api/interpreter` | Endpoint Overpass utilise pour enrichir ponctuellement les stations OpenStreetMap. |
| `VITE_OVERPASS_TIMEOUT_MS` | Optionnelle | `8000` | Timeout des appels Overpass. |
| `VITE_MAP_LIGHT_TILES_URL` | Optionnelle | `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` | URL du fond de carte clair. |
| `VITE_MAP_DARK_TILES_URL` | Optionnelle | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | URL du fond de carte sombre. |

## Scripts

```bash
npm run dev
npm run dev:proxy
npm run dev:full
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

- [src/services/apiClient.ts](./src/services/apiClient.ts): client HTTP commun et erreurs API centralisees
- [src/services/fuelApi.ts](./src/services/fuelApi.ts): appels aux datasets officiels carburants
- [src/services/europeFuelService.ts](./src/services/europeFuelService.ts): fallback local + chargement Europe live via proxy
- [src/services/geocodingService.ts](./src/services/geocodingService.ts): geocodage libre via Nominatim
- [src/services/osmService.ts](./src/services/osmService.ts): enrichissement ponctuel d'enseigne via OpenStreetMap
- [src/services/stationService.ts](./src/services/stationService.ts): mapping, normalisation, deduplication, tri, historique
- [src/stores/fuelStations.ts](./src/stores/fuelStations.ts): etat global, persistance, filtres, favoris, position
- [server/proxy-server.mjs](./server/proxy-server.mjs): proxy optionnel pour centraliser les appels externes et exposer l'Europe live
- [src/composables/useGeolocation.ts](./src/composables/useGeolocation.ts): acces geolocalisation navigateur
- [src/utils/geo.ts](./src/utils/geo.ts): distance Haversine et temps de trajet estime

## Remplacer plus tard par une vraie API

1. conserver [src/types/station.ts](./src/types/station.ts) comme contrat unique entre API, store et UI
2. remplacer les endpoints dans [src/services/fuelApi.ts](./src/services/fuelApi.ts) par votre backend
3. garder [src/services/apiClient.ts](./src/services/apiClient.ts) pour la gestion d'erreurs commune
4. conserver [src/services/stationService.ts](./src/services/stationService.ts) comme couche de mapping/metier pour ne pas coupler les vues a la forme brute de l'API
5. faire evoluer [src/stores/fuelStations.ts](./src/stores/fuelStations.ts) sans changer les composants tant que le format `FuelStation` reste stable
