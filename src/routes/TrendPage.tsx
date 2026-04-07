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
import { useMemo } from "react";
import { Bar, Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { stationService } from "@/services/stationService";
import { formatDateLabel, formatMoney, formatPrice, trendCopy } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function TrendPage() {
  const stations = useFuelStationsStore((s) => s.stations);
  const selectedFuel = useFuelStationsStore((s) => s.selectedFuel);

  const localWeeklyTrend = useMemo(
    () => stationService.getAreaWeeklyFuelTrend(stations as any, selectedFuel),
    [stations, selectedFuel],
  );

  const localTrendDirection = useMemo(
    () => stationService.getPriceTrendFromSeries(localWeeklyTrend.prices),
    [localWeeklyTrend.prices],
  );

  const localComparator = useMemo(
    () => stationService.getDieselEssenceComparator(stations as any),
    [stations],
  );

  const localFuelComparison = useMemo(
    () => stationService.getAreaFuelComparison(stations as any),
    [stations],
  );

  const localBrandComparison = useMemo(
    () => stationService.getAreaBrandComparison(stations as any, selectedFuel),
    [stations, selectedFuel],
  );

  const localDelta = useMemo(() => {
    if (localWeeklyTrend.prices.length < 2) return null;
    const first = localWeeklyTrend.prices[0] ?? 0;
    const last = localWeeklyTrend.prices[localWeeklyTrend.prices.length - 1] ?? first;
    return last - first;
  }, [localWeeklyTrend.prices]);

  const localCheapestFuel = useMemo(
    () =>
      [...localFuelComparison]
        .filter((e) => e.averagePrice != null)
        .sort((a, b) => (a.averagePrice ?? Infinity) - (b.averagePrice ?? Infinity))[0] ?? null,
    [localFuelComparison],
  );

  const hasWeeklyTrendData = localWeeklyTrend.seriesCount > 0 && localWeeklyTrend.prices.length > 1;

  // Chart data
  const localTrendChartData: ChartData<"line"> = {
    labels: localWeeklyTrend.labels.map((l) => formatDateLabel(l)),
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
        backgroundColor: ["#0f766e", "#0891b2", "#ffb703", "#84cc16", "#f97316"],
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
        borderRadius: 6,
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
        ticks: { callback: (value) => `${value} €/L` },
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
        ticks: { callback: (value) => `${value} €/L` },
        grid: { color: "rgba(148, 163, 184, 0.18)" },
      },
      x: { grid: { display: false } },
    },
  };

  const trendColors: Record<string, string> = {
    up: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    down: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    stable: "text-sky-500 bg-sky-50 dark:bg-sky-900/20",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-xl">
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: "radial-gradient(circle at top right, rgba(255,183,3,0.15), transparent 30%), linear-gradient(135deg, rgba(15,118,110,0.08), rgba(3,105,161,0.05))",
            }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Tendances</p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Marché local</h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm">
                Lecture locale sur 7 jours, comparaison Diesel / Essence et panorama multi-carburants.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
            >
              ← Retour
            </Link>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local price card */}
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Prix local actuel</p>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{selectedFuel}</h2>
            <p className="text-3xl font-black text-teal-600 dark:text-teal-400 font-mono mb-2">
              {formatPrice(localWeeklyTrend.latestPrice)}
            </p>
            <p className="text-sm text-slate-500 mb-3">
              Écart hebdomadaire : <strong className={localDelta != null && localDelta < 0 ? "text-emerald-500" : "text-yellow-500"}>{formatMoney(localDelta)}</strong>
            </p>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${trendColors[localTrendDirection]}`}>
              {localTrendDirection === "up" ? "↑" : localTrendDirection === "down" ? "↓" : "→"} {trendCopy[localTrendDirection]}
            </span>
          </div>

          {/* Diesel/Essence comparator */}
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Diesel / Essence</p>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Comparateur local</h2>
            <div className="space-y-2">
              {[
                { label: "Diesel moyen", value: formatPrice(localComparator.dieselAverage) },
                { label: "Essence moyenne (SP95)", value: formatPrice(localComparator.gasolineAverage) },
                { label: "Moins cher aujourd'hui", value: localComparator.cheaperFuel ?? "Indisponible" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <strong className="text-sm text-slate-800 dark:text-slate-200 font-semibold">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend charts row */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {/* Weekly trend chart */}
          <div className="md:col-span-4 rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tendance locale</p>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Graphique hebdomadaire</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Moyenne du {selectedFuel} sur les 7 derniers jours.
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${localWeeklyTrend.source === "official" ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                {localWeeklyTrend.seriesCount} station(s)
              </span>
            </div>

            {localWeeklyTrend.source === "mock" && hasWeeklyTrendData && (
              <div className="mb-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 text-xs text-yellow-700 dark:text-yellow-400">
                ⚠️ Historique officiel insuffisant — tendance basée sur le dataset local de secours.
              </div>
            )}

            {hasWeeklyTrendData ? (
              <div style={{ height: "19rem" }}>
                <Line data={localTrendChartData} options={lineChartOptions} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-sm">
                Pas assez d'historique pour afficher une tendance.
              </div>
            )}
          </div>

          {/* Fuel comparison chart */}
          <div className="md:col-span-3 rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Panorama local</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Multi-carburants</h2>
              <p className="text-xs text-slate-500 mt-0.5">Diesl, Essence, E85, GPL…</p>
            </div>

            <div style={{ height: "12rem" }} className="mb-4">
              <Bar data={fuelComparisonChartData} options={barChartOptions} />
            </div>

            <div className="space-y-1 mt-2">
              {localFuelComparison.map(({ fuel, averagePrice }) => (
                <div key={fuel} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <span className="text-xs text-slate-500">{fuel}</span>
                  <strong className="text-xs text-slate-800 dark:text-slate-200">{formatPrice(averagePrice)}</strong>
                </div>
              ))}
            </div>

            {localCheapestFuel && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-xs text-emerald-700 dark:text-emerald-400">
                🏆 Le moins cher : <strong>{localCheapestFuel.fuel}</strong> à {formatPrice(localCheapestFuel.averagePrice)}
              </div>
            )}
          </div>
        </div>

        {/* Brand comparison */}
        {localBrandComparison.length > 0 && (
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Palmares des Enseignes</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Moyennes locales ({selectedFuel})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Classement des enseignes les moins chères dans la zone visible.</p>
            </div>

            <div style={{ height: "14rem" }} className="mb-4">
              <Bar
                data={brandComparisonChartData}
                options={{
                  ...barChartOptions,
                  plugins: { legend: { display: false } },
                  scales: {
                    ...barChartOptions.scales,
                    y: {
                      min: Math.max(0, (localBrandComparison[0]?.averagePrice ?? 1) - 0.2),
                      ticks: { callback: (value) => `${value} €/L` },
                      grid: { color: "rgba(148, 163, 184, 0.18)" },
                    },
                  },
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {localBrandComparison.map((brand, i) => (
                <span
                  key={brand.brand}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    i === 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  #{i + 1} {brand.brand} ({formatPrice(brand.averagePrice)})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stations.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-lg font-medium">Aucune donnée disponible</p>
            <p className="text-sm mt-1">Sélectionnez d'abord une position sur la page d'accueil.</p>
            <Link to="/" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
              Explorer les stations
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
