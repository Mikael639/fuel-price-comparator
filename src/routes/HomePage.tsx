import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BarChart3, ChevronRight, DatabaseZap, Fuel, Globe, MapPinOff, MapPinned, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { BestStationCard } from "@/components/station/BestStationCard";
import { FilterBar } from "@/components/filters/FilterBar";
import { LocationPanel } from "@/components/common/LocationPanel";
import { SectionHeading } from "@/components/common/SectionHeading";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { StationCard } from "@/components/station/StationCard";
import { StationStats } from "@/components/station/StationStats";
import { StationsMap } from "@/components/map/StationsMap";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { mockLocations } from "@/data/mockLocations";
import { useFuelStationsViewModel } from "@/hooks/useFuelStationsViewModel";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { FUEL_TYPES } from "@/types/station";
import { sortModeCopy } from "@/utils/format";

export const HomePage = () => {
  const initialize = useFuelStationsStore((state) => state.initialize);
  const userPosition = useFuelStationsStore((state) => state.userPosition);
  const locationLabel = useFuelStationsStore((state) => state.userPosition?.label ?? null);
  const locationSource = useFuelStationsStore((state) => state.locationSource);
  const isLoading = useFuelStationsStore((state) => state.isLoading);
  const isGeolocating = useFuelStationsStore((state) => state.isGeolocating);
  const isSearchingLocation = useFuelStationsStore((state) => state.isSearchingLocation);
  const geoError = useFuelStationsStore((state) => state.geoError);
  const geocodingError = useFuelStationsStore((state) => state.geocodingError);
  const genericError = useFuelStationsStore((state) => state.genericError);
  const selectedFuel = useFuelStationsStore((state) => state.selectedFuel);
  const radiusKm = useFuelStationsStore((state) => state.radiusKm);
  const openOnly = useFuelStationsStore((state) => state.openOnly);
  const selectedServices = useFuelStationsStore((state) => state.selectedServices);
  const sortMode = useFuelStationsStore((state) => state.sortMode);
  const manualLocationId = useFuelStationsStore((state) => state.manualLocationId);
  const searchQuery = useFuelStationsStore((state) => state.searchQuery);
  const geocodingResults = useFuelStationsStore((state) => state.geocodingResults);
  const routeDestination = useFuelStationsStore((state) => state.routeDestination);
  const isSearchingRoute = useFuelStationsStore((state) => state.isSearchingRoute);
  const routeResults = useFuelStationsStore((state) => state.routeResults);
  const requestUserLocation = useFuelStationsStore((state) => state.requestUserLocation);
  const refreshPosition = useFuelStationsStore((state) => state.refreshPosition);
  const useDemoLocation = useFuelStationsStore((state) => state.useDemoLocation);
  const selectManualLocation = useFuelStationsStore((state) => state.selectManualLocation);
  const searchLocations = useFuelStationsStore((state) => state.searchLocations);
  const selectSearchLocation = useFuelStationsStore((state) => state.selectSearchLocation);
  const searchRoute = useFuelStationsStore((state) => state.searchRoute);
  const selectRouteLocation = useFuelStationsStore((state) => state.selectRouteLocation);
  const clearRoute = useFuelStationsStore((state) => state.clearRoute);
  const setSelectedFuel = useFuelStationsStore((state) => state.setSelectedFuel);
  const setRadiusKm = useFuelStationsStore((state) => state.setRadiusKm);
  const setOpenOnly = useFuelStationsStore((state) => state.setOpenOnly);
  const setSelectedServices = useFuelStationsStore((state) => state.setSelectedServices);
  const setSortMode = useFuelStationsStore((state) => state.setSortMode);
  const { nearbyStations, bestStation, favoriteStations, stats, availableServices, hasResults, hasComparableResults, isDataUnavailable } =
    useFuelStationsViewModel();

  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const previousLocationRef = useRef<string | null>(null);
  const absoluteCheapestStation = useMemo(() => stationService.getAbsoluteCheapestStation(nearbyStations), [nearbyStations]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const currentMarker = `${locationSource ?? "none"}:${locationLabel ?? ""}`;
    if (!locationSource || previousLocationRef.current === currentMarker) {
      previousLocationRef.current = currentMarker;
      return;
    }

    setMapMessage(
      locationSource === "browser" ? "Carte recentree sur votre position actuelle." : `Carte centree sur ${locationLabel}.`,
    );
    previousLocationRef.current = currentMarker;
  }, [locationLabel, locationSource]);

  const savingsHero =
    stats.maxSavings != null && bestStation
      ? `Jusqu'a ${stats.maxSavings.toFixed(2).replace(".", ",")} EUR d'economie par litre sur ${selectedFuel}.`
      : "Affinez vos filtres pour faire ressortir l'offre la plus interessante autour de vous.";



  const distanceFocusHint =
    bestStation && absoluteCheapestStation && bestStation.id !== absoluteCheapestStation.id
      ? `Le tarif absolu le plus bas du rayon est a ${absoluteCheapestStation.distanceKm.toFixed(1).replace(".", ",")} km. La recommandation met en avant une station plus proche pour rester pertinente localement.`
      : null;

  return (
    <div className="container py-6 md:py-8">
      <section className="mb-6 md:mb-8">
        <Card className="glass-panel overflow-hidden">
          <CardContent className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_18rem] md:p-8">
            <SectionHeading
              eyebrow="FuelFlash Premium"
              subtitle="Optimisez votre budget carburant avec une interface haute fidelite. Comparez les prix en temps reel sur votre itineraire."
              title="Le comparateur intelligent qui va droit au point"
            />
            <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white">
              <div className="space-y-4">
                <div>
                  <div className="font-display text-3xl">{nearbyStations.length}</div>
                  <div className="text-sm text-white/70">stations dans le rayon</div>
                </div>
                <div>
                  <div className="font-display text-3xl">{selectedFuel}</div>
                  <div className="text-sm text-white/70">carburant actif</div>
                </div>
                <div>
                  <div className="font-display text-2xl">{sortModeCopy[sortMode]}</div>
                  <div className="text-sm text-white/70">tri actuel</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 md:mb-8">
        <LocationPanel
          geoError={geoError}
          geocodingError={geocodingError}
          isGeolocating={isGeolocating}
          isSearchingLocation={isSearchingLocation}
          isSearchingRoute={isSearchingRoute}
          locationLabel={locationLabel}
          locationSource={locationSource}
          manualLocationId={manualLocationId}
          mockLocations={mockLocations}
          onDemo={useDemoLocation}
          onLocate={() => void requestUserLocation()}
          onRefresh={() => void refreshPosition()}
          onSearchAddress={(query) => void searchLocations(query)}
          onSelectManual={selectManualLocation}
          onSelectSearchResult={selectSearchLocation}
          onSearchRoute={(query) => void searchRoute(query)}
          onSelectRouteResult={(result) => void selectRouteLocation(result)}
          onClearRoute={clearRoute}
          searchQuery={searchQuery}
          searchResults={geocodingResults}
          routeDestination={routeDestination}
          routeResults={routeResults}
          userPosition={userPosition}
        />
      </section>

      {genericError ? <Alert className="mb-4" variant="error">{genericError}</Alert> : null}
      {favoriteStations.length > 0 ? (
        <Alert className="mb-4" variant="success">
          {favoriteStations.length} station(s) favorite(s) dans le rayon courant
        </Alert>
      ) : null}

      {isLoading ? (
        <section className="grid gap-4">
          <Skeleton className="h-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </section>
      ) : (
        <>
          {userPosition && !isDataUnavailable ? (
            <section className="mb-6 md:mb-8">
              <FilterBar
                fuelOptions={FUEL_TYPES}
                onOpenOnlyChange={setOpenOnly}
                onRadiusKmChange={setRadiusKm}
                onSelectedFuelChange={setSelectedFuel}
                onSelectedServicesChange={setSelectedServices}
                onSortModeChange={setSortMode}
                openOnly={openOnly}
                radiusKm={radiusKm}
                selectedFuel={selectedFuel}
                selectedServices={selectedServices}
                serviceOptions={availableServices}
                sortMode={sortMode}
              />
            </section>
          ) : null}

          {userPosition && hasResults ? (
            <section className="mb-6">
              <StationStats
                averagePrice={stats.averagePrice}
                comparableCount={stats.comparableCount}
                maxSavings={stats.maxSavings}
                stationCount={stats.stationCount}
                maxNetSavings={stats.maxSavings} // Temporary fallback if maxNetSavings is same as maxSavings
              />
            </section>
          ) : null}

          {bestStation && hasComparableResults ? (
            <section className="mb-6 md:mb-8 space-y-4">
              {distanceFocusHint ? <Alert variant="warning">{distanceFocusHint}</Alert> : null}
              <BestStationCard averagePrice={stats.averagePrice} selectedFuel={selectedFuel} station={bestStation} />
            </section>
          ) : null}

          {favoriteStations.length > 0 ? (
            <section className="mb-6 md:mb-8">
              <div className="mb-4">
                <SectionHeading
                  eyebrow="Favorites"
                  subtitle="Retrouvez rapidement vos stations enregistrees dans la zone visible."
                  title="Vos stations favorites"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {favoriteStations.map((station) => (
                  <StationCard
                    averagePrice={stats.averagePrice}
                    isBest={station.id === bestStation?.id}
                    key={station.id}
                    selectedFuel={selectedFuel}
                    station={station}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {userPosition ? (
            <section className="mb-6 md:mb-8 space-y-3">
              {mapMessage ? <Badge variant="secondary">{mapMessage}</Badge> : null}
              <StationsMap
                bestStationId={bestStation?.id ?? null}
                radiusKm={radiusKm}
                selectedFuel={selectedFuel}
                stations={nearbyStations}
                userPosition={userPosition}
              />
            </section>
          ) : null}

          {userPosition && !hasResults ? (
            <section className="mb-6 md:mb-8">
              <EmptyStateCard
                description="Aucune station n'apparait avec le rayon et les filtres actuels. Elargissez le rayon ou retirez quelques services."
                icon={MapPinOff}
                title="Aucun resultat dans le rayon"
              />
            </section>
          ) : null}

          {userPosition && hasResults && !hasComparableResults ? (
            <section className="mb-6 md:mb-8">
              <EmptyStateCard
                description="Des stations existent dans cette zone, mais aucune ne propose actuellement le carburant selectionne."
                icon={SearchX}
                title="Carburant indisponible"
              />
            </section>
          ) : null}

          {hasResults ? (
            <section className="mb-6 md:mb-8">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <SectionHeading
                  eyebrow="Classement"
                  subtitle={`Les stations sont triees par ${sortModeCopy[sortMode].toLowerCase()} dans le rayon courant.`}
                  title="Liste des stations"
                />
                <Badge variant="secondary">{savingsHero}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {nearbyStations.map((station) => (
                  <StationCard
                    averagePrice={stats.averagePrice}
                    isBest={station.id === bestStation?.id}
                    key={station.id}
                    selectedFuel={selectedFuel}
                    station={station}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {isDataUnavailable ? (
            <section className="mb-6">
              <EmptyStateCard
                description="Le prototype n'a pas pu charger les donnees officielles ni le jeu de secours local."
                icon={DatabaseZap}
                title="Donnees indisponibles"
              />
            </section>
          ) : null}

          {/* Discovery Cards Section */}
          <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="mb-6">
              <SectionHeading
                eyebrow="Analyses & Europe"
                subtitle="Explorez les tendances nationales et comparez les prix avec nos voisins europeens."
                title="Plus de perspectives"
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Link to="/trends" className="group">
                <Card className="glass-panel h-full transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 overflow-hidden">
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="p-6 flex-1 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">Tendances locales</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          Visualisez l'evolution des prix sur 7 jours, comparez Diesel vs Essence et découvrez le palmares des enseignes dans votre zone.
                        </p>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Voir les graphiques</span>
                      <ChevronRight className="h-4 w-4 text-teal-500" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/europe" className="group">
                <Card className="glass-panel h-full transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden">
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="p-6 flex-1 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                        <Globe className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">Panorama Europe</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          Comparez les prix entre la France, la Belgique, l'Allemagne, l'Espagne et l'Italie. Ideal pour preparer vos deplacements.
                        </p>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Explorer le marche</span>
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
