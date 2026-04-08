import { Navigation, Map, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getGoogleMapsDirectionsUrl, getWazeUrl, getAppleMapsUrl } from "@/utils/navigation";

interface NavigationMenuProps {
  lat: number;
  lng: number;
  className?: string;
}

export const NavigationMenu = ({ lat, lng, className }: NavigationMenuProps) => {
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
          size="sm"
          className="h-11 w-full rounded-xl border-white/10 bg-white/10 px-2 text-white hover:bg-white/20 sm:px-3"
          asChild
        >
          <a href={option.url} rel="noreferrer" target="_blank" title={option.name}>
            <option.icon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">{option.name}</span>
            <span className="md:hidden">{option.name.split(" ")[0]}</span>
          </a>
        </Button>
      ))}
    </div>
  );
};
