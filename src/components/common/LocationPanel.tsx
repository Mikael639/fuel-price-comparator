import { LoaderCircle, MapPin, MapPinned, Navigation, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { Coordinates, GeocodingResult, LocationSource, MockLocation } from "@/types/station";

interface LocationPanelProps {
  isGeolocating: boolean;
  isSearchingLocation: boolean;
  geoError: string | null;
  geocodingError: string | null;
  locationLabel: string | null;
  locationSource: LocationSource;
  userPosition: Coordinates | null;
  manualLocationId: string | null;
  searchQuery: string;
  searchResults: GeocodingResult[];
  mockLocations: MockLocation[];
  onLocate: () => void;
  onRefresh: () => void;
  onDemo: () => void;
  onSelectManual: (value: string) => void;
  onSearchAddress: (query: string) => void;
  onSelectSearchResult: (result: GeocodingResult) => void;
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
  geoError,
  geocodingError,
  locationLabel,
  locationSource,
  userPosition,
  manualLocationId,
  searchQuery,
  searchResults,
  mockLocations,
  onLocate,
  onRefresh,
  onDemo,
  onSelectManual,
  onSearchAddress,
  onSelectSearchResult,
}: LocationPanelProps) => {
  return (
    <Card className="glass-panel">
      <CardContent className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_26rem] md:p-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Geolocalisation</p>
            <h3 className="font-display text-2xl tracking-tight">Retrouvez les meilleures stations autour de vous</h3>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Autorisez la geolocalisation pour un resultat live, choisissez une position simulee ou recherchez
              librement une ville ou une adresse en France.
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
          <div className="rounded-[24px] border border-border/70 bg-card/80 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{getSourceLabel(locationSource)}</p>
                <p className="font-semibold">{locationLabel ?? "Choisissez une position pour commencer"}</p>
                {userPosition ? (
                  <p className="font-display text-xs text-muted-foreground">
                    Coordonnees detectees : {userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <label className="space-y-2 text-sm font-medium">
            <span>Ville de demonstration</span>
            <select
              className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          </label>

          <div className="flex gap-2">
            <Input
              defaultValue={searchQuery}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearchAddress((event.target as HTMLInputElement).value);
                }
              }}
              placeholder="Rechercher une ville ou une adresse"
            />
            <Button
              onClick={(event) => {
                const input = (event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.value ?? "";
                onSearchAddress(input);
              }}
            >
              {isSearchingLocation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Rechercher
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="rounded-[24px] border border-border/70 bg-card/70 p-2">
              {searchResults.map((result) => (
                <button
                  className="flex w-full flex-col rounded-2xl px-3 py-3 text-left transition hover:bg-muted"
                  key={result.id}
                  onClick={() => onSelectSearchResult(result)}
                  type="button"
                >
                  <span className="text-sm font-semibold">{`${result.label} • ${result.city}`}</span>
                  <span className="text-xs text-muted-foreground">{result.address}</span>
                </button>
              ))}
            </div>
          ) : null}

          {geoError ? <Alert variant="warning">{geoError}</Alert> : null}
          {geocodingError ? <Alert variant="info">{geocodingError}</Alert> : null}
        </div>
      </CardContent>
    </Card>
  );
};
