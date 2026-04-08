import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronRight, DatabaseZap, Globe, MapPinOff, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { InfoBanner } from "@/components/common/InfoBanner";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { LocationPanel } from "@/components/common/LocationPanel";
import { SectionHeading } from "@/components/common/SectionHeading";
import { FilterBar } from "@/components/filters/FilterBar";
import { StationsMap } from "@/components/map/StationsMap";
import { BestStationCard } from "@/components/station/BestStationCard";
import { FavoriteAlertsPanel } from "@/components/station/FavoriteAlertsPanel";
import { StationCard } from "@/components/station/StationCard";
import { StationStats } from "@/components/station/StationStats";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFuelStationsViewModel } from "@/hooks/useFuelStationsViewModel";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { FUEL_TYPES } from "@/types/station";
import { sortModeCopy } from "@/utils/format";

export const HomePage = () => {
  const initialize = useFuelStationsStore((state) => state.initialize);
  const hasHydrated = useFuelStationsStore((state) => state.hasHydrated);
  const userPosition = useFuelStationsStore((state) => state.userPosition);
  const locationLabel = useFuelStationsStore((state) => state.userPosition?.label ?? null);
  const locationSource = useFuelStationsStore((state) => state.locationSource);
  const isLoading = useFuelStationsStore((state) => state.isLoading);
  const isHydratingHistory = useFuelStationsStore((state) => state.isHydratingHistory);
  const isHydratingRouteDetours = useFuelStationsStore((state) => state.isHydratingRouteDetours);
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
  const fillVolumeLiters = useFuelStationsStore((state) => state.fillVolumeLiters);
  const consumptionLitersPer100Km = useFuelStationsStore((state) => state.consumptionLitersPer100Km);
  const favoriteAlertPrice = useFuelStationsStore((state) => state.favoriteAlertPrice);
  const searchQuery = useFuelStationsStore((state) => state.searchQuery);
  const geocodingResults = useFuelStationsStore((state) => state.geocodingResults);
  const routeDestination = useFuelStationsStore((state) => state.routeDestination);
  const isSearchingRoute = useFuelStationsStore((state) => state.isSearchingRoute);
  const isLoadingRoute = useFuelStationsStore((state) => state.isLoadingRoute);
  const routeError = useFuelStationsStore((state) => state.routeError);
  const routePath = useFuelStationsStore((state) => state.routePath);
  const routeResults = useFuelStationsStore((state) => state.routeResults);
  const requestUserLocation = useFuelStationsStore((state) => state.requestUserLocation);
  const refreshPosition = useFuelStationsStore((state) => state.refreshPosition);
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
  const setFillVolumeLiters = useFuelStationsStore((state) => state.setFillVolumeLiters);
  const setConsumptionLitersPer100Km = useFuelStationsStore((state) => state.setConsumptionLitersPer100Km);
  const setFavoriteAlertPrice = useFuelStationsStore((state) => state.setFavoriteAlertPrice);
  const {
    nearbyStations,
    bestStation,
    favoriteStations,
    favoriteAlerts,
    stats,
    availableServices,
    hasResults,
    hasComparableResults,
    isDataUnavailable,
  } = useFuelStationsViewModel();
  const hasActiveZone = Boolean(userPosition);
  const isRouteMode = Boolean(routePath);

  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const previousLocationRef = useRef<string | null>(null);
  const absoluteCheapestStation = useMemo(() => stationService.getAbsoluteCheapestStation(nearbyStations), [nearbyStations]);

  useEffect(() => {
    if (hasHydrated) {
      void initialize();
    }
  }, [hasHydrated, initialize]);

  useEffect(() => {
    const currentMarker = `${locationSource ?? "none"}:${locationLabel ?? ""}`;
    if (!locationSource || previousLocationRef.current === currentMarker) {
      previousLocationRef.current = currentMarker;
      return;
    }

    setMapMessage(
      locationSource === "browser" ? "Carte recentrée sur votre position actuelle." : `Carte centrée sur ${locationLabel}.`,
    );
    previousLocationRef.current = currentMarker;
  }, [locationLabel, locationSource]);

  const savingsHero =
    sortMode === "smartFill" && stats.maxNetSavings != null && bestStation
      ? `Jusqu'à ${stats.maxNetSavings.toFixed(2).replace(".", ",")} EUR nets sur ${fillVolumeLiters}L.`
      : stats.maxSavings != null && bestStation
        ? `Jusqu'à ${stats.maxSavings.toFixed(2).replace(".", ",")} EUR d'économie par litre sur ${selectedFuel}.`
        : isRouteMode
          ? "Affinez vos filtres pour faire ressortir l'offre la plus intéressante sur votre trajet."
          : "Affinez vos filtres pour faire ressortir l'offre la plus intéressante autour de vous.";

  const distanceFocusHint =
    bestStation && absoluteCheapestStation && bestStation.id !== absoluteCheapestStation.id
      ? isRouteMode
        ? `Le tarif absolu le plus bas du trajet demande un détour estimé de ${absoluteCheapestStation.distanceKm.toFixed(1).replace(".", ",")} km. La recommandation privilégie une station plus fluide sur l'itinéraire.`
        : `Le tarif absolu le plus bas du rayon est à ${absoluteCheapestStation.distanceKm.toFixed(1).replace(".", ",")} km. La recommandation privilégie une station plus proche pour rester pertinente localement.`
      : null;

  const infoBannerMessages = useMemo(
    () => [
      {
        key: "generic-error",
        message: genericError,
        variant: "error" as const,
      },
      {
        key: "route-active",
        message: routePath
          ? `Mode trajet actif vers ${routePath.destination.label ?? routeDestination}. Le tri privilegie maintenant les stations situees sur le corridor reel.`
          : null,
        variant: "success" as const,
      },
      {
        key: "hydrating-history",
        message: isHydratingHistory ? "Historique officiel en cours de chargement pour affiner les tendances locales." : null,
        variant: "info" as const,
      },
      {
        key: "hydrating-route-detours",
        message:
          isHydratingRouteDetours && routePath
            ? "Les detours reels sont en cours d'affinage sur les stations les plus prometteuses du trajet."
            : null,
        variant: "info" as const,
      },
      {
        key: "geolocation-hint",
        message:
          locationSource === "browser" && userPosition
            ? "La géolocalisation navigateur peut être approximative. Si la carte semble décalée, recherchez votre ville manuellement."
            : null,
        variant: "info" as const,
      },
      {
        key: "freshness-summary",
        message: stats.freshestPriceUpdate
          ? `Le jeu ${selectedFuel} a été rafraîchi récemment.${stats.staleCount > 0 ? ` ${stats.staleCount} station(s) affichent une mise à jour vieille de plus de 24h.` : ""}`
          : null,
        variant: "info" as const,
      },
      {
        key: "favorites-summary",
        message:
          favoriteStations.length > 0
            ? `${favoriteStations.length} station(s) favorite(s) ${isRouteMode ? "sur le trajet courant" : "dans le rayon courant"}.`
            : null,
        variant: "success" as const,
      },
      {
        key: "source-hint",
        message:
          userPosition && !isDataUnavailable
            ? "Données live DGCCRF. Les enseignes peuvent être estimées ou enrichies ponctuellement via OpenStreetMap."
            : null,
        variant: "info" as const,
      },
    ],
    [
      favoriteStations.length,
      genericError,
      isDataUnavailable,
      isHydratingHistory,
      isHydratingRouteDetours,
      isRouteMode,
      locationSource,
      routeDestination,
      routePath,
      selectedFuel,
      stats.freshestPriceUpdate,
      stats.staleCount,
      userPosition,
    ],
  );

  return (
    <div className="container py-6 md:py-8">
      <section className="mb-6 md:mb-8">
        <Card className="glass-panel relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255,183,3,0.14), transparent 28%), radial-gradient(circle at bottom left, rgba(15,118,110,0.14), transparent 24%)",
            }}
          />
          <CardContent className="relative grid gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_20rem] md:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={hasActiveZone && !isDataUnavailable ? "success" : hasActiveZone ? "warning" : "outline"}>
                  {hasActiveZone && !isDataUnavailable ? "Zone active live" : hasActiveZone ? "Zone active de secours" : "Aucune zone active"}
                </Badge>
                <Badge variant="secondary">{selectedFuel}</Badge>
                <Badge variant="outline">{sortModeCopy[sortMode]}</Badge>
                {locationLabel ? <Badge variant="outline">{locationLabel}</Badge> : null}
              </div>

              <SectionHeading
                eyebrow="Recherche locale"
                subtitle={
                  isRouteMode
                    ? "Comparez les prix live le long de votre trajet et laissez le mode plein malin privilégier le vrai gain net."
                    : "Comparez les prix live autour de vous, sur votre trajet, et laissez le mode plein malin privilégier le vrai gain net."
                }
                title={isRouteMode ? "Trouvez vite la meilleure station sur votre trajet" : "Trouvez vite la meilleure station autour de vous"}
              />

              <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                L’accueil reste le cockpit principal: recherche, filtres, recommandation et carte locale. Les autres pages donnent du recul sans casser ce flux central.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="tonal">
                  <Link to="/trends">Voir les tendances</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/europe">Comparer l'Europe</Link>
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Radar local</p>
                <Badge variant="secondary" className="bg-white/10 text-white dark:bg-white/10 dark:text-white">
                  {stats.comparableCount} comparables
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-display text-4xl">{nearbyStations.length}</div>
                  <div className="text-sm text-white/65">{isRouteMode ? "stations sur le trajet" : "stations dans le rayon"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Carburant</div>
                    <div className="mt-2 text-lg font-semibold">{selectedFuel}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Tri</div>
                    <div className="mt-2 text-lg font-semibold">{sortModeCopy[sortMode]}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/70">Lecture dominante</div>
                  <div className="mt-2 text-sm leading-6 text-teal-50">
                    {bestStation
                      ? `${bestStation.name} ressort comme option clé ${isRouteMode ? "sur votre trajet." : `sur ${selectedFuel}.`}`
                      : "Choisissez une zone pour faire émerger une recommandation locale nette."}
                  </div>
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
          isLoadingRoute={isLoadingRoute}
          isSearchingRoute={isSearchingRoute}
          locationLabel={locationLabel}
          locationSource={locationSource}
          onLocate={() => void requestUserLocation()}
          onRefresh={() => void refreshPosition()}
          onSearchAddress={(query, options) => void searchLocations(query, options)}
          onSearchRoute={(query, options) => void searchRoute(query, options)}
          onSelectRouteResult={(result) => void selectRouteLocation(result)}
          onSelectSearchResult={selectSearchLocation}
          onClearRoute={clearRoute}
          routeDestination={routeDestination}
          routeError={routeError}
          routePath={routePath}
          routeResults={routeResults}
          searchQuery={searchQuery}
          searchResults={geocodingResults}
        />
      </section>

      <InfoBanner messages={infoBannerMessages} />

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
                consumptionLitersPer100Km={consumptionLitersPer100Km}
                favoriteAlertPrice={favoriteAlertPrice}
                fillVolumeLiters={fillVolumeLiters}
                fuelOptions={FUEL_TYPES}
                onConsumptionLitersPer100KmChange={setConsumptionLitersPer100Km}
                onFavoriteAlertPriceChange={setFavoriteAlertPrice}
                onFillVolumeLitersChange={setFillVolumeLiters}
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
                freshestPriceUpdate={stats.freshestPriceUpdate}
                isRouteMode={isRouteMode}
                maxNetSavings={stats.maxNetSavings}
                maxSavings={stats.maxSavings}
                staleCount={stats.staleCount}
                stationCount={stats.stationCount}
              />
            </section>
          ) : null}

          {favoriteAlerts.length > 0 ? (
            <section className="mb-6">
              <FavoriteAlertsPanel alerts={favoriteAlerts} />
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
                  eyebrow="Favoris"
                  subtitle={
                    isRouteMode
                      ? "Retrouvez rapidement vos stations enregistrées sur le trajet courant."
                      : "Retrouvez rapidement vos stations enregistrées dans la zone visible."
                  }
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
                routePath={routePath}
                selectedFuel={selectedFuel}
                stations={nearbyStations}
                userPosition={userPosition}
              />
            </section>
          ) : null}

          {userPosition && !hasResults ? (
            <section className="mb-6 md:mb-8">
              <EmptyStateCard
                description={
                  isRouteMode
                    ? "Aucune station n'apparaît sur le trajet avec les filtres actuels. Élargissez le corridor ou retirez quelques services."
                    : "Aucune station n'apparaît avec le rayon et les filtres actuels. Élargissez le rayon ou retirez quelques services."
                }
                icon={MapPinOff}
                title={isRouteMode ? "Aucun résultat sur le trajet" : "Aucun résultat dans le rayon"}
              />
            </section>
          ) : null}

          {userPosition && hasResults && !hasComparableResults ? (
            <section className="mb-6 md:mb-8">
              <EmptyStateCard
                description="Des stations existent dans cette zone, mais aucune ne propose actuellement le carburant sélectionné."
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
                  subtitle={`Les stations sont triées par ${sortModeCopy[sortMode].toLowerCase()} ${isRouteMode ? "sur le trajet courant" : "dans le rayon courant"}.`}
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
                description="Le prototype n'a pas pu charger les données officielles ni le jeu de secours local."
                icon={DatabaseZap}
                title="Données indisponibles"
              />
            </section>
          ) : null}

          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="mb-6">
              <SectionHeading
                eyebrow="Analyses & Europe"
                subtitle="Explorez les tendances nationales et comparez les prix avec nos voisins européens."
                title="Plus de perspectives"
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Link className="group" to="/trends">
                <Card className="glass-panel relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent opacity-80" />
                  <CardContent className="flex h-full flex-col p-0">
                    <div className="relative flex-1 space-y-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 transition-transform duration-300 group-hover:scale-110 dark:text-teal-400">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xl font-display font-bold text-slate-900 dark:text-white">Tendances locales</h3>
                        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          Visualisez l'évolution des prix sur 7 jours, comparez Diesel vs Essence et découvrez le palmarès des enseignes dans votre zone.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 px-6 py-4 dark:bg-slate-950/50">
                      <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Voir les graphiques</span>
                      <ChevronRight className="h-4 w-4 text-teal-500" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link className="group" to="/europe">
                <Card className="glass-panel relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-80" />
                  <CardContent className="flex h-full flex-col p-0">
                    <div className="relative flex-1 space-y-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 transition-transform duration-300 group-hover:scale-110 dark:text-blue-400">
                        <Globe className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xl font-display font-bold text-slate-900 dark:text-white">Panorama Europe</h3>
                        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          Comparez les prix entre la France, la Belgique, l'Allemagne, l'Espagne et l'Italie. Idéal pour préparer vos déplacements.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 px-6 py-4 dark:bg-slate-950/50">
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Explorer le marché</span>
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
