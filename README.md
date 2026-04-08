# ⛽ FuelFlash - Comparateur de Carburants Premium (React Sync)

Une application web modernisee et performante pour trouver les stations-service les moins cheres en France. Cette branche **`React-Tawlind`** a ete synchronisee avec toutes les fonctionnalites avancees de la branche principale Vue 3, tout en adoptant un design **Slate-Emerald** de haute fidelite.

![Showcase](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/fuel.svg)

## ✨ Fonctionnalités Unifiées

- 🚀 **Itinéraire Intelligent** : Recherchez une destination et découvrez les stations les moins chères sur votre trajet.
- 💎 **Design Slate-Emerald** : Interface modernisée avec glassmorphisme, micro-animations et mode sombre natif.
- ⛽ **Optimisation "Plein Malin"** : Algorithme exclusif calculant le gain net réel (Économie à la pompe - Coût du trajet/détour).
- 🕒 **Séparation SP95 / E10** : Distinction stricte entre les carburants SP95 et SP95-E10 pour une comparaison précise.
- 🌓 **Mode Sombre Automatique** : Design optimisé pour une utilisation nocturne ou en voiture.
- 📍 **Géolocalisation Live** : Utilisation de l'API de géolocalisation du navigateur ou recherche manuelle par ville.
- ⭐ **Favoris** : Enregistrez vos stations habituelles pour les retrouver instantanément.
- 📊 **Historique & Tendances** : Visualisez l'évolution des prix sur les 30 derniers jours avec indicateurs de tendance.

## 🛠️ Stack Technique

- **Frontend** : React 19, Tailwind CSS, Lucide React.
- **État** : Zustand (avec persistance locale).
- **Cartographie** : Leaflet & OpenStreetMap.
- **Proxy Server** : Node.js (Express) pour contourner les restrictions CORS des API gouvernementales.

## 🚀 Installation & Lancement

### 1. Cloner le dépôt
```bash
git clone https://github.com/votre-repo/fuel-price-comparator.git
cd fuel-price-comparator
git checkout React-Tawlind
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Lancer le serveur Proxy (Indispensable pour les données réelles)
```bash
node server/proxy-server.mjs
```
Le serveur proxy écoute sur le port `8787`.

### 4. Lancer l'application React
```bash
npm run dev -- --port 3005
```
Accédez à l'application via `http://localhost:3005`.

## 📈 Guide des Données

Les prix sont rafraîchis toutes les 10 minutes via les API officielles du gouvernement français (`prix-carburants.gouv.fr`). Les noms des enseignes et services sont enrichis dynamiquement via **OpenStreetMap (OSM)** pour offrir une expérience plus riche que les données brutes officielles.

---
*FuelFlash Premium - React Sync Edition*
