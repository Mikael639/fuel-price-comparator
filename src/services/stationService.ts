import { appConfig } from "@/config/app";
import { fuelStations } from "@/data/stations";
import { fuelApiService, type ApiStationRecord, type DailyHistoryRecord } from "@/services/fuelApi";
import { osmService } from "@/services/osmService";
import type {
  BrandSource,
  Coordinates,
  FavoriteAlert,
  FuelPrices,
  FuelStation,
  FuelType,
  GeocodingResult,
  PriceHistory,
  PriceHistoryPoint,
  PriceTrend,
  RoutePath,
  ServiceType,
  SortMode,
  StationSearchParams,
  StationStats,
  StationWithMetrics,
} from "@/types/station";
import {
  estimateDriveTimeMinutes,
  getDistanceToPolylineKm,
  haversineDistance,
  samplePolyline,
} from "@/utils/geo";

interface ParsedOpeningHourRange {
  "@ouverture": string;
  "@fermeture": string;
}

interface ParsedOpeningDay {
  "@id"?: string;
  "@nom"?: string;
  "@ferme"?: string;
  horaire?: ParsedOpeningHourRange | ParsedOpeningHourRange[];
}

interface ParsedOpeningHours {
  "@automate-24-24"?: string;
  jour?: ParsedOpeningDay[] | ParsedOpeningDay;
}

interface FuelComparisonEntry {
  fuel: FuelType;
  averagePrice: number | null;
  stationCount: number;
}

interface AreaWeeklyFuelTrend {
  labels: string[];
  prices: number[];
  latestPrice: number | null;
  seriesCount: number;
  source: "official" | "mock";
}

interface RequestOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

const FUEL_TO_API_FIELD: Record<FuelType, keyof ApiStationRecord> = {
  SP95: "sp95_prix",
  "SP95-E10": "e10_prix",
  SP98: "sp98_prix",
  Diesel: "gazole_prix",
  E85: "e85_prix",
  GPL: "gplc_prix",
};

const FUEL_TO_API_MAJ_FIELD: Record<FuelType, keyof ApiStationRecord> = {
  SP95: "sp95_maj",
  "SP95-E10": "e10_maj",
  SP98: "sp98_maj",
  Diesel: "gazole_maj",
  E85: "e85_maj",
  GPL: "gplc_maj",
};

const DAILY_NAME_TO_FUEL: Record<string, FuelType> = {
  Gazole: "Diesel",
  SP95: "SP95",
  "E10": "SP95-E10",
  SP98: "SP98",
  E85: "E85",
  GPLc: "GPL",
};

const FRENCH_SMALL_WORDS = new Set(["a", "au", "aux", "d", "de", "des", "du", "en", "et", "l", "la", "le", "les", "sur"]);
const UPPERCASE_TOKENS = new Set(["a", "bp", "cd", "d", "n", "rd", "rn", "za", "zac", "zae", "zi"]);

const BRAND_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /\bTOTAL(?:ENERGIES)?\b|\bACCESS\b|\bRELAIS\b/i, brand: "TotalEnergies" },
  { pattern: /\bESSO\b/i, brand: "Esso" },
  { pattern: /\bSHELL\b/i, brand: "Shell" },
  { pattern: /\bAVIA\b/i, brand: "Avia" },
  { pattern: /\bBP\b/i, brand: "bp" },
  { pattern: /\bQ8\b/i, brand: "Q8" },
  { pattern: /\bENI\b|\bAGIP\b/i, brand: "Eni" },
  { pattern: /\bCARREFOUR\b/i, brand: "Carrefour" },
  { pattern: /\bINTERMARCHE\b/i, brand: "Intermarche" },
  { pattern: /\bLECLERC\b|\bE[ .-]?LECLERC\b/i, brand: "E.Leclerc" },
  { pattern: /\bAUCHAN\b/i, brand: "Auchan" },
  { pattern: /\bSUPER U\b|\bU EXPRESS\b|\bHYPER U\b/i, brand: "U" },
  { pattern: /\bCASINO\b/i, brand: "Casino" },
];

const dayIndexById: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 0,
};

const normalizeLabelPart = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";

const capitalizeSegment = (segment: string) =>
  segment.length > 0 ? `${segment.charAt(0).toLocaleUpperCase("fr-FR")}${segment.slice(1)}` : segment;

const humanizeWord = (word: string, index: number) => {
  const raw = word.trim();
  const lower = raw.toLocaleLowerCase("fr-FR");

  if (!raw) {
    return raw;
  }

  if (UPPERCASE_TOKENS.has(lower) || /^[adn]\d+[a-z\d-]*$/i.test(raw)) {
    return raw.toUpperCase();
  }

  if (/^\d+[a-z]?$/i.test(raw)) {
    return raw.toUpperCase();
  }

  const transformed = lower
    .split("-")
    .map((part, partIndex) => {
      const apostropheParts = part
        .split("'")
        .map((subPart, subIndex) => {
          if ((partIndex > 0 || subIndex > 0) && FRENCH_SMALL_WORDS.has(subPart)) {
            return subPart;
          }

          return capitalizeSegment(subPart);
        })
        .join("'");

      if (partIndex > 0 && FRENCH_SMALL_WORDS.has(apostropheParts)) {
        return apostropheParts;
      }

      return capitalizeSegment(apostropheParts);
    })
    .join("-");

  if (index > 0 && FRENCH_SMALL_WORDS.has(transformed)) {
    return transformed;
  }

  return index > 0 && FRENCH_SMALL_WORDS.has(lower) ? lower : transformed;
};

const getCurrentPricePointDate = (fuel: FuelType, priceUpdatedAt: Partial<Record<FuelType, string>>) =>
  priceUpdatedAt[fuel] ?? new Date().toISOString();

const getLatestUpdate = (priceUpdatedAt: Partial<Record<FuelType, string>>) =>
  Object.values(priceUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

export const normalizeOfficialText = (value: string | null | undefined) => {
  const normalized = normalizeLabelPart(value);

  if (!normalized) {
    return normalized;
  }

  if (normalized !== normalized.toUpperCase()) {
    return normalized;
  }

  return normalized
    .split(" ")
    .map((word, index) => humanizeWord(word, index))
    .join(" ");
};

const normalizeService = (service: string): ServiceType | null => {
  const normalized = service.toLowerCase();

  if (normalized.includes("boutique")) {
    return "Superette";
  }

  if (normalized.includes("lavage") || normalized.includes("laverie")) {
    return "Lavage";
  }

  if (normalized.includes("gonflage")) {
    return "Gonflage";
  }

  if (normalized.includes("toilette")) {
    return "Toilettes";
  }

  if (
    normalized.includes("recharge") ||
    normalized.includes("borne") ||
    normalized.includes("electrique") ||
    service.includes("electrique") ||
    service.includes("électrique")
  ) {
    return "Borne de recharge";
  }

  if (normalized.includes("24/24")) {
    return "Station 24h/24";
  }

  return null;
};

const inferBrand = (record: ApiStationRecord): { brand: string; brandSource: BrandSource } => {
  const searchableText = [record.adresse ?? "", ...(record.services_service ?? [])].join(" ");
  const matchedBrand = BRAND_PATTERNS.find(({ pattern }) => pattern.test(searchableText));

  if (matchedBrand) {
    return {
      brand: matchedBrand.brand,
      brandSource: "inferred",
    };
  }

  return {
    brand: "Enseigne non communiquee",
    brandSource: "not_provided",
  };
};

const buildStationName = ({
  city,
  postcode,
  address,
  brand,
  brandSource,
}: {
  city: string;
  postcode?: string | null;
  address?: string | null;
  brand: string;
  brandSource: BrandSource;
}) => {
  const normalizedCity = normalizeOfficialText(city) || "Station";
  const normalizedAddress = normalizeOfficialText(address);
  const normalizedPostcode = normalizeLabelPart(postcode);

  if (brandSource === "osm" || brandSource === "inferred" || brandSource === "mock") {
    return `${brand} - ${normalizedCity}`;
  }

  if (normalizedAddress) {
    return `Station ${normalizedCity} - ${normalizedAddress}`;
  }

  if (normalizedPostcode) {
    return `Station ${normalizedCity} ${normalizedPostcode}`;
  }

  return `Station ${normalizedCity}`;
};

const parseJsonField = <T>(value: string | null | undefined): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const normalizeTime = (value: string) => value.replace(".", ":");

const parseOpeningHours = (rawHours: string | null | undefined) => {
  const parsed = parseJsonField<ParsedOpeningHours>(rawHours);

  if (!parsed) {
    return {
      openingHours: "Horaires indisponibles",
      isOpen: true,
    };
  }

  if (parsed["@automate-24-24"] === "1") {
    return {
      openingHours: "24h/24",
      isOpen: true,
    };
  }

  const days = Array.isArray(parsed.jour) ? parsed.jour : parsed.jour ? [parsed.jour] : [];
  const now = new Date();
  const currentDay = days.find((day) => dayIndexById[day["@id"] ?? ""] === now.getDay());

  if (!currentDay || currentDay["@ferme"] === "1") {
    return {
      openingHours: "Fermee aujourd'hui",
      isOpen: false,
    };
  }

  const ranges = Array.isArray(currentDay.horaire) ? currentDay.horaire : currentDay.horaire ? [currentDay.horaire] : [];

  if (ranges.length === 0) {
    return {
      openingHours: "Horaires disponibles sur place",
      isOpen: true,
    };
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const readableRanges = ranges.map((range) => {
    const opening = normalizeTime(range["@ouverture"]);
    const closing = normalizeTime(range["@fermeture"]);
    return `${opening} - ${closing}`;
  });

  const isOpen = ranges.some((range) => {
    const [openingHours, openingMinutes] = normalizeTime(range["@ouverture"]).split(":").map(Number);
    const [closingHours, closingMinutes] = normalizeTime(range["@fermeture"]).split(":").map(Number);
    return minutesNow >= openingHours * 60 + openingMinutes && minutesNow <= closingHours * 60 + closingMinutes;
  });

  return {
    openingHours: readableRanges.join(" - "),
    isOpen,
  };
};

const buildPriceUpdatedAt = (record: ApiStationRecord, fuelPrices: FuelPrices) =>
  (Object.keys(fuelPrices) as FuelType[]).reduce<Partial<Record<FuelType, string>>>((updates, fuel) => {
    const field = FUEL_TO_API_MAJ_FIELD[fuel];
    const updatedAt = record[field];

    if (typeof updatedAt === "string" && updatedAt.length > 0) {
      updates[fuel] = updatedAt;
    }

    return updates;
  }, {});

const buildCurrentPriceHistory = (
  fuelPrices: FuelPrices,
  priceUpdatedAt: Partial<Record<FuelType, string>>,
): PriceHistory =>
  Object.entries(fuelPrices).reduce<PriceHistory>((history, [fuel, price]) => {
    if (price == null) {
      return history;
    }

    history[fuel as FuelType] = [
      {
        date: getCurrentPricePointDate(fuel as FuelType, priceUpdatedAt),
        price,
      },
    ];
    return history;
  }, {});

const buildFuelPrices = (record: ApiStationRecord): FuelPrices => {
  const prices: FuelPrices = {};

  (Object.keys(FUEL_TO_API_FIELD) as FuelType[]).forEach((fuel) => {
    const field = FUEL_TO_API_FIELD[fuel];
    const value = record[field];

    if (typeof value === "number") {
      prices[fuel] = value;
    }
  });

  return prices;
};

export const mapRecordToStation = (record: ApiStationRecord): FuelStation | null => {
  if (!record.geom?.lat || !record.geom?.lon) {
    return null;
  }

  const fuelPrices = buildFuelPrices(record);
  const fuels = (Object.keys(fuelPrices) as FuelType[]).filter((fuel) => fuelPrices[fuel] != null);

  if (fuels.length === 0) {
    return null;
  }

  const normalizedServices = [
    ...new Set(
      (record.services_service ?? [])
        .map(normalizeService)
        .filter((service): service is ServiceType => service != null),
    ),
  ];

  if (record.horaires_automate_24_24 === "Oui") {
    normalizedServices.push("Station 24h/24");
  }

  const { openingHours, isOpen } = parseOpeningHours(record.horaires);
  const id = String(record.id);
  const { brand, brandSource } = inferBrand(record);
  const city = record.ville ?? "Ville indisponible";
  const priceUpdatedAt = buildPriceUpdatedAt(record, fuelPrices);

  return {
    id,
    name: buildStationName({
      city,
      postcode: record.cp,
      address: record.adresse,
      brand,
      brandSource,
    }),
    brand,
    brandSource,
    address: normalizeOfficialText(record.adresse) || "Adresse indisponible",
    city: normalizeOfficialText(city) || "Ville indisponible",
    lat: record.geom.lat,
    lng: record.geom.lon,
    isOpen,
    openingHours: openingHours === "Horaires indisponibles" ? normalizeOfficialText(record.horaires_jour) || openingHours : openingHours,
    fuels,
    fuelPrices,
    priceHistory: buildCurrentPriceHistory(fuelPrices, priceUpdatedAt),
    priceUpdatedAt,
    lastUpdatedAt: getLatestUpdate(priceUpdatedAt),
    services: [...new Set(normalizedServices)],
    dataOrigin: "official",
  };
};

const stationQualityScore = (station: FuelStation) =>
  station.services.length * 2 +
  Object.keys(station.fuelPrices).length * 2 +
  (station.brandSource === "osm" ? 3 : 0) +
  (station.brandSource === "inferred" ? 2 : 0) +
  (station.isOpen ? 1 : 0);

const stationFingerprint = (station: FuelStation) =>
  `${station.city.toLowerCase()}|${station.address.toLowerCase().replace(/\s+/g, " ").trim()}`;

export const dedupeStations = (stations: FuelStation[]) => {
  const deduped: FuelStation[] = [];

  stations.forEach((station) => {
    const duplicateIndex = deduped.findIndex((candidate) => {
      const sameAddress = stationFingerprint(candidate) === stationFingerprint(station);
      const veryClose =
        haversineDistance({ lat: candidate.lat, lng: candidate.lng }, { lat: station.lat, lng: station.lng }) <= 0.12;
      const samePrices = JSON.stringify(candidate.fuelPrices) === JSON.stringify(station.fuelPrices);

      return sameAddress || (veryClose && samePrices);
    });

    if (duplicateIndex === -1) {
      deduped.push(station);
      return;
    }

    if (stationQualityScore(station) > stationQualityScore(deduped[duplicateIndex]!)) {
      deduped.splice(duplicateIndex, 1, station);
    }
  });

  return deduped;
};

const mergeHistoryPoints = (history: PriceHistoryPoint[]) =>
  history
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .filter((point, index, points) => {
      const dayKey = point.date.slice(0, 10);
      return points.findIndex((candidate) => candidate.date.slice(0, 10) === dayKey) === index;
    });

export const mergeStationHistory = (station: FuelStation, dailyHistory: DailyHistoryRecord[]): FuelStation => {
  const nextHistory: PriceHistory = { ...station.priceHistory };

  dailyHistory.forEach((entry) => {
    const fuel = DAILY_NAME_TO_FUEL[entry.prix_nom];
    if (!fuel) {
      return;
    }

    const existingPoints = nextHistory[fuel] ? [...(nextHistory[fuel] ?? [])] : [];
    existingPoints.push({ date: entry.prix_maj, price: entry.prix_valeur });

    const currentPrice = station.fuelPrices[fuel];
    if (currentPrice != null) {
      existingPoints.push({
        date: getCurrentPricePointDate(fuel, station.priceUpdatedAt),
        price: currentPrice,
      });
    }

    nextHistory[fuel] = mergeHistoryPoints(existingPoints).slice(-30);
  });

  return {
    ...station,
    priceHistory: nextHistory,
  };
};

const getDetourFuelCost = (
  detourKm: number,
  fuelPrice: number,
  consumptionLitersPer100Km: number,
  isRoundTrip: boolean,
) => detourKm * (isRoundTrip ? 2 : 1) * (consumptionLitersPer100Km / 100) * fuelPrice;

const ROUTE_SAMPLE_LIMIT = 10;

const buildRouteSamplePoints = (routePath: RoutePath, corridorRadiusKm: number) => {
  const spacingKm = Math.max(corridorRadiusKm * 1.6, 20);
  const sampleCount = Math.min(
    ROUTE_SAMPLE_LIMIT,
    Math.max(2, Math.ceil(routePath.distanceKm / spacingKm) + 1),
  );

  return samplePolyline(routePath.geometry, sampleCount);
};

const buildMetrics = (
  station: FuelStation,
  position: Coordinates,
  fuel: FuelType,
  averagePrice: number | null,
  favoriteIds: string[],
  fillVolumeLiters: number,
  consumptionLitersPer100Km: number,
  routePath: RoutePath | null = null,
  routePosition: Coordinates | null = null,
): StationWithMetrics => {
  const stationCoords = { lat: station.lat, lng: station.lng };
  const distanceFromOriginKm = haversineDistance(position, stationCoords);
  const distanceToRouteKm = routePath ? getDistanceToPolylineKm(stationCoords, routePath.geometry) : null;
  const isRouteMode = Boolean(routePath || routePosition);
  const accurateRouteDetourKm = routePath ? station.routeDetourKm ?? null : null;
  const accurateRouteDetourMinutes = routePath ? station.routeDetourMinutes ?? null : null;

  let effectiveDistanceKm = distanceFromOriginKm;

  if (routePath) {
    const stationToDestinationKm = haversineDistance(stationCoords, routePath.destination);
    effectiveDistanceKm =
      accurateRouteDetourKm ??
      Math.max(0, distanceFromOriginKm + stationToDestinationKm - routePath.distanceKm);
  } else if (routePosition) {
    const originToDestinationKm = haversineDistance(position, routePosition);
    const stationToDestinationKm = haversineDistance(stationCoords, routePosition);
    effectiveDistanceKm = Math.max(0, distanceFromOriginKm + stationToDestinationKm - originToDestinationKm);
  }

  const selectedFuelPrice = station.fuelPrices[fuel] ?? null;
  const savingsPerLiter =
    selectedFuelPrice != null && averagePrice != null ? Math.max(averagePrice - selectedFuelPrice, 0) : null;
  const estimatedFillCost = selectedFuelPrice != null ? selectedFuelPrice * fillVolumeLiters : null;
  const estimatedDetourCost =
    selectedFuelPrice != null
      ? getDetourFuelCost(effectiveDistanceKm, selectedFuelPrice, consumptionLitersPer100Km, !isRouteMode)
      : null;
  const netSavingsForTank =
    savingsPerLiter != null && estimatedDetourCost != null ? savingsPerLiter * fillVolumeLiters - estimatedDetourCost : null;

  return {
    ...station,
    distanceKm: effectiveDistanceKm,
    distanceToRouteKm,
    selectedFuelPrice,
    estimatedDriveMinutes: accurateRouteDetourMinutes ?? estimateDriveTimeMinutes(effectiveDistanceKm),
    savingsPerLiter,
    isFavorite: favoriteIds.includes(station.id),
    fillVolumeLiters,
    estimatedFillCost,
    estimatedDetourCost,
    netSavingsForTank,
    priceTrend: stationService.getTrend(station, fuel),
    isRouteDetour: isRouteMode,
    hasAccurateRouteDetour: accurateRouteDetourKm != null && accurateRouteDetourMinutes != null,
  };
};

export const sortStations = (stations: StationWithMetrics[], sortMode: SortMode) => {
  const nextStations = stations.slice();

  nextStations.sort((left, right) => {
    if (sortMode === "favorites" && left.isFavorite !== right.isFavorite) {
      return Number(right.isFavorite) - Number(left.isFavorite);
    }

    if (sortMode === "distance") {
      return left.distanceKm - right.distanceKm;
    }

    if (sortMode === "smartFill") {
      return (
        (right.netSavingsForTank ?? Number.NEGATIVE_INFINITY) - (left.netSavingsForTank ?? Number.NEGATIVE_INFINITY) ||
        left.distanceKm - right.distanceKm
      );
    }

    if (sortMode === "savings") {
      return (right.savingsPerLiter ?? -1) - (left.savingsPerLiter ?? -1) || left.distanceKm - right.distanceKm;
    }

    if (left.selectedFuelPrice == null && right.selectedFuelPrice == null) {
      return left.distanceKm - right.distanceKm;
    }

    if (left.selectedFuelPrice == null) {
      return 1;
    }

    if (right.selectedFuelPrice == null) {
      return -1;
    }

    return left.selectedFuelPrice - right.selectedFuelPrice || left.distanceKm - right.distanceKm;
  });

  return nextStations;
};

const getFreshnessDate = (station: StationWithMetrics | FuelStation, fuel: FuelType) =>
  station.priceUpdatedAt[fuel] ?? station.lastUpdatedAt;

const parseHistoryTimestamp = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const buildAreaWeeklyFuelTrend = (
  stations: Array<StationWithMetrics | FuelStation>,
  fuel: FuelType,
  source: "official" | "mock",
): AreaWeeklyFuelTrend => {
  const groupedPrices = new Map<string, number[]>();
  const now = Date.now();

  const seriesCount = stations.filter((station) => {
    const uniqueDays = new Set(
      (station.priceHistory[fuel] ?? [])
        .map((point) => {
          const timestamp = parseHistoryTimestamp(point.date);

          if (timestamp == null || timestamp > now) {
            return null;
          }

          return point.date.slice(0, 10);
        })
        .filter((value): value is string => value != null),
    );

    return uniqueDays.size > 1;
  }).length;

  stations.forEach((station) => {
    const history = station.priceHistory[fuel] ?? [];

    history.forEach((point) => {
      const timestamp = parseHistoryTimestamp(point.date);

      if (timestamp == null || timestamp > now) {
        return;
      }

      const dayKey = point.date.slice(0, 10);
      const currentValues = groupedPrices.get(dayKey) ?? [];
      currentValues.push(point.price);
      groupedPrices.set(dayKey, currentValues);
    });
  });

  const labels = [...groupedPrices.keys()].sort().slice(-7);
  const prices = labels.map((label) => {
    const values = groupedPrices.get(label) ?? [];
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });

  return {
    labels,
    prices,
    latestPrice: prices[prices.length - 1] ?? null,
    seriesCount,
    source,
  };
};

class StationService {
  getMockStations() {
    return fuelStations;
  }

  getStationDistance(position: Coordinates, station: Pick<FuelStation, "lat" | "lng">) {
    return haversineDistance(position, { lat: station.lat, lng: station.lng });
  }

  async getStationsAround(position: Coordinates, radiusKm: number, options?: RequestOptions) {
    const records = await fuelApiService.getStationsAround(position, radiusKm, options);
    const stations = records.map(mapRecordToStation).filter((station): station is FuelStation => station != null);
    return dedupeStations(stations);
  }

  async getStationsAlongRoute(routePath: RoutePath, corridorRadiusKm: number, options?: RequestOptions) {
    const samplePoints = buildRouteSamplePoints(routePath, corridorRadiusKm);
    const stationGroups = await Promise.all(
      samplePoints.map((point) => this.getStationsAround(point, corridorRadiusKm, options)),
    );

    return dedupeStations(stationGroups.flat()).filter((station) => {
      const distanceToRouteKm = getDistanceToPolylineKm({ lat: station.lat, lng: station.lng }, routePath.geometry);
      return distanceToRouteKm <= corridorRadiusKm;
    });
  }

  async getStationById(id: string, options?: RequestOptions) {
    const record = await fuelApiService.getStationById(id, options);
    return record ? mapRecordToStation(record) : null;
  }

  async enrichStationHistory(station: FuelStation, options?: RequestOptions): Promise<FuelStation> {
    try {
      const dailyHistory = await fuelApiService.getDailyHistory(station.id, options);
      return mergeStationHistory(station, dailyHistory);
    } catch {
      return station;
    }
  }

  async enrichStationsHistory(stations: FuelStation[], options?: RequestOptions): Promise<FuelStation[]> {
    if (stations.length === 0) {
      return stations;
    }

    try {
      const dailyHistory = await fuelApiService.getDailyHistoryForStations(
        stations.map((station) => station.id),
        options,
      );

      const historyByStationId = dailyHistory.reduce<Map<string, DailyHistoryRecord[]>>((grouped, entry) => {
        const currentEntries = grouped.get(entry.id) ?? [];
        currentEntries.push(entry);
        grouped.set(entry.id, currentEntries);
        return grouped;
      }, new Map());

      return stations.map((station) => mergeStationHistory(station, historyByStationId.get(station.id) ?? []));
    } catch {
      return stations;
    }
  }

  async enrichStationBrand(station: FuelStation): Promise<FuelStation> {
    if (station.brandSource !== "not_provided") {
      return station;
    }

    const brand = await osmService.lookupFuelBrand(station.lat, station.lng);
    if (!brand) {
      return station;
    }

    return {
      ...station,
      brand,
      brandSource: "osm",
      name: buildStationName({
        city: station.city,
        address: station.address,
        brand,
        brandSource: "osm",
      }),
    };
  }

  createSearchLocation(result: GeocodingResult): Coordinates {
    return {
      lat: result.lat,
      lng: result.lng,
      label: `${result.label} - ${result.city}`,
    };
  }

  findNearbyStations({
    stations,
    position,
    radiusKm,
    openOnly,
    services,
    fuel,
    sortMode,
    favoriteIds,
    fillVolumeLiters,
    consumptionLitersPer100Km,
    routePath,
    routePosition,
  }: StationSearchParams): StationWithMetrics[] {
    const scopedStations = stations
      .map((station) => {
        const stationCoords = { lat: station.lat, lng: station.lng };
        const originDistanceKm = haversineDistance(position, stationCoords);
        const distanceToRouteKm = routePath
          ? getDistanceToPolylineKm(stationCoords, routePath.geometry)
          : routePosition
            ? Math.min(originDistanceKm, haversineDistance(routePosition, stationCoords))
            : originDistanceKm;

        return {
          station,
          distanceToScopeKm: distanceToRouteKm,
        };
      })
      .filter((station) => station.distanceToScopeKm <= radiusKm)
      .filter(({ station }) => !openOnly || station.isOpen)
      .filter(({ station }) =>
        services.length === 0 ? true : services.every((service) => station.services.includes(service)),
      )
      .map(({ station }) => station);

    const comparablePrices = scopedStations
      .map((station) => station.fuelPrices[fuel] ?? null)
      .filter((price): price is number => price != null);

    const averagePrice =
      comparablePrices.length > 0
        ? comparablePrices.reduce((sum, price) => sum + price, 0) / comparablePrices.length
        : null;

    return sortStations(
      scopedStations.map((station) =>
        buildMetrics(
          station,
          position,
          fuel,
          averagePrice,
          favoriteIds,
          fillVolumeLiters,
          consumptionLitersPer100Km,
          routePath ?? null,
          routePosition ?? null,
        ),
      ),
      sortMode,
    );
  }

  getComparableStations(stations: StationWithMetrics[]) {
    return stations.filter(
      (station): station is StationWithMetrics & { selectedFuelPrice: number } => station.selectedFuelPrice != null,
    );
  }

  getBestStation(stations: StationWithMetrics[]) {
    return this.getComparableStations(sortStations(stations, "price"))[0] ?? null;
  }

  getAbsoluteCheapestStation(stations: StationWithMetrics[]) {
    return this.getComparableStations(sortStations(stations, "price"))[0] ?? null;
  }

  getBestSmartFillStation(stations: StationWithMetrics[]) {
    return this.getComparableStations(sortStations(stations, "smartFill"))[0] ?? null;
  }

  getRecommendedBestStation(stations: StationWithMetrics[], radiusKm: number, sortMode: SortMode = "price") {
    const rankingMode = sortMode === "smartFill" ? "smartFill" : "price";
    const comparableStations = this.getComparableStations(sortStations(stations, rankingMode));
    if (comparableStations.length === 0) {
      return null;
    }

    const focusRadiusKm = Math.min(radiusKm, appConfig.stations.recommendedFocusRadiusKm);
    const localStations = comparableStations.filter((station) => station.distanceKm <= focusRadiusKm);
    return localStations[0] ?? comparableStations[0] ?? null;
  }

  getAveragePrice(stations: StationWithMetrics[]) {
    const comparableStations = this.getComparableStations(stations);
    if (comparableStations.length === 0) {
      return null;
    }

    return comparableStations.reduce((sum, station) => sum + station.selectedFuelPrice, 0) / comparableStations.length;
  }

  getStationSavings(station: StationWithMetrics, averagePrice: number | null) {
    if (station.selectedFuelPrice == null || averagePrice == null) {
      return null;
    }

    return Math.max(averagePrice - station.selectedFuelPrice, 0);
  }

  getStationFillSavings(station: StationWithMetrics, averagePrice: number | null, volume = station.fillVolumeLiters) {
    const savingsPerLiter = this.getStationSavings(station, averagePrice);
    return savingsPerLiter != null ? savingsPerLiter * volume : null;
  }

  getStationNetSavingsForFill(
    station: StationWithMetrics,
    averagePrice: number | null,
    volume = station.fillVolumeLiters,
    consumption = appConfig.stations.defaultConsumptionLitersPer100Km,
  ) {
    const fillSavings = this.getStationFillSavings(station, averagePrice, volume);
    if (fillSavings == null || station.selectedFuelPrice == null) {
      return null;
    }

    return fillSavings - getDetourFuelCost(station.distanceKm, station.selectedFuelPrice, consumption, !station.isRouteDetour);
  }

  getStats(stations: StationWithMetrics[], fuel: FuelType): StationStats {
    const comparableStations = this.getComparableStations(stations);
    const averagePrice = this.getAveragePrice(stations);
    const cheapestStation = this.getAbsoluteCheapestStation(stations);
    const comparableNetSavings = comparableStations
      .map((station) => station.netSavingsForTank)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const freshestPriceUpdate =
      comparableStations
        .map((station) => getFreshnessDate(station, fuel))
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;
    const staleCount = comparableStations.filter((station) => {
      const updatedAt = getFreshnessDate(station, fuel);

      if (!updatedAt) {
        return true;
      }

      return Date.now() - new Date(updatedAt).getTime() > 24 * 60 * 60 * 1000;
    }).length;

    return {
      stationCount: stations.length,
      comparableCount: comparableStations.length,
      averagePrice,
      maxSavings: cheapestStation && averagePrice != null ? Math.max(averagePrice - cheapestStation.selectedFuelPrice, 0) : null,
      maxNetSavings: comparableNetSavings.length > 0 ? Math.max(...comparableNetSavings) : null,
      freshestPriceUpdate,
      staleCount,
    };
  }

  getTrend(station: FuelStation, fuel: FuelType): PriceTrend {
    const history = station.priceHistory[fuel];
    if (!history || history.length < 2) {
      return "stable";
    }

    // Look at the last 7 points or all points if fewer
    const points = history.slice(-7);
    const first = points[0].price;
    const last = points[points.length - 1].price;
    const delta = last - first;

    // We consider a trend "significant" if it's more than 0.5% change
    // or more than 0.01€ absolute change
    const thresholdPercentage = 0.005;
    const thresholdAbsolute = 0.01;
    
    const percentageChange = Math.abs(delta / first);

    if (delta > thresholdAbsolute || (delta > 0 && percentageChange > thresholdPercentage)) {
      return "up";
    }

    if (delta < -thresholdAbsolute || (delta < 0 && percentageChange > thresholdPercentage)) {
      return "down";
    }

    return "stable";
  }

  getAvailableServices(stations: FuelStation[]) {
    return [...new Set(stations.flatMap((station) => station.services))].sort((left, right) =>
      left.localeCompare(right),
    ) as ServiceType[];
  }

  getAreaWeeklyFuelTrend(
    stations: StationWithMetrics[],
    fuel: FuelType,
    options?: { fallbackPosition?: Coordinates | null; fallbackRadiusKm?: number },
  ) {
    const officialTrend = buildAreaWeeklyFuelTrend(stations, fuel, "official");

    if (officialTrend.seriesCount > 0 && officialTrend.prices.length > 1) {
      return officialTrend;
    }

    if (!options?.fallbackPosition) {
      return officialTrend;
    }

    const fallbackRadiusKm = Math.max(options.fallbackRadiusKm ?? appConfig.stations.defaultRadiusKm, 15);
    const fallbackStations = fuelStations.filter((station) => {
      if ((station.priceHistory[fuel] ?? []).length < 2) {
        return false;
      }

      return haversineDistance(options.fallbackPosition!, { lat: station.lat, lng: station.lng }) <= fallbackRadiusKm;
    });

    const fallbackTrend = buildAreaWeeklyFuelTrend(fallbackStations, fuel, "mock");

    if (fallbackTrend.seriesCount > 0 && fallbackTrend.prices.length > 1) {
      return fallbackTrend;
    }

    return officialTrend;
  }

  getPriceTrendFromSeries(prices: number[]): PriceTrend {
    if (prices.length < 2) return "stable";
    const first = prices[0] ?? prices[prices.length - 1] ?? 0;
    const last = prices[prices.length - 1] ?? first;
    const delta = last - first;
    if (delta > 0.01) return "up";
    if (delta < -0.01) return "down";
    return "stable";
  }

  getDieselEssenceComparator(stations: StationWithMetrics[]): {
    dieselAverage: number | null;
    gasolineAverage: number | null;
    gapPerLiter?: number | null;
    cheaperFuel: "Diesel" | "Essence" | null;
  } {
    const comparison = this.getAreaFuelComparison(stations);
    const dieselAverage = comparison.find((entry) => entry.fuel === "Diesel")?.averagePrice ?? null;
    const gasolineCandidates = comparison
      .filter((entry) => entry.fuel === "SP95" || entry.fuel === "SP95-E10" || entry.fuel === "SP98")
      .map((entry) => entry.averagePrice)
      .filter((price): price is number => price != null);

    const gasolineAverage =
      gasolineCandidates.length > 0
        ? gasolineCandidates.reduce((sum, price) => sum + price, 0) / gasolineCandidates.length
        : null;

    return {
      dieselAverage,
      gasolineAverage,
      gapPerLiter:
        dieselAverage != null && gasolineAverage != null ? Math.abs(gasolineAverage - dieselAverage) : null,
      cheaperFuel:
        dieselAverage == null || gasolineAverage == null ? null : dieselAverage < gasolineAverage ? "Diesel" : "Essence",
    };
  }

  getAreaFuelComparison(stations: StationWithMetrics[]): FuelComparisonEntry[] {
    return ["Diesel", "SP95", "SP95-E10", "SP98", "E85", "GPL"].map((fuel) => {
      const prices = stations
        .map((station) => station.fuelPrices[fuel as FuelType] ?? null)
        .filter((price): price is number => price != null);

      return {
        fuel: fuel as FuelType,
        averagePrice: prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null,
        stationCount: prices.length,
      };
    });
  }

  getAreaBrandComparison(stations: StationWithMetrics[], fuel: FuelType): { brand: string; averagePrice: number; stationCount: number }[] {
    const brandMap = new Map<string, number[]>();
    for (const station of stations) {
      const price = station.fuelPrices[fuel];
      if (price == null || !station.brand || station.brand === "Enseigne non communiquee") continue;
      if (!brandMap.has(station.brand)) brandMap.set(station.brand, []);
      brandMap.get(station.brand)!.push(price);
    }

    return [...brandMap.entries()]
      .map(([brand, prices]) => ({
        brand,
        averagePrice: prices.reduce((s, p) => s + p, 0) / prices.length,
        stationCount: prices.length,
      }))
      .filter((entry) => entry.stationCount >= 1)
      .sort((a, b) => a.averagePrice - b.averagePrice)
      .slice(0, 8);
  }

  getFavoriteAlerts(
    stations: StationWithMetrics[],
    selectedFuel: FuelType,
    favoriteAlertPrice: number | null,
  ): FavoriteAlert[] {
    const favoriteStations = this.getComparableStations(stations.filter((station) => station.isFavorite));

    if (favoriteStations.length === 0) {
      return [];
    }

    const alerts: FavoriteAlert[] = [];
    const bestFavorite = this.getComparableStations(sortStations(favoriteStations, "price"))[0] ?? null;
    const bestStation = this.getAbsoluteCheapestStation(stations);

    if (favoriteAlertPrice != null) {
      const matchingFavorites = favoriteStations.filter((station) => station.selectedFuelPrice <= favoriteAlertPrice);

      if (matchingFavorites.length > 0) {
        alerts.push({
          id: "favorite-threshold",
          stationId: matchingFavorites[0]?.id,
          severity: "success",
          title: `Alerte ${selectedFuel} atteinte`,
          description: `${matchingFavorites.length} favorite(s) sont a ${favoriteAlertPrice.toFixed(3)} EUR/L ou moins.`,
        });
      }
    }

    if (bestStation && bestFavorite && bestStation.id !== bestFavorite.id && bestStation.selectedFuelPrice != null) {
      const priceGap = bestFavorite.selectedFuelPrice - bestStation.selectedFuelPrice;

      if (priceGap >= 0.02) {
        alerts.push({
          id: "favorite-better-option",
          stationId: bestStation.id,
          severity: "warning",
          title: "Une station hors favoris est moins chere",
          description: `${bestStation.name} fait mieux que votre meilleure favorite de ${priceGap.toFixed(3)} EUR/L.`,
        });
      }
    } else if (bestStation?.isFavorite) {
      alerts.push({
        id: "favorite-best",
        stationId: bestStation.id,
        severity: "success",
        title: "Une favorite domine la selection",
        description: `${bestStation.name} est actuellement la meilleure option dans votre selection courante.`,
      });
    }

    const bestFavoriteForFill = this.getComparableStations(sortStations(favoriteStations, "smartFill"))[0] ?? null;

    if ((bestFavoriteForFill?.netSavingsForTank ?? 0) > 0) {
      alerts.push({
        id: "favorite-smart-fill",
        stationId: bestFavoriteForFill?.id,
        severity: "info",
        title: "Plein malin rentable sur une favorite",
        description: `${bestFavoriteForFill?.name} peut encore vous faire gagner ${bestFavoriteForFill?.netSavingsForTank?.toFixed(2)} EUR nets sur ${bestFavoriteForFill?.fillVolumeLiters}L.`,
      });
    }

    return alerts.slice(0, 3);
  }

  getEuropeDieselEssenceComparator(market: { snapshots: { prices: Partial<Record<FuelType, number>> }[] }): {
    dieselAverage: number | null;
    gasolineAverage: number | null;
  } {
    const lastSnapshot = market.snapshots.at(-1);
    const gasolineCandidates = [
      lastSnapshot?.prices["SP95"] ?? null,
      lastSnapshot?.prices["SP95-E10"] ?? null,
      lastSnapshot?.prices["SP98"] ?? null,
    ].filter((price): price is number => price != null);

    return {
      dieselAverage: lastSnapshot?.prices["Diesel"] ?? null,
      gasolineAverage:
        gasolineCandidates.length > 0
          ? gasolineCandidates.reduce((sum, price) => sum + price, 0) / gasolineCandidates.length
          : null,
    };
  }
}

export const stationService = new StationService();


