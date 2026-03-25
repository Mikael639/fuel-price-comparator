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

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("fr-FR", {
  numeric: "auto",
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

export const formatDateTime = (value: string | null | undefined) =>
  value == null ? "Date indisponible" : dateTimeFormatter.format(new Date(value));

export const formatRelativeDate = (value: string | null | undefined) => {
  if (!value) {
    return "mise a jour inconnue";
  }

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  return relativeTimeFormatter.format(Math.round(diffHours / 24), "day");
};

export const formatFreshness = (value: string | null | undefined) =>
  value == null ? "Mise a jour inconnue" : `Mis a jour ${formatRelativeDate(value)}`;

export const formatDriveTime = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export const trendCopy: Record<PriceTrend, string> = {
  up: "En hausse",
  down: "En baisse",
  stable: "Stable",
};

export const trendIcon: Record<PriceTrend, string> = {
  up: "mdi-trending-up",
  down: "mdi-trending-down",
  stable: "mdi-trending-neutral",
};

export const trendColor: Record<PriceTrend, string> = {
  up: "error",
  down: "success",
  stable: "info",
};

export const sortModeCopy: Record<SortMode, string> = {
  price: "Prix",
  distance: "Distance",
  savings: "Economies",
  smartFill: "Plein malin",
  favorites: "Favoris d'abord",
};
