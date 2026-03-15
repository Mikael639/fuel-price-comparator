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

export const europeFuelMarkets: EuropeFuelMarket[] = [
  {
    code: "FR",
    name: "France",
    currency: "EUR",
    snapshots: [
      { date: "2026-03-05", prices: { Diesel: 1.71, SP95: 1.83, SP98: 1.91, E85: 0.89, GPL: 1.05 } },
      { date: "2026-03-06", prices: { Diesel: 1.705, SP95: 1.825, SP98: 1.905, E85: 0.888, GPL: 1.048 } },
      { date: "2026-03-07", prices: { Diesel: 1.699, SP95: 1.818, SP98: 1.899, E85: 0.884, GPL: 1.044 } },
      { date: "2026-03-08", prices: { Diesel: 1.694, SP95: 1.812, SP98: 1.894, E85: 0.881, GPL: 1.039 } },
      { date: "2026-03-09", prices: { Diesel: 1.69, SP95: 1.808, SP98: 1.89, E85: 0.878, GPL: 1.036 } },
      { date: "2026-03-10", prices: { Diesel: 1.687, SP95: 1.804, SP98: 1.886, E85: 0.875, GPL: 1.033 } },
      { date: "2026-03-11", prices: { Diesel: 1.684, SP95: 1.801, SP98: 1.882, E85: 0.872, GPL: 1.03 } },
    ],
  },
  {
    code: "BE",
    name: "Belgique",
    currency: "EUR",
    snapshots: [
      { date: "2026-03-05", prices: { Diesel: 1.76, SP95: 1.79, SP98: 1.88 } },
      { date: "2026-03-06", prices: { Diesel: 1.758, SP95: 1.786, SP98: 1.875 } },
      { date: "2026-03-07", prices: { Diesel: 1.754, SP95: 1.782, SP98: 1.871 } },
      { date: "2026-03-08", prices: { Diesel: 1.751, SP95: 1.779, SP98: 1.867 } },
      { date: "2026-03-09", prices: { Diesel: 1.748, SP95: 1.776, SP98: 1.864 } },
      { date: "2026-03-10", prices: { Diesel: 1.745, SP95: 1.773, SP98: 1.86 } },
      { date: "2026-03-11", prices: { Diesel: 1.742, SP95: 1.77, SP98: 1.857 } },
    ],
  },
  {
    code: "DE",
    name: "Allemagne",
    currency: "EUR",
    snapshots: [
      { date: "2026-03-05", prices: { Diesel: 1.68, SP95: 1.77, SP98: 1.84 } },
      { date: "2026-03-06", prices: { Diesel: 1.677, SP95: 1.766, SP98: 1.836 } },
      { date: "2026-03-07", prices: { Diesel: 1.674, SP95: 1.762, SP98: 1.832 } },
      { date: "2026-03-08", prices: { Diesel: 1.671, SP95: 1.758, SP98: 1.829 } },
      { date: "2026-03-09", prices: { Diesel: 1.669, SP95: 1.754, SP98: 1.826 } },
      { date: "2026-03-10", prices: { Diesel: 1.666, SP95: 1.751, SP98: 1.822 } },
      { date: "2026-03-11", prices: { Diesel: 1.663, SP95: 1.748, SP98: 1.819 } },
    ],
  },
  {
    code: "ES",
    name: "Espagne",
    currency: "EUR",
    snapshots: [
      { date: "2026-03-05", prices: { Diesel: 1.59, SP95: 1.67, SP98: 1.78 } },
      { date: "2026-03-06", prices: { Diesel: 1.587, SP95: 1.666, SP98: 1.776 } },
      { date: "2026-03-07", prices: { Diesel: 1.584, SP95: 1.662, SP98: 1.772 } },
      { date: "2026-03-08", prices: { Diesel: 1.581, SP95: 1.659, SP98: 1.768 } },
      { date: "2026-03-09", prices: { Diesel: 1.579, SP95: 1.656, SP98: 1.764 } },
      { date: "2026-03-10", prices: { Diesel: 1.576, SP95: 1.653, SP98: 1.761 } },
      { date: "2026-03-11", prices: { Diesel: 1.573, SP95: 1.65, SP98: 1.758 } },
    ],
  },
  {
    code: "IT",
    name: "Italie",
    currency: "EUR",
    snapshots: [
      { date: "2026-03-05", prices: { Diesel: 1.79, SP95: 1.88, SP98: 1.96 } },
      { date: "2026-03-06", prices: { Diesel: 1.787, SP95: 1.876, SP98: 1.956 } },
      { date: "2026-03-07", prices: { Diesel: 1.783, SP95: 1.872, SP98: 1.952 } },
      { date: "2026-03-08", prices: { Diesel: 1.78, SP95: 1.868, SP98: 1.948 } },
      { date: "2026-03-09", prices: { Diesel: 1.776, SP95: 1.864, SP98: 1.944 } },
      { date: "2026-03-10", prices: { Diesel: 1.772, SP95: 1.86, SP98: 1.94 } },
      { date: "2026-03-11", prices: { Diesel: 1.769, SP95: 1.856, SP98: 1.936 } },
    ],
  },
];
