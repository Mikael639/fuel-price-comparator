import { LoaderCircle, MapPin, Navigation, RefreshCw, Search, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { GeocodingResult, LocationSource } from "@/types/station";

interface LocationPanelProps {
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  isSearchingRoute: boolean;
  geoError: string | null;
  geocodingError: string | null;
  locationLabel: string | null;
  locationSource: LocationSource;
  searchQuery: string;
  routeDestination: string;
  searchResults: GeocodingResult[];
  routeResults: GeocodingResult[];
  onLocate: () => void;
  onRefresh: () => void;
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
  searchQuery,
  routeDestination,
  searchResults,
  routeResults,
  onLocate,
  onRefresh,
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
            <div className="flex flex-wrap gap-2">
              <Badge variant={locationLabel ? "success" : "outline"}>
                {locationLabel ? "Zone active" : "Aucune zone active"}
              </Badge>
              <Badge variant="secondary">Recherche locale + trajet</Badge>
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Géolocalisation & Itinéraire</p>
            <h3 className="font-display text-2xl tracking-tight">Optimisez vos pleins sur votre trajet</h3>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Trouvez les stations les moins chères autour de votre position ou comparez les prix entre votre départ et votre destination.
            </p>
            {locationLabel ? (
              <p className="text-xs text-muted-foreground">
                {getSourceLabel(locationSource)} : {locationLabel}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button className="min-h-12 w-full sm:min-w-[12rem] sm:w-auto" onClick={onLocate}>
              {isGeolocating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              Utiliser ma position
            </Button>
            <Button className="min-h-12 w-full sm:min-w-[12rem] sm:w-auto" onClick={onRefresh} variant="tonal">
              <RefreshCw className="h-4 w-4" />
              Rafraîchir les relevés
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative space-y-2 rounded-[24px] border border-border/70 bg-background/70 p-3 shadow-sm">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Départ</p>
              <p className="text-xs text-muted-foreground">Recherchez votre ville ou une adresse précise.</p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  defaultValue={searchQuery}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onSearchAddress((event.target as HTMLInputElement).value);
                    }
                  }}
                  placeholder="Ville ou adresse de DÉPART"
                  className="border-border/60 bg-background pl-10"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                className="h-12 w-12 shrink-0 rounded-2xl"
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
                    aria-label={`${result.label} - ${result.city}`}
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-muted"
                    key={result.id}
                    onClick={() => onSelectSearchResult(result)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{`${result.label} - ${result.city}`}</span>
                    <span aria-hidden="true" className="text-xs text-muted-foreground">
                      {result.address}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative space-y-2 rounded-[24px] border border-border/70 bg-background/70 p-3 shadow-sm">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Destination optionnelle</p>
              <p className="text-xs text-muted-foreground">Ajoutez une arrivée pour comparer le trajet, pas seulement le point de départ.</p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={routeDestination}
                  onChange={(e) => onSearchRoute(e.target.value)}
                  placeholder="Ville ou adresse de DESTINATION"
                  className="border-border/60 bg-background pl-10"
                />
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                {routeDestination && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={onClearRoute}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-2xl"
                onClick={() => onSearchRoute(routeDestination)}
              >
                {isSearchingRoute ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {routeResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[20px] border border-border bg-card shadow-lg p-1 max-h-60 overflow-y-auto">
                {routeResults.map((result) => (
                  <button
                    aria-label={`${result.label} - ${result.city}`}
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-muted"
                    key={result.id}
                    onClick={() => onSelectRouteResult(result)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{`${result.label} - ${result.city}`}</span>
                    <span aria-hidden="true" className="text-xs text-muted-foreground">
                      {result.address}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {geoError ? <Alert variant="warning">{geoError}</Alert> : null}
          {geocodingError ? <Alert variant="info">{geocodingError}</Alert> : null}
        </div>
      </CardContent>
    </Card>
  );
};

