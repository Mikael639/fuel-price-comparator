import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, MessageSquareQuote } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";
import { priceFeedbackService, PriceFeedbackCooldownError } from "@/services/priceFeedbackService";
import type { PriceFeedbackSummary } from "@/types/priceFeedback";
import type { FuelType } from "@/types/station";
import { formatDateTime, formatPrice } from "@/utils/format";

interface PriceFeedbackPanelProps {
  stationId: string;
  fuel: FuelType;
  displayedPrice: number | null | undefined;
  compact?: boolean;
  eagerSummary?: boolean;
  className?: string;
}

type Notice = {
  variant: "success" | "warning" | "error" | "info";
  message: string;
};

const parseSuggestedPrice = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : null;
};

const formatRemainingDelay = (remainingMs: number) => {
  const roundedMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

  if (roundedMinutes >= 60) {
    const roundedHours = Math.ceil(roundedMinutes / 60);
    return `${roundedHours} h`;
  }

  return `${roundedMinutes} min`;
};

const summaryHasSignal = (summary: PriceFeedbackSummary | null) =>
  Boolean(summary && (summary.confirmations > 0 || summary.reports > 0 || summary.suggestedPriceAverage != null));

const localCooldownMs = appConfig.feedback.cooldownHours * 60 * 60 * 1000;

export const PriceFeedbackPanel = ({
  stationId,
  fuel,
  displayedPrice,
  compact = false,
  eagerSummary = false,
  className,
}: PriceFeedbackPanelProps) => {
  const [summary, setSummary] = useState<PriceFeedbackSummary | null>(() => priceFeedbackService.peekSummary(stationId, fuel));
  const [showIncorrectForm, setShowIncorrectForm] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(eagerSummary);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);

  useEffect(() => {
    setSummary(priceFeedbackService.peekSummary(stationId, fuel));
    setShowIncorrectForm(false);
    setSuggestedPrice("");
    setNotice(null);
  }, [stationId, fuel]);

  useEffect(() => {
    if (!eagerSummary || displayedPrice == null) {
      setIsLoadingSummary(false);
      return;
    }

    let cancelled = false;

    setIsLoadingSummary(true);
    void priceFeedbackService
      .getSummary(stationId, fuel)
      .then((nextSummary) => {
        if (!cancelled) {
          setSummary(nextSummary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotice({
            variant: "info",
            message: "Les retours communaute ne sont pas disponibles pour le moment.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSummary(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayedPrice, eagerSummary, fuel, stationId]);

  useEffect(() => {
    const cooldown = priceFeedbackService.getLocalCooldown(stationId, fuel);

    if (!cooldown) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownTick(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [fuel, stationId, cooldownTick]);

  const cooldown = useMemo(() => priceFeedbackService.getLocalCooldown(stationId, fuel), [cooldownTick, fuel, stationId]);

  if (displayedPrice == null) {
    return null;
  }

  const submitFeedback = async (isCorrect: boolean) => {
    if (cooldown) {
      setNotice({
        variant: "warning",
        message: `Un retour a deja ete envoye depuis ce navigateur. Reessayez dans ${formatRemainingDelay(
          cooldown.remainingMs,
        )}.`,
      });
      return;
    }

    const parsedSuggestedPrice = parseSuggestedPrice(suggestedPrice);

    if (!isCorrect && suggestedPrice.trim() && parsedSuggestedPrice == null) {
      setNotice({
        variant: "error",
        message: "Le prix constate doit etre un nombre valide, par exemple 1,749.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await priceFeedbackService.submitFeedback({
        stationId,
        fuel,
        displayedPrice,
        isCorrect,
        suggestedPrice: isCorrect ? null : parsedSuggestedPrice,
      });

      priceFeedbackService.markLocalCooldown(stationId, fuel);
      setSummary(response.summary);
      setShowIncorrectForm(false);
      setSuggestedPrice("");
      setCooldownTick(Date.now());
      setNotice({
        variant: "success",
        message: isCorrect
          ? "Merci, votre confirmation a ete enregistree."
          : "Merci, votre signalement a ete enregistre.",
      });
    } catch (error) {
      if (error instanceof PriceFeedbackCooldownError) {
        if (error.summary) {
          setSummary(error.summary);
        }

        if (error.retryAt) {
          const blockedUntil = new Date(error.retryAt).getTime();
          const submittedAt = new Date(blockedUntil - localCooldownMs).toISOString();
          priceFeedbackService.markLocalCooldown(stationId, fuel, submittedAt);
          setCooldownTick(Date.now());
        }

        setNotice({
          variant: "warning",
          message:
            error.message || "Un retour prix a deja ete enregistre recemment depuis ce navigateur pour cette station.",
        });
        return;
      }

      setNotice({
        variant: "error",
        message: error instanceof Error ? error.message : "Le retour prix a echoue.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/35",
        compact ? "space-y-3" : "space-y-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-primary">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Retour communaute
          </div>
          <p className={cn("text-sm text-muted-foreground", compact && "text-xs leading-5")}>
            Confirmez si le prix affiche vous semble juste. Le prix officiel reste prioritaire.
          </p>
        </div>

        {isLoadingSummary ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Chargement
          </div>
        ) : null}
      </div>

      {summaryHasSignal(summary) ? (
        <div className="flex flex-wrap gap-2">
          {summary && summary.confirmations > 0 ? (
            <Badge variant="success">{summary.confirmations} confirmation(s)</Badge>
          ) : null}
          {summary && summary.reports > 0 ? <Badge variant="warning">{summary.reports} signalement(s)</Badge> : null}
          {summary?.suggestedPriceAverage != null ? (
            <Badge variant="outline">Prix constate ~ {formatPrice(summary.suggestedPriceAverage)}</Badge>
          ) : null}
          {!compact && summary?.latestFeedbackAt ? (
            <Badge variant="outline">Dernier retour {formatDateTime(summary.latestFeedbackAt)}</Badge>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="h-11 flex-1 rounded-xl"
          disabled={isSubmitting}
          onClick={() => void submitFeedback(true)}
          type="button"
          variant="tonal"
        >
          <CheckCircle2 className="h-4 w-4" />
          Prix correct
        </Button>

        <Button
          className="h-11 flex-1 rounded-xl"
          disabled={isSubmitting}
          onClick={() => setShowIncorrectForm((currentValue) => !currentValue)}
          type="button"
          variant="outline"
        >
          <CircleAlert className="h-4 w-4" />
          Prix incorrect
        </Button>
      </div>

      {showIncorrectForm ? (
        <div className="space-y-3 rounded-[20px] border border-amber-400/20 bg-amber-500/5 p-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              Signalement simple
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Vous pouvez proposer le prix constate, sans obligation.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              className="h-11 rounded-xl"
              inputMode="decimal"
              onChange={(event) => setSuggestedPrice(event.target.value)}
              placeholder="Prix constate, ex. 1,749"
              value={suggestedPrice}
            />
            <Button
              className="h-11 rounded-xl sm:min-w-[9rem]"
              disabled={isSubmitting}
              onClick={() => void submitFeedback(false)}
              type="button"
              variant="danger"
            >
              {isSubmitting ? "Envoi..." : "Envoyer"}
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? <Alert variant={notice.variant}>{notice.message}</Alert> : null}
    </div>
  );
};
