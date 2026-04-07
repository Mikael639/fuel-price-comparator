import { europeFuelMarkets, type EuropeFuelMarketsPayload } from "@/data/europeFuelSnapshots";

class EuropeFuelService {
  async getMarkets(options?: { signal?: AbortSignal }): Promise<EuropeFuelMarketsPayload> {
    const marketsUrl = import.meta.env.VITE_EUROPE_MARKETS_URL;

    if (!marketsUrl) {
      return {
        markets: europeFuelMarkets,
        source: "fallback",
        updatedAt: europeFuelMarkets[0]?.snapshots.at(-1)?.date ?? null,
        sourceLabel: "Snapshots locaux intégrés",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(marketsUrl, {
        signal: options?.signal ?? controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload: EuropeFuelMarketsPayload = await response.json();

      if (!payload.markets?.length) {
        throw new Error("empty_markets");
      }

      return payload;
    } catch {
      return {
        markets: europeFuelMarkets,
        source: "fallback",
        updatedAt: europeFuelMarkets[0]?.snapshots.at(-1)?.date ?? null,
        sourceLabel: "Snapshots locaux intégrés",
      };
    }
  }
}

export const europeFuelService = new EuropeFuelService();
