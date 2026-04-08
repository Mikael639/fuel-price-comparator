import { appConfig } from "@/config/app";
import { ApiServiceError } from "@/services/apiClient";
import type { PriceFeedbackEnvelope, PriceFeedbackSummary, SubmitPriceFeedbackInput } from "@/types/priceFeedback";
import type { FuelType } from "@/types/station";

const createFeedbackKey = (stationId: string, fuel: FuelType) => `${stationId}::${fuel}`;

const createLocalStorageKey = (stationId: string, fuel: FuelType) => `fuel-flash:price-feedback:${stationId}:${fuel}`;

const parseJsonResponse = async <T>(response: Response) => {
  const rawPayload = await response.text();

  if (!rawPayload.trim()) {
    throw new ApiServiceError("La reponse retour prix est vide.", {
      code: "invalid_json",
      status: response.status,
    });
  }

  try {
    return JSON.parse(rawPayload) as T;
  } catch {
    throw new ApiServiceError("La reponse retour prix est invalide.", {
      code: "invalid_json",
      status: response.status,
    });
  }
};

export class PriceFeedbackCooldownError extends ApiServiceError {
  readonly retryAt: string | null;
  readonly summary: PriceFeedbackSummary | null;

  constructor(message: string, options?: { retryAt?: string | null; summary?: PriceFeedbackSummary | null }) {
    super(message, { code: "http", status: 429 });
    this.name = "PriceFeedbackCooldownError";
    this.retryAt = options?.retryAt ?? null;
    this.summary = options?.summary ?? null;
  }
}

class PriceFeedbackService {
  private readonly summaryCache = new Map<string, PriceFeedbackSummary>();
  private readonly pendingSummaryRequests = new Map<string, Promise<PriceFeedbackSummary>>();

  getLocalCooldown(stationId: string, fuel: FuelType) {
    if (typeof window === "undefined") {
      return null;
    }

    const rawValue = window.localStorage.getItem(createLocalStorageKey(stationId, fuel));

    if (!rawValue) {
      return null;
    }

    const parsedTime = new Date(rawValue).getTime();

    if (Number.isNaN(parsedTime)) {
      window.localStorage.removeItem(createLocalStorageKey(stationId, fuel));
      return null;
    }

    const blockedUntil = parsedTime + appConfig.feedback.cooldownHours * 60 * 60 * 1000;

    if (blockedUntil <= Date.now()) {
      window.localStorage.removeItem(createLocalStorageKey(stationId, fuel));
      return null;
    }

    return {
      submittedAt: rawValue,
      blockedUntil: new Date(blockedUntil).toISOString(),
      remainingMs: blockedUntil - Date.now(),
    };
  }

  markLocalCooldown(stationId: string, fuel: FuelType, submittedAt = new Date().toISOString()) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(createLocalStorageKey(stationId, fuel), submittedAt);
  }

  peekSummary(stationId: string, fuel: FuelType) {
    return this.summaryCache.get(createFeedbackKey(stationId, fuel)) ?? null;
  }

  async getSummary(stationId: string, fuel: FuelType) {
    const cacheKey = createFeedbackKey(stationId, fuel);
    const cachedSummary = this.summaryCache.get(cacheKey);

    if (cachedSummary) {
      return cachedSummary;
    }

    const pendingRequest = this.pendingSummaryRequests.get(cacheKey);

    if (pendingRequest) {
      return pendingRequest;
    }

    const requestUrl = new URL(appConfig.feedback.endpoint, window.location.origin);
    requestUrl.searchParams.set("stationId", stationId);
    requestUrl.searchParams.set("fuel", fuel);

    const request = (async () => {
      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await parseJsonResponse<PriceFeedbackEnvelope>(response);

      if (!response.ok) {
        throw new ApiServiceError(payload.error ?? "Impossible de charger les retours prix.", {
          status: response.status,
          code: "http",
        });
      }

      this.summaryCache.set(cacheKey, payload.summary);
      return payload.summary;
    })();

    this.pendingSummaryRequests.set(cacheKey, request);

    try {
      return await request;
    } finally {
      this.pendingSummaryRequests.delete(cacheKey);
    }
  }

  async submitFeedback(input: SubmitPriceFeedbackInput) {
    const response = await fetch(appConfig.feedback.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        suggestedPrice: input.suggestedPrice ?? null,
      }),
    });

    const payload = await parseJsonResponse<PriceFeedbackEnvelope>(response);
    const cacheKey = createFeedbackKey(input.stationId, input.fuel);

    if (payload.summary) {
      this.summaryCache.set(cacheKey, payload.summary);
    }

    if (response.status === 429) {
      throw new PriceFeedbackCooldownError(
        payload.error ?? "Un retour a deja ete envoye recemment pour cette station.",
        {
          retryAt: payload.retryAt ?? null,
          summary: payload.summary ?? null,
        },
      );
    }

    if (!response.ok) {
      throw new ApiServiceError(payload.error ?? "Impossible d'enregistrer votre retour prix.", {
        status: response.status,
        code: "http",
      });
    }

    return payload;
  }
}

export const priceFeedbackService = new PriceFeedbackService();
