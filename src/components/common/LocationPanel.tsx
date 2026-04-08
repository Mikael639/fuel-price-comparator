import { useEffect, useState } from "react";
import { LoaderCircle, MapPin, Navigation, RefreshCw, Search, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatDriveTime } from "@/utils/format";
import type { GeocodingResult, LocationSource, RoutePath } from "@/types/station";

interface LocationPanelProps {
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  isSearchingRoute: boolean;
  isLoadingRoute: boolean;
  geoError: string | null;
  geocodingError: string | null;
  routeError: string | null;
  locationLabel: string | null;
  locationSource: LocationSource;
  searchQuery: string;
  routeDestination: string;
  routePath: RoutePath | null;
  searchResults: GeocodingResult[];
  routeResults: GeocodingResult[];
  onLocate: () => void;
  onRefresh: () => void;
  onSearchAddress: (query: string, options?: { immediate?: boolean }) => void;
  onSelectSearchResult: (result: GeocodingResult) => void;
  onSearchRoute: (query: string, options?: { immediate?: boolean }) => void;
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
  isLoadingRoute,
  geoError,
  geocodingError,
  routeError,
  locationLabel,
  locationSource,
  searchQuery,
  routeDestination,
  routePath,
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
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [activeRouteIndex, setActiveRouteIndex] = useState(-1);

  useEffect(() => {
    setActiveSearchIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchResults]);

  useEffect(() => {
    setActiveRouteIndex(routeResults.length > 0 ? 0 : -1);
  }, [routeResults]);

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
                  aria-controls="departure-results"
                  aria-expanded={searchResults.length > 0}
                  aria-haspopup="listbox"
                  value={searchQuery}
                  onChange={(event) => onSearchAddress(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && searchResults.length > 0) {
                      event.preventDefault();
                      setActiveSearchIndex((currentIndex) =>
                        Math.min(currentIndex + 1, searchResults.length - 1),
                      );
                      return;
                    }

                    if (event.key === "ArrowUp" && searchResults.length > 0) {
                      event.preventDefault();
                      setActiveSearchIndex((currentIndex) =>
                        Math.max(currentIndex - 1, 0),
                      );
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();

                      if (searchResults.length > 0) {
                        onSelectSearchResult(
                          searchResults[activeSearchIndex] ?? searchResults[0]!,
                        );
                        return;
                      }

                      onSearchAddress((event.target as HTMLInputElement).value, {
                        immediate: true,
                      });
                    }
                  }}
                  placeholder="Ville ou adresse de DÉPART"
                  className="border-border/60 bg-background pl-10"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                aria-label="Rechercher le depart"
                className="h-12 w-12 shrink-0 rounded-2xl"
                size="icon"
                onClick={() => onSearchAddress(searchQuery, { immediate: true })}
              >
                {isSearchingLocation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div
                id="departure-results"
                className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-[20px] border border-border bg-card p-1 shadow-lg"
                role="listbox"
              >
                {searchResults.map((result, index) => (
                  <button
                    aria-label={`${result.label} - ${result.city}`}
                    aria-selected={index === activeSearchIndex}
                    className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition ${
                      index === activeSearchIndex ? "bg-muted" : "hover:bg-muted"
                    }`}
                    key={result.id}
                    onClick={() => onSelectSearchResult(result)}
                    onMouseEnter={() => setActiveSearchIndex(index)}
                    role="option"
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
                  aria-controls="destination-results"
                  aria-expanded={routeResults.length > 0}
                  aria-haspopup="listbox"
                  value={routeDestination}
                  onChange={(event) => onSearchRoute(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && routeResults.length > 0) {
                      event.preventDefault();
                      setActiveRouteIndex((currentIndex) =>
                        Math.min(currentIndex + 1, routeResults.length - 1),
                      );
                      return;
                    }

                    if (event.key === "ArrowUp" && routeResults.length > 0) {
                      event.preventDefault();
                      setActiveRouteIndex((currentIndex) =>
                        Math.max(currentIndex - 1, 0),
                      );
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();

                      if (routeResults.length > 0) {
                        onSelectRouteResult(
                          routeResults[activeRouteIndex] ?? routeResults[0]!,
                        );
                        return;
                      }

                      onSearchRoute(routeDestination, { immediate: true });
                    }
                  }}
                  placeholder="Ville ou adresse de DESTINATION"
                  className="border-border/60 bg-background pl-10"
                />
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                {routeDestination && (
                  <button
                    aria-label="Effacer la destination"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={onClearRoute}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                aria-label="Rechercher la destination"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-2xl"
                onClick={() => onSearchRoute(routeDestination, { immediate: true })}
              >
                {isSearchingRoute ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {routeResults.length > 0 && (
              <div
                id="destination-results"
                className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-[20px] border border-border bg-card p-1 shadow-lg"
                role="listbox"
              >
                {routeResults.map((result, index) => (
                  <button
                    aria-label={`${result.label} - ${result.city}`}
                    aria-selected={index === activeRouteIndex}
                    className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition ${
                      index === activeRouteIndex ? "bg-muted" : "hover:bg-muted"
                    }`}
                    key={result.id}
                    onClick={() => onSelectRouteResult(result)}
                    onMouseEnter={() => setActiveRouteIndex(index)}
                    role="option"
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

            {isLoadingRoute ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/30 dark:text-teal-300">
                Calcul du trajet en cours...
              </div>
            ) : null}

            {routePath ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/25">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Trajet actif</Badge>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatDistance(routePath.distanceKm)} • ~ {formatDriveTime(routePath.durationMinutes)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-emerald-700/80 dark:text-emerald-300/80">
                  Les stations sont maintenant recherchees le long du trajet reel entre votre depart et cette destination.
                </p>
              </div>
            ) : null}
          </div>

          {geoError ? <Alert variant="warning">{geoError}</Alert> : null}
          {geocodingError ? <Alert variant="info">{geocodingError}</Alert> : null}
          {routeError ? <Alert variant="warning">{routeError}</Alert> : null}
        </div>
      </CardContent>
    </Card>
  );
};

