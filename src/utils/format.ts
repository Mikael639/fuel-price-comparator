import type { PriceTrend, SortMode } from "@/types/station";

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
});

export const formatPrice = (price: number | null | undefined) =>
  price == null ? "Indisponible" : `${priceFormatter.format(price)} \u20ac/L`;

export const formatDistance = (distanceKm: number) =>
  distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${numberFormatter.format(distanceKm)} km`;

export const formatMoney = (amount: number | null | undefined) =>
  amount == null ? "0,00 \u20ac" : `${amount.toFixed(2).replace(".", ",")} \u20ac`;

export const formatFuelFillCost = (pricePerLiter: number | null | undefined, liters = 50) =>
  pricePerLiter == null ? "Plein indisponible" : `${formatMoney(pricePerLiter * liters)} pour ${liters}L`;

export const formatDateLabel = (value: string) => dateFormatter.format(new Date(value));

export const formatDriveTime = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export const trendCopy: Record<PriceTrend, string> = {
  up: "En hausse",
  down: "En baisse",
  stable: "Stable",
};

export const sortModeCopy: Record<SortMode, string> = {
  price: "Prix",
  distance: "Distance",
  savings: "\u00c9conomies",
  favorites: "Favoris d'abord",
};
