import { LoaderCircle, MapPin, MapPinned, Navigation, RefreshCw, Search, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { Coordinates, GeocodingResult, LocationSource, MockLocation } from "@/types/station";

interface LocationPanelProps {
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  isSearchingRoute: boolean;
  geoError: string | null;
  geocodingError: string | null;
  locationLabel: string | null;
  locationSource: LocationSource;
  userPosition: Coordinates | null;
  manualLocationId: string | null;
  searchQuery: string;
  routeDestination: string;
  searchResults: GeocodingResult[];
  routeResults: GeocodingResult[];
  mockLocations: MockLocation[];
  onLocate: () => void;
  onRefresh: () => void;
  onDemo: () => void;
  onSelectManual: (value: string) => void;
  onSearchAddress: (query: string) => void;
  onSelectSearchResult: (result: GeocodingResult) => void;
  onSearchRoute: (query: string) => void;
  onSelectRouteResult: (result: GeocodingResult) => void;
  onClearRoute: () => void;
}

const getSourceLabel = (locationSource: LocationSource) => {
  switch (locationSource) {
    case "browser":
      return "Position GPS";
    case "manual":
      return "Position manuelle";
    case "demo":
      return "Mode demonstration";
    case "search":
      return "Recherche libre";
    default:
      return "Aucune position";
  }
};

export const LocationPanel = ({
  isGeolocating,
  isSearchingLocation,
  isSearchingRoute,
  geoError,
  geocodingError,
  locationLabel,
  locationSource,
  userPosition,
  manualLocationId,
  searchQuery,
  routeDestination,
  searchResults,
  routeResults,
  mockLocations,
  onLocate,
  onRefresh,
  onDemo,
  onSelectManual,
  onSearchAddress,
  onSelectSearchResult,
  onSearchRoute,
  onSelectRouteResult,
  onClearRoute,
}: LocationPanelProps) => {
  return (
    <Card className="glass-panel">
      <CardContent className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_26rem] md:p-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Geolocalisation & Itineraire</p>
            <h3 className="font-display text-2xl tracking-tight">Optimisez vos pleins sur votre trajet</h3>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Trouvez les stations les moins cheres autour de votre position ou comparez les prix entre votre depart et votre destination.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onLocate}>
              {isGeolocating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              Utiliser ma position
            </Button>
            <Button onClick={onRefresh} variant="tonal">
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button onClick={onDemo} variant="accent">
              <MapPinned className="h-4 w-4" />
              Position de demonstration
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Current Location Input */}
          <div className="space-y-2 relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  defaultValue={searchQuery}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onSearchAddress((event.target as HTMLInputElement).value);
                    }
                  }}
                  placeholder="Ville ou adresse de DEPART"
                  className="pl-10"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                size="icon"
                onClick={(event) => {
                  const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.value ?? "";
                  onSearchAddress(input);
                }}
              >
                {isSearchingLocation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[20px] border border-border bg-card shadow-lg p-1 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-muted"
                    key={result.id}
                    onClick={() => onSelectSearchResult(result)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{`${result.label} • ${result.city}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Input (Itinerary) */}
          <div className="space-y-2 relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={routeDestination}
                  onChange={(e) => onSearchRoute(e.target.value)}
                  placeholder="Ville ou adresse de DESTINATION"
                  className="pl-10"
                />
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                {routeDestination && (
                  <button 
                    onClick={onClearRoute}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onSearchRoute(routeDestination)}
              >
                {isSearchingRoute ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {routeResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[20px] border border-border bg-card shadow-lg p-1 max-h-60 overflow-y-auto">
                {routeResults.map((result) => (
                  <button
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-muted"
                    key={result.id}
                    onClick={() => onSelectRouteResult(result)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{`${result.label} • ${result.city}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-border/50 bg-muted/30 p-3">
             <div className="flex items-center gap-3">
               <div className="text-xs uppercase tracking-widest text-muted-foreground">Villes de demonstration</div>
               <select
                 className="flex-1 bg-transparent text-sm outline-none font-semibold text-primary"
                 onChange={(event) => event.target.value && onSelectManual(event.target.value)}
                 value={manualLocationId ?? ""}
               >
                 <option value="">Choisir une ville</option>
                 {mockLocations.map((location) => (
                   <option key={location.id} value={location.id}>
                     {location.label}
                   </option>
                 ))}
               </select>
             </div>
          </div>

          {geoError ? <Alert variant="warning">{geoError}</Alert> : null}
          {geocodingError ? <Alert variant="info">{geocodingError}</Alert> : null}
        </div>
      </CardContent>
    </Card>
  );
};
