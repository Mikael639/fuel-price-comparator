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
import { useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { europeFuelService } from "@/services/europeFuelService";
import { stationService } from "@/services/stationService";
import { europeFuelMarkets, type EuropeFuelMarketsPayload } from "@/data/europeFuelSnapshots";
import { formatDateLabel, formatDateTime, formatPrice } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function EuropePage() {
  const stations = useFuelStationsStore((s) => s.stations);
  const selectedFuel = useFuelStationsStore((s) => s.selectedFuel);
  
  const [selectedCountryCode, setSelectedCountryCode] = useState("FR");
  const [europePayload, setEuropePayload] = useState<EuropeFuelMarketsPayload>({
    markets: europeFuelMarkets,
    source: "fallback",
    updatedAt: europeFuelMarkets[0]?.snapshots.at(-1)?.date ?? null,
    sourceLabel: "Snapshots locaux intégrés",
  });
  const [isLoadingEurope, setIsLoadingEurope] = useState(false);

  useEffect(() => {
    const loadEuropeMarkets = async () => {
      setIsLoadingEurope(true);
      try {
        const payload = await europeFuelService.getMarkets();
        setEuropePayload(payload);
      } finally {
        setIsLoadingEurope(false);
      }
    };
    loadEuropeMarkets();
  }, []);

  const europeMarkets = europePayload.markets;
  const selectedMarket = useMemo(
    () => europeMarkets.find((m) => m.code === selectedCountryCode) ?? europeMarkets[0]!,
    [europeMarkets, selectedCountryCode]
  );

  const europeComparator = useMemo(
    () => stationService.getEuropeDieselEssenceComparator(selectedMarket),
    [selectedMarket]
  );

  const europeAllMarketsChartData: ChartData<"bar"> = {
    labels: europeMarkets.map((m) => m.name),
    datasets: [
      {
        label: "Diesel",
        data: europeMarkets.map((m) => m.snapshots.at(-1)?.prices.Diesel ?? null),
        backgroundColor: "#0f766e",
        borderRadius: 6,
      },
      {
        label: "SP95",
        data: europeMarkets.map((m) => m.snapshots.at(-1)?.prices.SP95 ?? null),
        backgroundColor: "#ffb703",
        borderRadius: 6,
      },
    ],
  };

  const europeSeriesChartData: ChartData<"line"> = {
    labels: selectedMarket.snapshots.map((s) => formatDateLabel(s.date)),
    datasets: [
      {
        label: "Diesel",
        data: selectedMarket.snapshots.map((s) => s.prices.Diesel ?? null),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.08)",
        tension: 0.28,
        pointRadius: 3,
      },
      {
        label: "SP95",
        data: selectedMarket.snapshots.map((s) => s.prices.SP95 ?? null),
        borderColor: "#ffb703",
        backgroundColor: "rgba(255, 183, 3, 0.08)",
        tension: 0.28,
        pointRadius: 3,
      },
    ],
  };

  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "bottom" as const },
    },
    scales: {
      y: {
        ticks: { callback: (value: any) => `${value} €/L` },
        grid: { color: "rgba(148, 163, 184, 0.18)" },
      },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-xl">
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: "radial-gradient(circle at top right, rgba(15,118,110,0.15), transparent 30%), linear-gradient(135deg, rgba(3,105,161,0.08), rgba(15,118,110,0.05))",
            }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Focus International</p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Panorama Européen</h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm">
                Comparez les lectures hebdomadaires de plusieurs marchés européens sans surcharger la page d'accueil.
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Europe Ranking */}
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Classement Europe</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Prix actuels au litre</h2>
              <p className="text-xs text-slate-500 mt-0.5">Comparatif Diesel et SP95 sur les derniers relevés.</p>
            </div>

            <div className={`mb-4 p-3 rounded-xl border text-xs ${europePayload.source === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30'}`}>
              ⚡ {europePayload.sourceLabel} {europePayload.updatedAt && `• Mis à jour le ${formatDateTime(europePayload.updatedAt)}`}
            </div>

            <div style={{ height: "19rem" }}>
              {isLoadingEurope ? (
                <div className="w-full h-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
              ) : (
                <Bar data={europeAllMarketsChartData} options={commonOptions} />
              )}
            </div>
          </div>

          {/* Country Focus */}
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-700/40 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Focus Pays</p>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tendance {selectedMarket.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lecture sur 7 points hebdomadaires.</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                {selectedMarket.currency}
              </div>
            </div>

            <div className="mb-6">
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="w-full max-w-[200px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-medium focus:ring-2 focus:ring-teal-500 transition-all outline-none"
              >
                {europeMarkets.map((m) => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">Diesel moyen</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatPrice(europeComparator.dieselAverage)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">Essence moyenne</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatPrice(europeComparator.gasolineAverage)}</span>
              </div>
            </div>

            <div style={{ height: "16rem" }}>
              {isLoadingEurope ? (
                <div className="w-full h-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
              ) : (
                <Line data={europeSeriesChartData} options={commonOptions} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
