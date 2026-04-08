# FuelFlash

Comparateur React de prix des carburants en France, avec recherche locale, mode trajet, carte interactive, favoris persistants et pages de tendances.

## Ce que fait l'app

- Recherche une ville ou une adresse de depart
- Compare les stations autour de vous ou le long d'un vrai trajet
- Affine les meilleurs candidats avec un detour route plus realiste
- Affiche l'historique officiel des prix quand il est disponible
- Garde les favoris et les preferences apres rechargement
- Propose des liens GPS Google Maps, Waze et Apple Maps

## Stack

- React 19
- TypeScript
- Zustand
- Tailwind CSS
- Leaflet
- Vite + PWA
- Node.js pour le proxy local

## Lancement local

### 1. Installer

```bash
npm install
```

### 2. Lancer frontend + proxy

```bash
$env:VITE_PROXY_API_BASE_URL="http://localhost:8787"
npm run dev:full
```

Par defaut :

- Frontend : `http://localhost:3000`
- Proxy : `http://localhost:8787`
- Healthcheck proxy : `http://localhost:8787/health`

### 3. Lancer separement si besoin

```bash
npm run dev:proxy
npm run dev
```

## Variables d'environnement

Copiez `.env.example` si vous voulez ajuster le comportement.

`.env.production` est charge automatiquement par Vite au build si vous avez besoin de fixer la configuration de prod.

Les plus utiles :

- `VITE_PROXY_API_BASE_URL`
- `VITE_DEFAULT_RADIUS_KM`
- `VITE_STATION_RELOAD_DEBOUNCE_MS`
- `VITE_GEOCODING_SEARCH_DEBOUNCE_MS`
- `VITE_ROUTING_TIMEOUT_MS`

## Fonctionnement des donnees

- Les stations et historiques viennent prioritairement des jeux officiels DGCCRF.
- Le geocodage passe par Nominatim.
- L'enrichissement d'enseignes passe par Overpass / OpenStreetMap.
- Le calcul d'itineraire passe par OSRM.
- Le proxy local ajoute du cache et des messages d'erreur plus propres.

## UX et resilence

- Recherche depart et destination en live avec debounce et annulation des requetes
- Cooldown geocodage en cas de `429 Too Many Requests`
- Corridor de trajet reel, pas seulement une fusion depart / arrivee
- Affinage des detours reels sur les stations les plus prometteuses
- Cache proxy pour le geocodage, l'itineraire, OSM et l'Europe
- Persistance des favoris, filtres et derniere position recherchee

## Scripts

```bash
npm run dev
npm run dev:proxy
npm run dev:full
npm run build
npm run preview
npm run lint
npm run test
npm run test:unit
npm run test:e2e
```

## Deploiement

Le repo conserve un script PowerShell de deploiement manuel :

```powershell
.\scripts\deploy-oracle.ps1 -Server user@host -KeyPath C:\chemin\vers\cle.pem
```

Il construit `dist/`, cree une archive puis l'envoie sur le serveur cible avant d'executer la commande distante configuree.

## Tests

Unitaires :

```bash
npx vitest run
```

E2E :

```bash
npx playwright test tests/e2e/app.spec.ts
```

Les tests couvrent notamment :

- recherche d'adresse
- ouverture d'une fiche station
- activation du mode trajet
- geocodage limite par le fournisseur public
- repli trajet quand le routing tombe
- persistance des favoris apres reload

## Depannage

### "Le geocodeur public est temporairement limite"

Le fournisseur public a probablement renvoye un `429`.

Ce qui est en place :

- message utilisateur explicite
- cooldown local temporaire
- cache des recherches recentes

Attendez quelques instants puis relancez la recherche.

### Le trajet ne se calcule pas

L'app bascule en comparaison simplifiee depart / destination pour ne pas bloquer l'usage.

### Les prix paraissent anciens

L'interface affiche la fraicheur du releve quand elle est connue. Certaines stations peuvent garder un prix plus ancien que d'autres dans une meme zone.

## Structure utile

- `src/routes/HomePage.tsx` : page principale
- `src/components/common/LocationPanel.tsx` : depart / destination
- `src/components/map/StationsMap.tsx` : carte et panneau d'action
- `src/services/stationService.ts` : calculs station / detour / stats
- `src/services/geocodingService.ts` : recherche d'adresses
- `src/services/routingService.ts` : calculs d'itineraire
- `src/store/useFuelStationsStore.ts` : store Zustand compose par slices
- `server/proxy-server.mjs` : proxy local
- `scripts/deploy-oracle.ps1` : deploiement manuel optionnel

## Nettoyage du repo

- Les anciens artefacts de session (`test-results`, logs locaux) ne sont pas versionnes.
- L'ancien pipeline de logos statiques a ete retire car il n'etait plus utilise par l'application.
