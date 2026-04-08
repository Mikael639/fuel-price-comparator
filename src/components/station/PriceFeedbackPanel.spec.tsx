import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PriceFeedbackPanel } from "@/components/station/PriceFeedbackPanel";

const serviceMocks = vi.hoisted(() => ({
  peekSummary: vi.fn(),
  getLocalCooldown: vi.fn(),
  markLocalCooldown: vi.fn(),
  getSummary: vi.fn(),
  submitFeedback: vi.fn(),
}));

vi.mock("@/services/priceFeedbackService", () => {
  class MockPriceFeedbackCooldownError extends Error {
    retryAt: string | null;
    summary: null;

    constructor(message: string, options?: { retryAt?: string | null; summary?: null }) {
      super(message);
      this.name = "PriceFeedbackCooldownError";
      this.retryAt = options?.retryAt ?? null;
      this.summary = options?.summary ?? null;
    }
  }

  return {
    PriceFeedbackCooldownError: MockPriceFeedbackCooldownError,
    priceFeedbackService: serviceMocks,
  };
});

describe("PriceFeedbackPanel", () => {
  beforeEach(() => {
    serviceMocks.peekSummary.mockReturnValue(null);
    serviceMocks.getLocalCooldown.mockReturnValue(null);
    serviceMocks.markLocalCooldown.mockReset();
    serviceMocks.getSummary.mockReset();
    serviceMocks.submitFeedback.mockReset();
  });

  it("makes the incorrect-price flow explicit in compact mode", () => {
    render(<PriceFeedbackPanel compact displayedPrice={1.688} fuel="Diesel" stationId="station-1" />);

    expect(screen.getByText(/Un prix vous semble faux/i)).toBeVisible();
    expect(screen.getByText(/Prix officiel affiche pour Diesel/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Prix incorrect/i }));

    expect(screen.getByLabelText(/Prix observe a la pompe/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /Envoyer mon prix/i })).toBeVisible();
  });

  it("uses explicit contrast classes in inverse tone", () => {
    render(<PriceFeedbackPanel compact displayedPrice={2.25} fuel="Diesel" stationId="station-1" tone="inverse" />);

    expect(screen.getByText(/Prix officiel affiche pour Diesel/i)).toHaveClass("text-white/70");
    expect(screen.getByRole("button", { name: /Prix correct/i })).toHaveClass("text-emerald-200");
    expect(screen.getByRole("button", { name: /Prix incorrect/i })).toHaveClass("text-white");
  });

  it("submits a reported observed price", async () => {
    serviceMocks.submitFeedback.mockResolvedValue({
      summary: {
        stationId: "station-1",
        fuel: "Diesel",
        confirmations: 0,
        reports: 1,
        lastConfirmedAt: null,
        lastReportedAt: "2026-04-08T10:00:00.000Z",
        latestFeedbackAt: "2026-04-08T10:00:00.000Z",
        latestSuggestedPrice: 1.679,
        suggestedPriceAverage: 1.679,
      },
    });

    render(<PriceFeedbackPanel displayedPrice={1.688} fuel="Diesel" stationId="station-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Prix incorrect/i }));
    fireEvent.change(screen.getByLabelText(/Prix observe a la pompe/i), {
      target: { value: "1,679" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer mon prix/i }));

    await waitFor(() => {
      expect(serviceMocks.submitFeedback).toHaveBeenCalledWith({
        stationId: "station-1",
        fuel: "Diesel",
        displayedPrice: 1.688,
        isCorrect: false,
        suggestedPrice: 1.679,
      });
    });

    expect(serviceMocks.markLocalCooldown).toHaveBeenCalledWith("station-1", "Diesel");
    expect(screen.getByText(/Merci, votre signalement a ete enregistre/i)).toBeVisible();
    expect(screen.getByText(/Prix constate ~ 1,679 EUR\/L/i)).toBeVisible();
  });
});
