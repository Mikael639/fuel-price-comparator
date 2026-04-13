import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  tone?: "default" | "inverse";
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
  tone = "default",
  className,
}: PriceFeedbackPanelProps) => {
  const suggestedPriceInputId = useId();
  const suggestedPriceHintId = `${suggestedPriceInputId}-hint`;
  const suggestedPriceInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (!showIncorrectForm) {
      return;
    }

    suggestedPriceInputRef.current?.focus();
  }, [showIncorrectForm]);

  const cooldown = useMemo(() => priceFeedbackService.getLocalCooldown(stationId, fuel), [cooldownTick, fuel, stationId]);
  const displayedPriceLabel = formatPrice(displayedPrice);
  const helperCopy = compact
    ? "Un prix vous semble faux ? Signalez-le et, si vous le connaissez, indiquez le prix observe a la pompe."
    : "Confirmez si le prix affiche vous semble juste. Si ce n'est pas le cas, vous pouvez indiquer le prix observe a la pompe.";
  const isInverse = tone === "inverse";

  const containerClassName = isInverse
    ? "border-white/12 bg-slate-950/90 text-white shadow-[0_20px_45px_rgba(2,6,23,0.38)]"
    : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-slate-900/50";
  const bodyCopyClassName = isInverse ? "text-slate-200" : "text-muted-foreground dark:text-slate-300";
  const loadingClassName = isInverse ? "text-slate-300" : "text-muted-foreground dark:text-slate-300";
  const priceStripClassName = isInverse
    ? "border-white/12 bg-slate-900/95 text-slate-200"
    : "border-slate-200/80 bg-slate-50/70 text-muted-foreground dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300";
  const priceValueClassName = isInverse ? "text-white" : "text-foreground dark:text-white";
  const summaryBadgeClassName = isInverse ? "border-white/12 bg-white/10 text-slate-50" : "dark:border-white/10 dark:bg-white/5 dark:text-slate-200";
  const confirmationBadgeClassName = isInverse ? "border border-emerald-300/25 bg-emerald-500/18 text-emerald-50" : "dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200";
  const warningBadgeClassName = isInverse ? "border border-amber-300/25 bg-amber-400/18 text-amber-50" : "dark:border-amber-400/30 dark:bg-amber-400/20 dark:text-amber-200";
  const correctButtonClassName = isInverse
    ? "border border-emerald-300/30 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/28"
    : "dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20";
  const incorrectButtonClassName = isInverse
    ? "border-white/12 bg-slate-900/95 text-white hover:bg-slate-800"
    : "dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:hover:bg-slate-900";
  const formPanelClassName = isInverse
    ? "border-amber-300/25 bg-amber-400/12"
    : "border-amber-400/20 bg-amber-500/5 dark:border-amber-400/20 dark:bg-amber-500/10";
  const formTitleClassName = isInverse ? "text-amber-200" : "text-amber-700 dark:text-amber-400";
  const formCopyClassName = isInverse ? "text-slate-200" : "text-muted-foreground dark:text-slate-300";
  const labelClassName = isInverse ? "text-white" : "text-foreground dark:text-white";
  const inputClassName = isInverse
    ? "border-white/12 bg-slate-950 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400/60"
    : "dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:ring-primary";
  const hintClassName = isInverse ? "text-slate-300" : "text-muted-foreground dark:text-slate-400";
  const cancelButtonClassName = isInverse ? "text-white hover:bg-white/10" : "dark:text-white dark:hover:bg-white/10";
  const submitButtonClassName = isInverse ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400";
  const alertClassNameByVariant: Record<Notice["variant"], string> = {
    success: isInverse ? "border-emerald-400/25 bg-emerald-500/18 text-emerald-50" : "dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200",
    warning: isInverse ? "border-amber-300/25 bg-amber-400/18 text-amber-50" : "dark:border-amber-400/30 dark:bg-amber-400/20 dark:text-amber-200",
    error: isInverse ? "border-red-300/25 bg-red-400/18 text-red-50" : "dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-200",
    info: isInverse ? "border-sky-300/25 bg-sky-400/18 text-sky-50" : "dark:border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-200",
  };

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
        "rounded-[24px] border p-4 shadow-sm backdrop-blur-sm",
        containerClassName,
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
          <p className={cn("text-sm", bodyCopyClassName, compact && "text-xs leading-5")}>
            {helperCopy}
          </p>
        </div>

        {isLoadingSummary ? (
          <div className={cn("flex items-center gap-2 text-xs", loadingClassName)}>
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Chargement
          </div>
        ) : null}
      </div>

      {summaryHasSignal(summary) ? (
        <div className="flex flex-wrap gap-2">
          {summary && summary.confirmations > 0 ? (
            <Badge className={confirmationBadgeClassName} variant="success">
              {summary.confirmations} confirmation(s)
            </Badge>
          ) : null}
          {summary && summary.reports > 0 ? (
            <Badge className={warningBadgeClassName} variant="warning">
              {summary.reports} signalement(s)
            </Badge>
          ) : null}
          {summary?.suggestedPriceAverage != null ? (
            <Badge className={summaryBadgeClassName} variant="outline">
              Prix constate ~ {formatPrice(summary.suggestedPriceAverage)}
            </Badge>
          ) : null}
          {!compact && summary?.latestFeedbackAt ? (
            <Badge className={summaryBadgeClassName} variant="outline">
              Dernier retour {formatDateTime(summary.latestFeedbackAt)}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className={cn("rounded-[18px] border px-3 py-2 text-xs", priceStripClassName)}>
        Prix officiel affiche pour {fuel} : <span className={cn("font-semibold", priceValueClassName)}>{displayedPriceLabel}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className={cn("h-11 flex-1 rounded-xl", correctButtonClassName)}
          disabled={isSubmitting}
          onClick={() => void submitFeedback(true)}
          type="button"
          variant="tonal"
        >
          <CheckCircle2 className="h-4 w-4" />
          Prix correct
        </Button>

        <Button
          className={cn("h-11 flex-1 rounded-xl", incorrectButtonClassName)}
          disabled={isSubmitting}
          onClick={() => setShowIncorrectForm((currentValue) => !currentValue)}
          type="button"
          variant="outline"
        >
          <CircleAlert className="h-4 w-4" />
          {showIncorrectForm ? "Fermer le signalement" : "Prix incorrect"}
        </Button>
      </div>

      {showIncorrectForm ? (
        <div className={cn("space-y-3 rounded-[20px] border p-3", formPanelClassName)}>
          <div className="space-y-1">
            <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", formTitleClassName)}>
              Signalement simple
            </p>
            <p className={cn("text-xs leading-5", formCopyClassName)}>
              Saisissez le prix vu a la pompe si vous l'avez. Le prix officiel reste la reference tant qu'il n'est pas mis a jour.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className={cn("text-xs font-semibold", labelClassName)} htmlFor={suggestedPriceInputId}>
                Prix observe a la pompe
              </label>
              <Input
                className={cn("h-11 rounded-xl", inputClassName)}
                id={suggestedPriceInputId}
                inputMode="decimal"
                onChange={(event) => setSuggestedPrice(event.target.value)}
                placeholder="Ex. 1,679"
                ref={suggestedPriceInputRef}
                value={suggestedPrice}
              />
              <p className={cn("text-[11px] leading-5", hintClassName)} id={suggestedPriceHintId}>
                Champ facultatif. Vous pouvez envoyer le signalement meme sans nouveau prix.
              </p>
            </div>
            <div className="flex gap-3 sm:self-end">
              <Button
                className={cn("h-11 rounded-xl", cancelButtonClassName)}
                disabled={isSubmitting}
                onClick={() => setShowIncorrectForm(false)}
                type="button"
                variant="ghost"
              >
                Annuler
              </Button>
              <Button
                aria-describedby={suggestedPriceHintId}
                className={cn("h-11 rounded-xl sm:min-w-[11rem]", submitButtonClassName)}
                disabled={isSubmitting}
                onClick={() => void submitFeedback(false)}
                type="button"
                variant="danger"
              >
                {isSubmitting ? "Envoi..." : "Envoyer mon prix"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <Alert className={alertClassNameByVariant[notice.variant]} variant={notice.variant}>
          {notice.message}
        </Alert>
      ) : null}
    </div>
  );
};
