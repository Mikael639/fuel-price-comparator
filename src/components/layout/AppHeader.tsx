import { Fuel, MoonStar, SunMedium } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";

export const AppHeader = () => {
  const themeName = useFuelStationsStore((state) => state.themeName);
  const setTheme = useFuelStationsStore((state) => state.setTheme);
  const isDark = themeName === "fuelDark";

  return (
    <header className="sticky top-0 z-30 border-b border-white/25 bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/68">
      <div className="container py-4">
        <div className="flex items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-600 text-white shadow-lg shadow-teal-700/20">
              <Fuel className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
                FuelFlash
              </p>
              <h1 className="truncate font-display text-lg tracking-tight">Comparateur carburants géolocalisé</h1>
            </div>
          </Link>

          <Button onClick={() => setTheme(isDark ? "fuelLight" : "fuelDark")} size="icon" variant="tonal">
            {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
