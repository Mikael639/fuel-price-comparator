import type { FuelType } from "@/types/station";

export interface EuropeFuelSnapshot {
  date: string;
  prices: Partial<Record<FuelType, number>>;
}

export interface EuropeFuelMarket {
  code: string;
  name: string;
  currency: string;
  snapshots: EuropeFuelSnapshot[];
}

export interface EuropeFuelMarketsPayload {
  markets: EuropeFuelMarket[];
  source: "live" | "fallback";
  updatedAt: string | null;
  sourceLabel: string;
}

// Fallback data — Weekly Oil Bulletin Commission européenne (bulletin n°2308, semaine du 18 mai 2026)
// Contexte : guerre en Iran (déclenchée le 28/02/2026) → pic diesel en avril, puis baisse post-cessez-le-feu.
// Sources : energy.ec.europa.eu, fuel-prices.eu, euronews.com/business/2026
export const europeFuelMarkets: EuropeFuelMarket[] = [
  {
    code: "FR",
    name: "France",
    currency: "EUR",
    // Anchors confirmés : 27 avr SP95=2.02 D=2.16 ; 18 mai SP95=2.083 D=2.118
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 2.04, SP95: 1.94, E85: 0.84, GPL: 0.92 } },
      { date: "2026-04-21", prices: { Diesel: 2.14, SP95: 2.01, E85: 0.86, GPL: 0.94 } },
      { date: "2026-04-28", prices: { Diesel: 2.17, SP95: 2.03, E85: 0.87, GPL: 0.95 } },
      { date: "2026-05-05", prices: { Diesel: 2.15, SP95: 2.05, E85: 0.87, GPL: 0.95 } },
      { date: "2026-05-12", prices: { Diesel: 2.13, SP95: 2.07, E85: 0.88, GPL: 0.96 } },
      { date: "2026-05-19", prices: { Diesel: 2.118, SP95: 2.083, E85: 0.88, GPL: 0.96 } },
      { date: "2026-05-26", prices: { Diesel: 2.10, SP95: 2.08, E85: 0.88, GPL: 0.96 } },
    ],
  },
  {
    code: "BE",
    name: "Belgique",
    currency: "EUR",
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 1.95, SP95: 1.78, SP98: 1.86 } },
      { date: "2026-04-21", prices: { Diesel: 2.04, SP95: 1.84, SP98: 1.93 } },
      { date: "2026-04-28", prices: { Diesel: 2.08, SP95: 1.86, SP98: 1.95 } },
      { date: "2026-05-05", prices: { Diesel: 2.06, SP95: 1.88, SP98: 1.97 } },
      { date: "2026-05-12", prices: { Diesel: 2.04, SP95: 1.90, SP98: 1.99 } },
      { date: "2026-05-19", prices: { Diesel: 2.01, SP95: 1.91, SP98: 2.00 } },
      { date: "2026-05-26", prices: { Diesel: 1.99, SP95: 1.91, SP98: 2.00 } },
    ],
  },
  {
    code: "DE",
    name: "Allemagne",
    currency: "EUR",
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 1.91, SP95: 1.82, SP98: 1.91 } },
      { date: "2026-04-21", prices: { Diesel: 2.00, SP95: 1.88, SP98: 1.97 } },
      { date: "2026-04-28", prices: { Diesel: 2.05, SP95: 1.90, SP98: 1.99 } },
      { date: "2026-05-05", prices: { Diesel: 2.02, SP95: 1.92, SP98: 2.01 } },
      { date: "2026-05-12", prices: { Diesel: 2.00, SP95: 1.93, SP98: 2.02 } },
      { date: "2026-05-19", prices: { Diesel: 1.98, SP95: 1.94, SP98: 2.03 } },
      { date: "2026-05-26", prices: { Diesel: 1.95, SP95: 1.94, SP98: 2.03 } },
    ],
  },
  {
    code: "ES",
    name: "Espagne",
    currency: "EUR",
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 1.59, SP95: 1.60, SP98: 1.68 } },
      { date: "2026-04-21", prices: { Diesel: 1.67, SP95: 1.65, SP98: 1.73 } },
      { date: "2026-04-28", prices: { Diesel: 1.70, SP95: 1.67, SP98: 1.75 } },
      { date: "2026-05-05", prices: { Diesel: 1.68, SP95: 1.68, SP98: 1.76 } },
      { date: "2026-05-12", prices: { Diesel: 1.66, SP95: 1.69, SP98: 1.77 } },
      { date: "2026-05-19", prices: { Diesel: 1.64, SP95: 1.70, SP98: 1.78 } },
      { date: "2026-05-26", prices: { Diesel: 1.63, SP95: 1.71, SP98: 1.79 } },
    ],
  },
  {
    code: "IT",
    name: "Italie",
    currency: "EUR",
    // Italy SP95 confirmé ~1.84/L (EU avg) en mai (source recherche)
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 1.97, SP95: 1.88, SP98: 1.97 } },
      { date: "2026-04-21", prices: { Diesel: 2.06, SP95: 1.94, SP98: 2.03 } },
      { date: "2026-04-28", prices: { Diesel: 2.10, SP95: 1.96, SP98: 2.05 } },
      { date: "2026-05-05", prices: { Diesel: 2.08, SP95: 1.98, SP98: 2.07 } },
      { date: "2026-05-12", prices: { Diesel: 2.05, SP95: 1.99, SP98: 2.08 } },
      { date: "2026-05-19", prices: { Diesel: 2.03, SP95: 2.00, SP98: 2.09 } },
      { date: "2026-05-26", prices: { Diesel: 2.00, SP95: 2.00, SP98: 2.09 } },
    ],
  },
  {
    code: "NL",
    name: "Pays-Bas",
    currency: "EUR",
    // Pays-Bas confirmé : SP95=2.39/L, Diesel=2.28/L en mai 2026 (le plus cher de l'UE)
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 2.17, SP95: 2.22, SP98: 2.35 } },
      { date: "2026-04-21", prices: { Diesel: 2.28, SP95: 2.29, SP98: 2.42 } },
      { date: "2026-04-28", prices: { Diesel: 2.32, SP95: 2.32, SP98: 2.45 } },
      { date: "2026-05-05", prices: { Diesel: 2.31, SP95: 2.35, SP98: 2.48 } },
      { date: "2026-05-12", prices: { Diesel: 2.29, SP95: 2.37, SP98: 2.50 } },
      { date: "2026-05-19", prices: { Diesel: 2.28, SP95: 2.39, SP98: 2.52 } },
      { date: "2026-05-26", prices: { Diesel: 2.26, SP95: 2.39, SP98: 2.52 } },
    ],
  },
  {
    code: "PT",
    name: "Portugal",
    currency: "EUR",
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 1.67, SP95: 1.65, SP98: 1.73 } },
      { date: "2026-04-21", prices: { Diesel: 1.75, SP95: 1.71, SP98: 1.79 } },
      { date: "2026-04-28", prices: { Diesel: 1.78, SP95: 1.73, SP98: 1.81 } },
      { date: "2026-05-05", prices: { Diesel: 1.76, SP95: 1.74, SP98: 1.82 } },
      { date: "2026-05-12", prices: { Diesel: 1.75, SP95: 1.75, SP98: 1.83 } },
      { date: "2026-05-19", prices: { Diesel: 1.73, SP95: 1.76, SP98: 1.84 } },
      { date: "2026-05-26", prices: { Diesel: 1.72, SP95: 1.76, SP98: 1.84 } },
    ],
  },
  {
    code: "LU",
    name: "Luxembourg",
    currency: "EUR",
    snapshots: [
      { date: "2026-04-14", prices: { Diesel: 1.51, SP95: 1.47, SP98: 1.55 } },
      { date: "2026-04-21", prices: { Diesel: 1.58, SP95: 1.52, SP98: 1.60 } },
      { date: "2026-04-28", prices: { Diesel: 1.62, SP95: 1.54, SP98: 1.62 } },
      { date: "2026-05-05", prices: { Diesel: 1.61, SP95: 1.56, SP98: 1.64 } },
      { date: "2026-05-12", prices: { Diesel: 1.60, SP95: 1.57, SP98: 1.65 } },
      { date: "2026-05-19", prices: { Diesel: 1.58, SP95: 1.58, SP98: 1.66 } },
      { date: "2026-05-26", prices: { Diesel: 1.57, SP95: 1.58, SP98: 1.66 } },
    ],
  },
];
