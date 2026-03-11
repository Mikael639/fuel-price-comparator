import { useEffect } from "react";
import { AppRoutes } from "@/routes/AppRoutes";
import { AppShell } from "@/components/layout/AppShell";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";

export const App = () => {
  const themeName = useFuelStationsStore((state) => state.themeName);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeName === "fuelDark");
  }, [themeName]);

  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
};
