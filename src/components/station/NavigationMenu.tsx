import { Navigation, Map, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getGoogleMapsDirectionsUrl, getWazeUrl, getAppleMapsUrl } from "@/utils/navigation";

type NavigationMenuTone = "surface" | "inverse";

interface NavigationMenuProps {
  lat: number;
  lng: number;
  className?: string;
  tone?: NavigationMenuTone;
}

const toneClasses: Record<NavigationMenuTone, string> = {
  surface:
    "border-slate-200 bg-slate-50 text-slate-700 shadow-sm shadow-slate-950/5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
  inverse: "border-white/10 bg-white/10 text-white hover:border-white/20 hover:bg-white/20",
};

export const NavigationMenu = ({ lat, lng, className, tone = "surface" }: NavigationMenuProps) => {
  const options = [
    { name: "Google Maps", icon: Map, url: getGoogleMapsDirectionsUrl(lat, lng) },
    { name: "Waze", icon: Navigation, url: getWazeUrl(lat, lng) },
    { name: "Apple Maps", icon: Compass, url: getAppleMapsUrl(lat, lng) },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.name}
          variant="tonal"
          className={cn(
            "h-auto min-h-[4.5rem] w-full rounded-2xl border px-2 py-3 text-center whitespace-normal sm:px-3",
            toneClasses[tone],
          )}
          asChild
        >
          <a href={option.url} rel="noreferrer" target="_blank" title={option.name}>
            <option.icon className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-semibold leading-tight sm:text-xs">{option.name}</span>
          </a>
        </Button>
      ))}
    </div>
  );
};
