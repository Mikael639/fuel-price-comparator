import { Moon, Sun } from "lucide-react";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  const themeName = useFuelStationsStore((state) => state.themeName);
  const setTheme = useFuelStationsStore((state) => state.setTheme);

  const isDark = themeName === "fuelDark";

  const toggleTheme = () => {
    setTheme(isDark ? "fuelLight" : "fuelDark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-full text-foreground hover:bg-muted"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-all text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 transition-all text-slate-700" />
      )}
    </Button>
  );
};
