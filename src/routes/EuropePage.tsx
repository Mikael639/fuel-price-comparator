import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Clock3, LoaderCircle, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EuropeFuelMarketsPayload } from "@/data/europeFuelSnapshots";
import { europeFuelService } from "@/services/europeFuelService";
import { stationService } from "@/services/stationService";
import { formatDateLabel, formatDateTime, formatFreshness, formatLongDate, formatPrice } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const commonOptions: ChartOptions<"bar" | "line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "bottom" },
  },
  scales: {
    y: {
      ticks: { callback: (value) => `${value} EUR/L` },
      grid: { color: "rgba(148, 163, 184, 0.18)" },
    },
    x: { grid: { display: false } },
  },
};

export default function EuropePage() {
  const [selectedCountryCode, setSelectedCountryCode] = useState("FR");
  const [europePayload, setEuropePayload] = useState<EuropeFuelMarketsPayload | null>(null);
  const [isLoadingEurope, setIsLoadingEurope] = useState(true);

  const loadEuropeMarkets = async (forceRefresh = false) => {
    setIsLoadingEurope(true);
    try {
      const payload = await europeFuelService.getMarkets({ forceRefresh });
      setEuropePayload(payload);
    } finally {
      setIsLoadingEurope(false);
    }
  };

  useEffect(() => {
    void loadEuropeMarkets();
  }, []);

  const europeMarkets = europePayload?.markets ?? [];
  const selectedMarket = useMemo(
    () => europeMarkets.find((market) => market.code === selectedCountryCode) ?? europeMarkets[0] ?? null,
    [europeMarkets, selectedCountryCode],
  );

  const europeComparator = useMemo(
    () =>
      selectedMarket
        ? stationService.getEuropeDieselEssenceComparator(selectedMarket)
        : { dieselAverage: null, gasolineAverage: null },
    [selectedMarket],
  );

  const europeAllMarketsChartData: ChartData<"bar"> = {
    labels: europeMarkets.map((market) => market.name),
    datasets: [
      {
        label: "Diesel",
        data: europeMarkets.map((market) => market.snapshots.at(-1)?.prices.Diesel ?? null),
        backgroundColor: "#0f766e",
        borderRadius: 6,
      },
      {
        label: "SP95",
        data: europeMarkets.map((market) => market.snapshots.at(-1)?.prices.SP95 ?? null),
        backgroundColor: "#ffb703",
        borderRadius: 6,
      },
    ],
  };

  const europeSeriesChartData: ChartData<"line"> = {
    labels: selectedMarket?.snapshots.map((snapshot) => formatDateLabel(snapshot.date)) ?? [],
    datasets: [
      {
        label: "Diesel",
        data: selectedMarket?.snapshots.map((snapshot) => snapshot.prices.Diesel ?? null) ?? [],
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.08)",
        tension: 0.28,
        pointRadius: 3,
      },
      {
        label: "SP95",
        data: selectedMarket?.snapshots.map((snapshot) => snapshot.prices.SP95 ?? null) ?? [],
        borderColor: "#ffb703",
        backgroundColor: "rgba(255, 183, 3, 0.08)",
        tension: 0.28,
        pointRadius: 3,
      },
    ],
  };

  const latestUpdate = europePayload?.updatedAt ?? null;
  const isLiveEuropeData = europePayload?.source === "live";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="relative overflow-hidden rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/80 md:p-8">
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(15,118,110,0.15), transparent 30%), radial-gradient(circle at bottom left, rgba(59,130,246,0.12), transparent 24%)",
            }}
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={isLiveEuropeData ? "success" : "warning"}>
                  {isLiveEuropeData ? "Bulletin hebdomadaire officiel" : "Snapshot local de secours"}
                </Badge>
                {latestUpdate ? <Badge variant="secondary">Semaine du {formatLongDate(latestUpdate)}</Badge> : null}
              </div>

              <SectionHeading
                eyebrow="Focus international"
                subtitle="Le panorama européen suit un rythme hebdomadaire. La page donne une lecture plus premium des derniers relevés consolidés sans les faire passer pour du temps réel."
                title="Panorama européen"
              />

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void loadEuropeMarkets(true)} disabled={isLoadingEurope} variant="tonal">
                  {isLoadingEurope ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Rafraîchir l'Europe
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">Retour à l'accueil</Link>
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Bulletin</p>
                <Badge variant="secondary" className="bg-white/10 text-white dark:bg-white/10 dark:text-white">
                  {selectedMarket?.name ?? "Europe"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-display text-4xl">{europeMarkets.length}</div>
                  <div className="text-sm text-white/65">marchés comparés</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Cadence</div>
                    <div className="mt-2 text-lg font-semibold">{isLiveEuropeData ? "Hebdo" : "Secours"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Fraîcheur</div>
                    <div className="mt-2 text-lg font-semibold">{latestUpdate ? formatFreshness(latestUpdate) : "Inconnue"}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-100/70">Lecture dominante</div>
                  <div className="mt-2 text-sm leading-6 text-sky-50">
                    La page affiche des relevés hebdomadaires consolidés pour comparer les marchés, pas un flux intraday.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {europePayload ? (
          <Alert variant={isLiveEuropeData ? "info" : "warning"}>
            {europePayload.sourceLabel}
            {latestUpdate ? ` • semaine du ${formatLongDate(latestUpdate)} • ${formatFreshness(latestUpdate)}` : ""}
          </Alert>
        ) : null}

        {!isLiveEuropeData && europePayload ? (
          <Alert variant="warning">
            Les données live européennes sont indisponibles pour le moment. La page affiche un snapshot embarqué plus ancien.
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="surface-panel relative overflow-hidden border-white/60 bg-white/80 p-5 dark:border-slate-700/40 dark:bg-slate-900/80">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Source</p>
            <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-white">Cadence de mise à jour</h2>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isLiveEuropeData ? "Hebdomadaire" : "Fallback local"}
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
              Les marchés européens sont consolidés semaine par semaine. Un écart de quelques jours entre la date du jour et
              le relevé affiché est normal.
            </p>
          </div>

          <div className="surface-panel relative overflow-hidden border-white/60 bg-white/80 p-5 dark:border-slate-700/40 dark:bg-slate-900/80">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Dernier relevé</p>
            <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-white">Fraîcheur des données</h2>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Clock3 className="h-4 w-4 text-teal-500" />
              <span>{latestUpdate ? formatFreshness(latestUpdate) : "Inconnue"}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDateTime(latestUpdate)}</p>
          </div>

          <div className="surface-panel relative overflow-hidden border-white/60 bg-white/80 p-5 dark:border-slate-700/40 dark:bg-slate-900/80">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Focus pays</p>
            <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-white">Marché sélectionné</h2>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedMarket?.name ?? "Chargement..."}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
              La série affiche les sept derniers points hebdomadaires disponibles pour le pays choisi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="surface-panel relative overflow-hidden border-white/60 bg-white/80 p-5 dark:border-slate-700/40 dark:bg-slate-900/80">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Classement Europe</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Derniers relevés hebdomadaires</h2>
              <p className="mt-0.5 text-xs text-slate-500">Comparatif Diesel et SP95 sur le dernier point officiel disponible.</p>
            </div>

            <div style={{ height: "19rem" }}>
              {isLoadingEurope || !europePayload ? (
                <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ) : (
                <Bar data={europeAllMarketsChartData} options={commonOptions as ChartOptions<"bar">} />
              )}
            </div>
          </div>

          <div className="surface-panel relative overflow-hidden border-white/60 bg-white/80 p-5 dark:border-slate-700/40 dark:bg-slate-900/80">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Focus pays</p>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tendance {selectedMarket?.name ?? ""}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Lecture sur les sept derniers bulletins disponibles.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {selectedMarket?.currency ?? "EUR"}
              </div>
            </div>

            <div className="mb-6">
              <select
                className="w-full max-w-[200px] rounded-xl border-none bg-slate-50 px-3 py-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-teal-500 dark:bg-slate-800"
                onChange={(event) => setSelectedCountryCode(event.target.value)}
                value={selectedCountryCode}
              >
                {europeMarkets.map((market) => (
                  <option key={market.code} value={market.code}>
                    {market.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                <span className="mb-1 block text-[10px] uppercase text-slate-400">Diesel moyen</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatPrice(europeComparator.dieselAverage)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                <span className="mb-1 block text-[10px] uppercase text-slate-400">Essence moyenne</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatPrice(europeComparator.gasolineAverage)}</span>
              </div>
            </div>

            <div style={{ height: "16rem" }}>
              {isLoadingEurope || !selectedMarket ? (
                <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ) : (
                <Line data={europeSeriesChartData} options={commonOptions as ChartOptions<"line">} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
