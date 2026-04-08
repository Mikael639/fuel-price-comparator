import type { FuelType } from "@/types/station";

export interface PriceFeedbackSummary {
  stationId: string;
  fuel: FuelType;
  confirmations: number;
  reports: number;
  lastConfirmedAt: string | null;
  lastReportedAt: string | null;
  latestFeedbackAt: string | null;
  latestSuggestedPrice: number | null;
  suggestedPriceAverage: number | null;
}

export interface PriceFeedbackEnvelope {
  summary: PriceFeedbackSummary;
  cooldownHours: number;
  storage: "file" | "memory";
  retryAt?: string | null;
  error?: string;
}

export interface SubmitPriceFeedbackInput {
  stationId: string;
  fuel: FuelType;
  displayedPrice: number;
  isCorrect: boolean;
  suggestedPrice?: number | null;
}
