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

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatPrice = (price: number | null | undefined) =>
  price == null ? "Indisponible" : `${priceFormatter.format(price)} EUR/L`;

export const formatDistance = (distanceKm: number) =>
  distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${numberFormatter.format(distanceKm)} km`;

export const formatMoney = (amount: number | null | undefined) =>
  amount == null ? "0,00 EUR" : `${amount.toFixed(2).replace(".", ",")} EUR`;

export const formatDateLabel = (value: string) => dateFormatter.format(new Date(value));

export const formatLongDate = (value: string | null | undefined) =>
  value ? longDateFormatter.format(new Date(value)) : "Inconnue";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateTime = (value: string | null | undefined) =>
  value ? dateTimeFormatter.format(new Date(value)) : "Inconnue";

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
  savings: "Economies",
  smartFill: "Plein malin",
  favorites: "Favoris d'abord",
};

export const formatPriceValue = (price: number) => priceFormatter.format(price);

export const formatFreshness = (date: string | null | undefined) => {
  if (!date) return "Mise a jour inconnue";
  const now = new Date();
  const update = new Date(date);
  if (isNaN(update.getTime())) return "Format date invalide";
  const diffMs = now.getTime() - update.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
};
