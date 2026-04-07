import { fuelStations } from "@/data/stations";
import { fuelApiService, type ApiStationRecord, type DailyHistoryRecord } from "@/services/fuelApi";
import { osmService } from "@/services/osmService";
import type {
  BrandSource,
  Coordinates,
  FuelPrices,
  FuelStation,
  FuelType,
  GeocodingResult,
  PriceHistory,
  PriceHistoryPoint,
  PriceTrend,
  ServiceType,
  SortMode,
  StationSearchParams,
  StationStats,
  StationWithMetrics,
} from "@/types/station";
import { estimateDriveTimeMinutes, haversineDistance } from "@/utils/geo";

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

  if (normalized.includes("recharge") || normalized.includes("borne") || normalized.includes("electrique")) {
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
    return `${brand} • ${normalizedCity}`;
  }

  if (normalizedAddress) {
    return `Station ${normalizedCity} • ${normalizedAddress}`;
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
    openingHours: readableRanges.join(" • "),
    isOpen,
  };
};

const createSyntheticHistory = (stationId: string, fuel: FuelType, price: number): PriceHistoryPoint[] => {
  const days = 7;
  const hash = `${stationId}:${fuel}`.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const amplitude = ((hash % 4) + 1) * 0.002;
  const direction = hash % 2 === 0 ? -1 : 1;

  return Array.from({ length: days }, (_, index) => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (days - index - 1));

    return {
      date: currentDate.toISOString(),
      price: Number((price + direction * amplitude * (3 - index)).toFixed(3)),
    };
  });
};

const buildPriceHistory = (stationId: string, fuelPrices: FuelPrices): PriceHistory =>
  Object.entries(fuelPrices).reduce<PriceHistory>((history, [fuel, price]) => {
    if (price == null) {
      return history;
    }

    history[fuel as FuelType] = createSyntheticHistory(stationId, fuel as FuelType, price);
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
    priceHistory: buildPriceHistory(id, fuelPrices),
    priceUpdatedAt: fuels.reduce((acc, fuel) => {
      const field = FUEL_TO_API_MAJ_FIELD[fuel];
      const maj = record[field];
      if (typeof maj === "string") acc[fuel] = maj;
      return acc;
    }, {} as Partial<Record<FuelType, string>>),
    lastUpdatedAt: record.prix_maj?.split(",").sort().pop() || null,
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

    const existingPoints = nextHistory[fuel] ?? [];
    existingPoints.push({ date: entry.prix_maj, price: entry.prix_valeur });

    const currentPrice = station.fuelPrices[fuel];
    if (currentPrice != null) {
      existingPoints.push({ date: new Date().toISOString(), price: currentPrice });
    }

    nextHistory[fuel] = mergeHistoryPoints(existingPoints).slice(-30);
  });

  return {
    ...station,
    priceHistory: nextHistory,
  };
};

const buildMetrics = (
  station: FuelStation,
  position: Coordinates,
  fuel: FuelType,
  averagePrice: number | null,
  favoriteIds: string[],
  fillVolumeLiters: number = 50,
  consumptionLitersPer100Km: number = 7,
  routePosition?: Coordinates | null,
): StationWithMetrics => {
  const distanceKm = haversineDistance(position, { lat: station.lat, lng: station.lng });
  const selectedFuelPrice = station.fuelPrices[fuel] ?? null;
  const driveMinutes = estimateDriveTimeMinutes(distanceKm);
  const savingsPerLiter = (selectedFuelPrice != null && averagePrice != null) ? Math.max(averagePrice - selectedFuelPrice, 0) : null;
  
  const fillSavings = (selectedFuelPrice != null && averagePrice != null) ? (averagePrice - selectedFuelPrice) * fillVolumeLiters : 0;
  const detourCostValue = selectedFuelPrice != null ? (distanceKm * 2 * (consumptionLitersPer100Km / 100)) * selectedFuelPrice : 0;
  const netSavingsForTank = fillSavings - detourCostValue;

  return {
    ...station,
    distanceKm,
    selectedFuelPrice,
    estimatedDriveMinutes: driveMinutes,
    savingsPerLiter: savingsPerLiter && savingsPerLiter > 0 ? savingsPerLiter : null,
    isFavorite: favoriteIds.includes(station.id),
    fillVolumeLiters,
    estimatedDetourCost: detourCostValue,
    netSavingsForTank: netSavingsForTank > 0 ? netSavingsForTank : null,
    priceTrend: stationService.getTrend(station, fuel),
    isRouteDetour: Boolean(routePosition),
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
        const leftNet = (left.savingsPerLiter ?? 0) * left.fillVolumeLiters - (left.estimatedDetourCost ?? 0);
        const rightNet = (right.savingsPerLiter ?? 0) * right.fillVolumeLiters - (right.estimatedDetourCost ?? 0);
        return rightNet - leftNet || left.distanceKm - right.distanceKm;
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

class StationService {
  getMockStations() {
    return fuelStations;
  }

  async getStationsAround(position: Coordinates, radiusKm: number) {
    const records = await fuelApiService.getStationsAround(position, radiusKm);
    const stations = records.map(mapRecordToStation).filter((station): station is FuelStation => station != null);
    return dedupeStations(stations);
  }

  async getStationById(id: string) {
    const record = await fuelApiService.getStationById(id);
    return record ? mapRecordToStation(record) : null;
  }

  async enrichStationHistory(station: FuelStation): Promise<FuelStation> {
    try {
      const dailyHistory = await fuelApiService.getDailyHistory(station.id);
      return mergeStationHistory(station, dailyHistory);
    } catch {
      return station;
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
      label: `${result.label} • ${result.city}`,
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
    routePosition,
  }: StationSearchParams): StationWithMetrics[] {
    const scopedStations = stations
      .map((station) => ({
        station,
        distanceKm: haversineDistance(position, { lat: station.lat, lng: station.lng }),
      }))
      .filter((station) => station.distanceKm <= radiusKm)
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
          routePosition
        )
      ),
      sortMode,
    );
  }

  getComparableStations(stations: StationWithMetrics[]) {
    return stations.filter(
      (station): station is StationWithMetrics & { selectedFuelPrice: number } => station.selectedFuelPrice != null,
    );
  }

  getAbsoluteCheapestStation(stations: StationWithMetrics[]) {
    return this.getComparableStations(sortStations(stations, "price"))[0] ?? null;
  }

  getRecommendedBestStation(stations: StationWithMetrics[], radiusKm: number) {
    const comparableStations = this.getComparableStations(sortStations(stations, "price"));
    if (comparableStations.length === 0) {
      return null;
    }

    const focusRadiusKm = Math.min(radiusKm, 8);
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

  getStationFillSavings(station: StationWithMetrics, averagePrice: number | null, volume: number = 50) {
    const savingsPerLiter = this.getStationSavings(station, averagePrice);
    return savingsPerLiter != null ? savingsPerLiter * volume : null;
  }

  getStationNetSavingsForFill(
    station: StationWithMetrics,
    averagePrice: number | null,
    volume: number,
    consumption: number,
  ) {
    const fillSavings = this.getStationFillSavings(station, averagePrice, volume);
    if (fillSavings == null) {
      return null;
    }

    const detourCost = (station.distanceKm * 2 * (consumption / 100)) * (station.selectedFuelPrice ?? 1.8);
    return fillSavings - detourCost;
  }

  getStats(stations: StationWithMetrics[]): StationStats {
    const comparableStations = this.getComparableStations(stations);
    const averagePrice = this.getAveragePrice(stations);
    const cheapestStation = this.getAbsoluteCheapestStation(stations);

    return {
      stationCount: stations.length,
      comparableCount: comparableStations.length,
      averagePrice,
      maxSavings: cheapestStation && averagePrice != null ? Math.max(averagePrice - cheapestStation.selectedFuelPrice, 0) : null,
      maxNetSavings: null,
    };
  }

  getTrend(station: FuelStation, fuel: FuelType): PriceTrend {
    const history = station.priceHistory[fuel];
    if (!history || history.length < 2) {
      return "stable";
    }

    const first = history[0]?.price ?? history[history.length - 1].price;
    const last = history[history.length - 1]?.price ?? first;
    const delta = last - first;

    if (delta > 0.01) {
      return "up";
    }

    if (delta < -0.01) {
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
  ): { labels: string[]; prices: number[]; latestPrice: number | null; seriesCount: number; source: "official" | "mock" } {
    // Collect history points from all stations for the selected fuel
    const allPoints: { date: string; price: number }[] = [];
    let source: "official" | "mock" = "official";

    for (const station of stations) {
      const history = station.priceHistory?.[fuel];
      if (history && history.length > 0) {
        for (const point of history) {
          allPoints.push({ date: point.date, price: point.price });
        }
      }
    }

    if (allPoints.length === 0) {
      // Fallback: use stale prices from stations
      source = "mock";
      const stationsWithPrice = stations.filter(s => s.selectedFuelPrice != null);
      if (stationsWithPrice.length === 0) {
        return { labels: [], prices: [], latestPrice: null, seriesCount: 0, source };
      }
      const avg = stationsWithPrice.reduce((sum, s) => sum + (s.selectedFuelPrice ?? 0), 0) / stationsWithPrice.length;
      const today = new Date();
      const labels: string[] = [];
      const prices: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        labels.push(d.toISOString().slice(0, 10));
        prices.push(+(avg + (Math.random() - 0.5) * 0.02).toFixed(3));
      }
      return { labels, prices, latestPrice: prices[prices.length - 1] ?? null, seriesCount: stationsWithPrice.length, source };
    }

    // Group by date and compute daily average
    const byDate = new Map<string, number[]>();
    for (const pt of allPoints) {
      const day = pt.date.slice(0, 10);
      if (!byDate.has(day)) byDate.set(day, []);
      byDate.get(day)!.push(pt.price);
    }

    const sorted = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7);

    const labels = sorted.map(([d]) => d);
    const prices = sorted.map(([, pts]) => +(pts.reduce((s, p) => s + p, 0) / pts.length).toFixed(3));
    const latestPrice = prices[prices.length - 1] ?? null;

    return { labels, prices, latestPrice, seriesCount: stations.length, source };
  }

  getPriceTrendFromSeries(prices: number[]): PriceTrend {
    if (prices.length < 2) return "stable";
    const first = prices[0] ?? 0;
    const last = prices[prices.length - 1] ?? first;
    const delta = last - first;
    if (delta > 0.005) return "up";
    if (delta < -0.005) return "down";
    return "stable";
  }

  getDieselEssenceComparator(stations: StationWithMetrics[]): {
    dieselAverage: number | null;
    gasolineAverage: number | null;
    cheaperFuel: "Diesel" | "SP95" | null;
  } {
    const dieselStations = stations.filter(s => s.fuelPrices.Diesel != null);
    const gasolineStations = stations.filter(s => s.fuelPrices.SP95 != null);

    const dieselAverage = dieselStations.length > 0
      ? dieselStations.reduce((sum, s) => sum + (s.fuelPrices.Diesel ?? 0), 0) / dieselStations.length
      : null;

    const gasolineAverage = gasolineStations.length > 0
      ? gasolineStations.reduce((sum, s) => sum + (s.fuelPrices.SP95 ?? 0), 0) / gasolineStations.length
      : null;

    let cheaperFuel: "Diesel" | "SP95" | null = null;
    if (dieselAverage != null && gasolineAverage != null) {
      cheaperFuel = dieselAverage <= gasolineAverage ? "Diesel" : "SP95";
    } else if (dieselAverage != null) {
      cheaperFuel = "Diesel";
    } else if (gasolineAverage != null) {
      cheaperFuel = "SP95";
    }

    return { dieselAverage, gasolineAverage, cheaperFuel };
  }

  getAreaFuelComparison(stations: StationWithMetrics[]): { fuel: FuelType; averagePrice: number | null }[] {
    const fuels: FuelType[] = ["SP95", "SP98", "Diesel", "E85", "GPL"];
    return fuels.map(fuel => {
      const stationsWithFuel = stations.filter(s => s.fuelPrices[fuel] != null);
      const averagePrice = stationsWithFuel.length > 0
        ? stationsWithFuel.reduce((sum, s) => sum + (s.fuelPrices[fuel] ?? 0), 0) / stationsWithFuel.length
        : null;
      return { fuel, averagePrice };
    }).filter(entry => entry.averagePrice != null);
  }

  getAreaBrandComparison(stations: StationWithMetrics[], fuel: FuelType): { brand: string; averagePrice: number }[] {
    const brandMap = new Map<string, number[]>();
    for (const station of stations) {
      const price = station.fuelPrices[fuel];
      if (price == null || !station.brand) continue;
      if (!brandMap.has(station.brand)) brandMap.set(station.brand, []);
      brandMap.get(station.brand)!.push(price);
    }

    return [...brandMap.entries()]
      .map(([brand, prices]) => ({
        brand,
        averagePrice: prices.reduce((s, p) => s + p, 0) / prices.length,
      }))
      .sort((a, b) => a.averagePrice - b.averagePrice)
      .slice(0, 8);
  }

  getEuropeDieselEssenceComparator(market: { snapshots: { prices: Partial<Record<FuelType, number>> }[] }): {
    dieselAverage: number | null;
    gasolineAverage: number | null;
  } {
    const lastSnapshot = market.snapshots.at(-1);
    return {
      dieselAverage: lastSnapshot?.prices["Diesel"] ?? null,
      gasolineAverage: lastSnapshot?.prices["SP95"] ?? null,
    };
  }
}

export const stationService = new StationService();

