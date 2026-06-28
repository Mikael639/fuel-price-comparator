import type { FuelStation, FuelType, PriceHistoryPoint } from "@/types/station";
import { FUEL_TYPES } from "@/types/station";
import { loadStorage, saveStorage } from "@/utils/storage";

const STORAGE_KEY = "fuelflash:price-history:v1";
const MAX_DAYS = 30;

type LocalHistory = Record<string, Partial<Record<FuelType, PriceHistoryPoint[]>>>;

const getToday = () => new Date().toISOString().slice(0, 10);

const mergeAndClamp = (existing: PriceHistoryPoint[], incoming: PriceHistoryPoint[]): PriceHistoryPoint[] => {
  const byDate = new Map(existing.map((p) => [p.date, p]));
  incoming.forEach((p) => byDate.set(p.date, p));
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAYS);
};

class LocalPriceHistoryService {
  recordPrices(stations: FuelStation[]): void {
    const stored = loadStorage<LocalHistory>(STORAGE_KEY, {});
    const today = getToday();

    stations.forEach((station) => {
      if (!stored[station.id]) stored[station.id] = {};

      FUEL_TYPES.forEach((fuel) => {
        const price = station.fuelPrices[fuel];
        if (price == null) return;

        const existing = stored[station.id]![fuel] ?? [];
        const withoutToday = existing.filter((p) => p.date !== today);
        stored[station.id]![fuel] = [...withoutToday, { date: today, price }]
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-MAX_DAYS);
      });
    });

    saveStorage(STORAGE_KEY, stored);
  }

  enrichStation(station: FuelStation): FuelStation {
    const stored = loadStorage<LocalHistory>(STORAGE_KEY, {});
    const localEntry = stored[station.id];
    if (!localEntry) return station;

    const nextHistory = { ...station.priceHistory };
    let changed = false;

    FUEL_TYPES.forEach((fuel) => {
      const localPoints = localEntry[fuel];
      if (!localPoints?.length) return;

      const existing = nextHistory[fuel] ?? [];
      const merged = mergeAndClamp(existing, localPoints);
      if (merged.length !== existing.length) {
        nextHistory[fuel] = merged;
        changed = true;
      }
    });

    return changed ? { ...station, priceHistory: nextHistory } : station;
  }

  enrichStations(stations: FuelStation[]): FuelStation[] {
    const stored = loadStorage<LocalHistory>(STORAGE_KEY, {});
    if (!Object.keys(stored).length) return stations;
    return stations.map((s) => this.enrichStation(s));
  }
}

export const localPriceHistoryService = new LocalPriceHistoryService();
