# Changelog

Toutes les modifications notables de ce projet seront documentees dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhere au versionnage semantique.

## [Unreleased]

### Security

- Proxy et fonctions `api/` : limite de taille des corps, validation des coordonnees d'itineraire, relais OSM restreint a la requete attendue, caches bornes, timeout amont et erreurs internes masquees.
- Validation des identifiants de station avant leur insertion dans les requetes ODSQL (`/station/:id`).
- Mise a jour des dependances corrigeant les failles de `react-router` et `shell-quote`.

### Fixed

- Affichage d'un avertissement quand le jeu de demonstration remplace les donnees officielles indisponibles.
- Fiche station : la station precedente ne reste plus affichee apres un changement d'identifiant.
- Retours prix : un `localStorage` indisponible ne casse plus le rendu.

### Changed

- Chargement a la demande des pages secondaires et de `xlsx` ; separation des bundles vendor (de 1,26 Mo a ~520 Ko pour le point d'entree).
- `concurrently` et `vite-plugin-pwa` ne sont plus dans les dependances de production.
- CI : etape de verification des types, permissions minimales, annulation des runs obsoletes, rapport Playwright en cas d'echec.

## [0.1.0] - 2026-03-18

### Added

- Geolocalisation navigateur avec gestion du refus et des erreurs.
- Donnees officielles DGCCRF pour les prix carburants en France.
- Carte interactive avec clustering, rayon reel et navigation GPS.
- Favoris persistants avec alertes et indicateurs de fraicheur.
- Theme clair / sombre adapte au mobile-first.
- Couverture de tests unitaires Vitest et tests UI Playwright.
