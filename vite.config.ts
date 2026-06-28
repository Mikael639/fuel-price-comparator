import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "FuelFlash - Comparateur Premium",
        short_name: "FuelFlash",
        description: "Le comparateur intelligent de prix des carburants en France",
        theme_color: "#0F766E",
        background_color: "#0F172A",
        display: "standalone",
        start_url: "/",
        lang: "fr",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/fuel/") ||
              url.pathname.startsWith("/api/geocode/") ||
              url.pathname.startsWith("/api/route") ||
              url.pathname.startsWith("/api/osm/") ||
              url.pathname.startsWith("/api/europe/") ||
              url.hostname === "data.economie.gouv.fr" ||
              url.hostname === "nominatim.openstreetmap.org" ||
              url.hostname === "router.project-osrm.org" ||
              url.hostname === "overpass-api.de",
            handler: "NetworkFirst",
            options: {
              cacheName: "fuelflash-api-cache",
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === "basemaps.cartocdn.com" ||
              url.hostname.endsWith(".cartocdn.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "fuelflash-map-tiles",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 512,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker", "font", "image"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "fuelflash-static-assets",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 128,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api/fuel": {
        target: "https://data.economie.gouv.fr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fuel/, "/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2"),
      },
      "/api/fuel-history": {
        target: "https://data.economie.gouv.fr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fuel-history/, "/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien"),
      },
      "/api/geocode": {
        target: "https://nominatim.openstreetmap.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, ""),
      },
      "/api/route": {
        target: "https://router.project-osrm.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/route/, "/route/v1/driving"),
      },
      "/api/osm": {
        target: "https://overpass-api.de",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/osm\/brand/, "/api/interpreter"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
