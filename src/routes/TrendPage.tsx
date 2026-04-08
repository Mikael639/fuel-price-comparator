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
import {
  Activity,
  BarChart3,
  Clock3,
  Fuel,
  Gauge,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { Bar, Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFuelStationsViewModel } from "@/hooks/useFuelStationsViewModel";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { formatDateLabel, formatDateTime, formatFreshness, formatMoney, formatPrice, trendCopy } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const panelClass =
  "surface-panel relative overflow-hidden border-white/60 bg-white/80 dark:border-slate-700/40 dark:bg-slate-900/80";

const trendAppearance = {
  up: {
    Icon: TrendingUp,
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    valueClass: "text-amber-600 dark:text-amber-300",
  },
  down: {
    Icon: TrendingDown,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    valueClass: "text-emerald-600 dark:text-emerald-300",
  },
  stable: {
    Icon: Activity,
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    valueClass: "text-sky-600 dark:text-sky-300",
  },
} as const;

export default function TrendPage() {
  const initialize = useFuelStationsStore((state) => state.initialize);
  const hasHydrated = useFuelStationsStore((state) => state.hasHydrated);
  const refreshPosition = useFuelStationsStore((state) => state.refreshPosition);
  const selectedFuel = useFuelStationsStore((state) => state.selectedFuel);
  const userPosition = useFuelStationsStore((state) => state.userPosition);
  const locationLabel = useFuelStationsStore((state) => state.userPosition?.label ?? null);
  const isLoading = useFuelStationsStore((state) => state.isLoading);
  const isHydratingHistory = useFuelStationsStore((state) => state.isHydratingHistory);
  const genericError = useFuelStationsStore((state) => state.genericError);
  const { nearbyStations } = useFuelStationsViewModel();

  useEffect(() => {
    if (hasHydrated) {
      void initialize();
    }
  }, [hasHydrated, initialize]);

  const hasOfficialLocalData = useMemo(
    () => nearbyStations.some((station) => station.dataOrigin === "official"),
    [nearbyStations],
  );

  const displayStations = useMemo(
    () =>
      hasOfficialLocalData
        ? nearbyStations.filter((station) => station.dataOrigin === "official")
        : nearbyStations,
    [hasOfficialLocalData, nearbyStations],
  );

  const localWeeklyTrend = useMemo(
    () => stationService.getAreaWeeklyFuelTrend(displayStations, selectedFuel),
    [displayStations, selectedFuel],
  );

  const localStats = useMemo(
    () => stationService.getStats(displayStations, selectedFuel),
    [displayStations, selectedFuel],
  );

  const localTrendDirection = useMemo(
    () => stationService.getPriceTrendFromSeries(localWeeklyTrend.prices),
    [localWeeklyTrend.prices],
  );

  const localComparator = useMemo(
    () => stationService.getDieselEssenceComparator(displayStations),
    [displayStations],
  );

  const localFuelComparison = useMemo(
    () => stationService.getAreaFuelComparison(displayStations),
    [displayStations],
  );

  const localBrandComparison = useMemo(
    () => stationService.getAreaBrandComparison(displayStations, selectedFuel),
    [displayStations, selectedFuel],
  );

  const localDelta = useMemo(() => {
    if (localWeeklyTrend.prices.length < 2) {
      return null;
    }

    const first = localWeeklyTrend.prices[0] ?? 0;
    const last = localWeeklyTrend.prices[localWeeklyTrend.prices.length - 1] ?? first;
    return last - first;
  }, [localWeeklyTrend.prices]);

  const localCheapestFuel = useMemo(
    () =>
      [...localFuelComparison]
        .filter((entry) => entry.averagePrice != null)
        .sort((left, right) => (left.averagePrice ?? Infinity) - (right.averagePrice ?? Infinity))[0] ?? null,
    [localFuelComparison],
  );

  const hasWeeklyTrendData = localWeeklyTrend.seriesCount > 0 && localWeeklyTrend.prices.length > 1;
  const isRefreshing = isLoading || isHydratingHistory;
  const hasLocation = Boolean(userPosition);
  const hasDisplayStations = displayStations.length > 0;
  const freshnessLabel = localStats.freshestPriceUpdate ? formatFreshness(localStats.freshestPriceUpdate) : "Inconnue";
  const trendMeta = trendAppearance[localTrendDirection];

  const localTrendChartData: ChartData<"line"> = {
    labels: localWeeklyTrend.labels.map((label) => formatDateLabel(label)),
    datasets: [
      {
        label: selectedFuel,
        data: localWeeklyTrend.prices,
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.14)",
        fill: true,
        borderWidth: 3,
        tension: 0.32,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const fuelComparisonChartData: ChartData<"bar"> = {
    labels: localFuelComparison.map((item) => item.fuel),
    datasets: [
      {
        label: "Prix moyen local",
        data: localFuelComparison.map((item) => item.averagePrice),
        backgroundColor: ["#0f766e", "#0891b2", "#ffb703", "#84cc16", "#f97316", "#8b5cf6"],
        borderRadius: 10,
      },
    ],
  };

  const brandComparisonChartData: ChartData<"bar"> = {
    labels: localBrandComparison.map((item) => item.brand),
    datasets: [
      {
        label: `Prix moyen (${selectedFuel})`,
        data: localBrandComparison.map((item) => item.averagePrice),
        backgroundColor: ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#a3e635"],
        borderRadius: 8,
      },
    ],
  };

  const lineChartOptions: ChartOptions<"line"> = {
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

  const barChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        ticks: { callback: (value) => `${value} EUR/L` },
        grid: { color: "rgba(148, 163, 184, 0.18)" },
      },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20">
      <div className="hero-glow hero-glow-left" />
      <div className="hero-glow hero-glow-right" />

      <div className="relative mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="glass-panel relative overflow-hidden p-6 md:p-8">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255,183,3,0.16), transparent 28%), radial-gradient(circle at bottom left, rgba(15,118,110,0.14), transparent 26%)",
            }}
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={hasOfficialLocalData ? "success" : hasLocation ? "warning" : "outline"}>
                  {hasOfficialLocalData ? "Données officielles DGCCRF" : hasLocation ? "Dataset local de secours" : "Zone non définie"}
                </Badge>
                {locationLabel ? <Badge variant="secondary">{locationLabel}</Badge> : null}
                {hasDisplayStations ? <Badge variant="outline">{localStats.comparableCount} stations comparables</Badge> : null}
              </div>

              <SectionHeading
                eyebrow="Tendances"
                subtitle="La page suit votre zone active et vos filtres. Les relevés se rafraîchissent maintenant en priorité depuis les données officielles, avec une lecture plus claire de leur fraîcheur."
                title="Marché local"
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  className="min-w-[12rem]"
                  disabled={!hasLocation || isRefreshing}
                  onClick={() => void refreshPosition()}
                  variant="tonal"
                >
                  {isRefreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Rafraîchir les données
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">Retour à l'accueil</Link>
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">Radar local</p>
                <ShieldCheck className="h-4 w-4 text-teal-300" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-display text-4xl">{hasDisplayStations ? localStats.comparableCount : 0}</div>
                  <div className="text-sm text-white/65">stations avec prix comparables</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Carburant</div>
                    <div className="mt-2 text-lg font-semibold">{selectedFuel}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Fraîcheur</div>
                    <div className="mt-2 text-lg font-semibold">{freshnessLabel}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/70">Lecture dominante</div>
                  <div className="mt-2 text-sm leading-6 text-teal-50">
                    {hasOfficialLocalData
                      ? "Les graphiques s'appuient sur les remontées officielles de la zone visible."
                      : "L'API officielle n'a pas répondu pour cette zone. Le jeu local de secours garde la lecture disponible."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {genericError ? <Alert variant={hasOfficialLocalData ? "warning" : "error"}>{genericError}</Alert> : null}

        {!hasOfficialLocalData && hasLocation && hasDisplayStations ? (
          <Alert variant="warning">
            Les tendances locales affichent le dataset de secours car l'API officielle n'a pas répondu pour cette zone.
          </Alert>
        ) : null}

        {hasLocation && hasDisplayStations ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={`${panelClass} p-5`}>
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-teal-500/12 via-transparent to-transparent" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600 dark:text-teal-300">
                      <Fuel className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary">{selectedFuel}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prix local actuel</p>
                    <p className="mt-2 font-mono text-3xl font-black text-slate-900 dark:text-white">
                      {formatPrice(localWeeklyTrend.latestPrice)}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Moyenne consolidée sur les relevés disponibles dans votre zone visible.
                  </p>
                </div>
              </div>

              <div className={`${panelClass} p-5`}>
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-amber-400/12 via-transparent to-transparent" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-amber-400/10 p-3 text-amber-600 dark:text-amber-300">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${trendMeta.badgeClass}`}>
                      <trendMeta.Icon className="h-3.5 w-3.5" />
                      {trendCopy[localTrendDirection]}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Impulsion 7 jours</p>
                    <p className={`mt-2 text-3xl font-black ${trendMeta.valueClass}`}>{formatMoney(localDelta)}</p>
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Variation entre le premier et le dernier point de la série hebdomadaire locale.
                  </p>
                </div>
              </div>

              <div className={`${panelClass} p-5`}>
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-sky-400/12 via-transparent to-transparent" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600 dark:text-sky-300">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <Badge variant={localStats.staleCount > 0 ? "warning" : "success"}>
                      {localStats.staleCount > 0 ? `${localStats.staleCount} anciens` : "Récents"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fraîcheur locale</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{freshnessLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {formatDateTime(localStats.freshestPriceUpdate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${panelClass} p-5`}>
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-emerald-400/12 via-transparent to-transparent" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300">
                      <Gauge className="h-5 w-5" />
                    </div>
                    <Badge variant={hasOfficialLocalData ? "success" : "warning"}>
                      {hasOfficialLocalData ? "Officiel" : "Secours"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Portée locale</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {localStats.comparableCount}/{localStats.stationCount}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Stations avec prix exploitables dans la zone active {locationLabel ? `autour de ${locationLabel}.` : "."}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,1fr)]">
              <div className={`${panelClass} p-5 md:p-6`}>
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <Badge variant="outline">Évolution sur 7 jours</Badge>
                    <div>
                      <h2 className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">Graphique hebdomadaire</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Moyenne du {selectedFuel} sur les sept derniers jours disponibles, calculée sur les stations visibles dans votre zone.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={hasOfficialLocalData ? "success" : "warning"}>{localWeeklyTrend.seriesCount} station(s)</Badge>
                    <Badge variant="secondary">{hasOfficialLocalData ? "Source officielle" : "Source de secours"}</Badge>
                  </div>
                </div>

                {hasWeeklyTrendData ? (
                  <div style={{ height: "21rem" }}>
                    <Line data={localTrendChartData} options={lineChartOptions} />
                  </div>
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-[24px] bg-slate-50 text-sm text-slate-400 dark:bg-slate-800/50">
                    Pas assez d'historique pour afficher une tendance exploitable.
                  </div>
                )}
              </div>

              <div className={`${panelClass} p-5 md:p-6`}>
                <div className="mb-4 space-y-2">
                  <Badge variant="outline">Panorama local</Badge>
                  <div>
                    <h2 className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">Multi-carburants</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Lecture moyenne des carburants proposés dans la zone active pour situer rapidement les écarts.
                    </p>
                  </div>
                </div>

                <div className="mb-5" style={{ height: "13rem" }}>
                  <Bar data={fuelComparisonChartData} options={barChartOptions} />
                </div>

                <div className="space-y-1">
                  {localFuelComparison.map(({ fuel, averagePrice }) => (
                    <div
                      className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      key={fuel}
                    >
                      <span className="text-sm text-slate-500">{fuel}</span>
                      <strong className="text-sm text-slate-900 dark:text-white">{formatPrice(averagePrice)}</strong>
                    </div>
                  ))}
                </div>

                {localCheapestFuel ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                    Le moins cher actuellement : <strong>{localCheapestFuel.fuel}</strong> à {formatPrice(localCheapestFuel.averagePrice)}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.35fr)]">
              <div className={`${panelClass} p-5 md:p-6`}>
                <div className="mb-5 space-y-2">
                  <Badge variant="outline">Diesel / Essence</Badge>
                  <div>
                    <h2 className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">Comparateur local</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Les moyennes suivent les stations visibles et les relevés les plus récents chargés dans la zone active.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Diesel moyen", value: formatPrice(localComparator.dieselAverage) },
                    { label: "Essence moyenne", value: formatPrice(localComparator.gasolineAverage) },
                    { label: "Moins cher aujourd'hui", value: localComparator.cheaperFuel ?? "Indisponible" },
                  ].map((item) => (
                    <div
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30"
                      key={item.label}
                    >
                      <span className="text-sm text-slate-500">{item.label}</span>
                      <strong className="text-sm text-slate-900 dark:text-white">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${panelClass} p-5 md:p-6`}>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <Badge variant="outline">Palmarès des enseignes</Badge>
                    <div>
                      <h2 className="font-display text-2xl tracking-tight text-slate-900 dark:text-white">Moyennes locales</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Classement des enseignes les plus compétitives sur {selectedFuel}, dans votre périmètre courant.
                      </p>
                    </div>
                  </div>
                  {localBrandComparison.length > 0 ? <Badge variant="secondary">Top {localBrandComparison.length}</Badge> : null}
                </div>

                {localBrandComparison.length > 0 ? (
                  <>
                    <div className="mb-5" style={{ height: "15rem" }}>
                      <Bar
                        data={brandComparisonChartData}
                        options={{
                          ...barChartOptions,
                          plugins: { legend: { display: false } },
                          scales: {
                            ...barChartOptions.scales,
                            y: {
                              min: Math.max(0, (localBrandComparison[0]?.averagePrice ?? 1) - 0.2),
                              ticks: { callback: (value) => `${value} EUR/L` },
                              grid: { color: "rgba(148, 163, 184, 0.18)" },
                            },
                          },
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {localBrandComparison.map((brand, index) => (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            index === 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                          key={brand.brand}
                        >
                          #{index + 1} {brand.brand} ({formatPrice(brand.averagePrice)})
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-[24px] bg-slate-50 text-sm text-slate-400 dark:bg-slate-800/50">
                    Pas assez d'enseignes qualifiées pour établir un palmarès fiable.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className={`${panelClass} p-8 text-center`}>
            {isRefreshing ? (
              <div className="space-y-3 text-slate-500 dark:text-slate-400">
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-teal-500" />
                <p className="text-lg font-medium">Chargement des tendances locales</p>
                <p className="text-sm">Les relevés officiels sont en cours de récupération.</p>
              </div>
            ) : !hasLocation ? (
              <div className="space-y-3 text-slate-500 dark:text-slate-400">
                <MapPin className="mx-auto h-8 w-8 text-teal-500" />
                <p className="text-lg font-medium">Aucune zone locale active</p>
                <p className="text-sm">Sélectionnez d'abord une ville ou votre position sur la page d'accueil.</p>
                <Button asChild className="mt-2">
                  <Link to="/">Explorer les stations</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-slate-500 dark:text-slate-400">
                <MapPin className="mx-auto h-8 w-8 text-teal-500" />
                <p className="text-lg font-medium">Pas assez de données locales pour tracer une tendance</p>
                <p className="text-sm">Élargissez le rayon ou relancez un rafraîchissement des relevés pour cette zone.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
