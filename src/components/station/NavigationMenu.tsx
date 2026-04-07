import { Navigation, Map, Globe, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <Button
          key={option.name}
          variant="tonal"
          size="sm"
          className="h-10 rounded-xl px-3 bg-white/10 hover:bg-white/20 border-white/10 text-white"
          asChild
        >
          <a href={option.url} rel="noreferrer" target="_blank" title={option.name}>
            <option.icon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{option.name}</span>
            <span className="sm:hidden">{option.name.split(' ')[0]}</span>
          </a>
        </Button>
      ))}
    </div>
  );
};
