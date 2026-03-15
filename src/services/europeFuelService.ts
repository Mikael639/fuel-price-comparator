import { appConfig } from "@/config/app";
import { europeFuelMarkets, type EuropeFuelMarketsPayload } from "@/data/europeFuelSnapshots";
import { fetchJson } from "@/services/apiClient";

class EuropeFuelService {
  async getMarkets(options?: { signal?: AbortSignal }): Promise<EuropeFuelMarketsPayload> {
    if (!appConfig.europe.marketsUrl) {
      return {
        markets: europeFuelMarkets,
        source: "fallback",
        updatedAt: europeFuelMarkets[0]?.snapshots.at(-1)?.date ?? null,
        sourceLabel: "Snapshots locaux integres",
      };
    }

    try {
      const payload = await fetchJson<EuropeFuelMarketsPayload>(appConfig.europe.marketsUrl, {
        signal: options?.signal,
        timeoutMs: appConfig.europe.timeoutMs,
        errorMessage: "Les donnees europeennes live sont indisponibles.",
      });

      if (!payload.markets?.length) {
        throw new Error("empty_markets");
      }

      return payload;
    } catch {
      return {
        markets: europeFuelMarkets,
        source: "fallback",
        updatedAt: europeFuelMarkets[0]?.snapshots.at(-1)?.date ?? null,
        sourceLabel: "Snapshots locaux integres",
      };
    }
  }
}

export const europeFuelService = new EuropeFuelService();
