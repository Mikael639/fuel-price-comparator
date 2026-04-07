import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import vuetify from "vite-plugin-vuetify";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "FuelFlash - Comparateur",
        short_name: "FuelFlash",
        description: "Comparateur de prix des carburants en France",
        theme_color: "#0F766E",
        background_color: "#ffffff",
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
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
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
              url.pathname.startsWith("/fuel/") ||
              url.pathname.startsWith("/geocode/") ||
              url.pathname.startsWith("/europe/") ||
              url.hostname === "data.economie.gouv.fr" ||
              url.hostname === "nominatim.openstreetmap.org" ||
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
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
