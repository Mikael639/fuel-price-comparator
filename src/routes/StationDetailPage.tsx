import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Navigation, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { PriceHistoryChart } from "@/components/station/PriceHistoryChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stationService } from "@/services/stationService";
import { useFuelStationsStore } from "@/store/useFuelStationsStore";
import { formatDistance, formatDriveTime, formatFreshness, formatMoney, formatPrice } from "@/utils/format";
import { getGoogleMapsDirectionsUrl } from "@/utils/navigation";
import { estimateDriveTimeMinutes, haversineDistance } from "@/utils/geo";
import type { FuelStation, FuelType } from "@/types/station";

export const StationDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const initialize = useFuelStationsStore((state) => state.initialize);
  const loadStationById = useFuelStationsStore((state) => state.loadStationById);
  const selectedFuel = useFuelStationsStore((state) => state.selectedFuel);
  const isLoading = useFuelStationsStore((state) => state.isLoading);
  const stations = useFuelStationsStore((state) => state.stations);
  const userPosition = useFuelStationsStore((state) => state.userPosition);
  const favoriteIds = useFuelStationsStore((state) => state.favoriteIds);
  const toggleFavorite = useFuelStationsStore((state) => state.toggleFavorite);
  const fillVolumeLiters = useFuelStationsStore((state) => state.fillVolumeLiters);
  const consumptionLitersPer100Km = useFuelStationsStore((state) => state.consumptionLitersPer100Km);
  const [remoteStation, setRemoteStation] = useState<FuelStation | null>(null);
  const [activeFuel, setActiveFuel] = useState<FuelType>("Diesel");

  const station = useMemo(
    () => remoteStation ?? stations.find((item) => item.id === id) ?? null,
    [id, remoteStation, stations],
  );

  useEffect(() => {
    void (async () => {
      await initialize();
      const fetched = await loadStationById(id);
      setRemoteStation(fetched);
    })();
  }, [id, initialize, loadStationById]);

  useEffect(() => {
    if (!station) {
      return;
    }
    setActiveFuel(station.fuels.includes(selectedFuel) ? selectedFuel : station.fuels[0] ?? "Diesel");
  }, [selectedFuel, station]);

  const distanceKm =
    station && userPosition ? haversineDistance(userPosition, { lat: station.lat, lng: station.lng }) : null;
  const driveMinutes = distanceKm != null ? estimateDriveTimeMinutes(distanceKm) : null;
  const isFavorite = station ? favoriteIds.includes(station.id) : false;
  const freshness = station ? formatFreshness(station.priceUpdatedAt?.[activeFuel] ?? station.lastUpdatedAt) : null;

  const averagePrice = useMemo(() => {
    const prices = stations
      .map((item) => item.fuelPrices[activeFuel] ?? null)
      .filter((price): price is number => price != null);

    if (prices.length === 0) {
      return null;
    }

    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }, [activeFuel, stations]);

  const detailMetric = useMemo(() => {
    if (!station || !userPosition) {
      return null;
    }

    return (
      stationService.findNearbyStations({
        stations: [station],
        position: userPosition,
        radiusKm: 999,
        openOnly: false,
        services: [],
        fuel: activeFuel,
        sortMode: "price",
        favoriteIds,
        fillVolumeLiters,
        consumptionLitersPer100Km,
      })[0] ?? null
    );
  }, [activeFuel, consumptionLitersPer100Km, favoriteIds, fillVolumeLiters, station, userPosition]);

  const netSavings =
    detailMetric && averagePrice != null
      ? stationService.getStationNetSavingsForFill(detailMetric, averagePrice, fillVolumeLiters, consumptionLitersPer100Km)
      : null;

  if (!station && isLoading) {
    return (
      <div className="container py-6 md:py-8">
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="container py-6 md:py-8">
        <EmptyStateCard
          description="Cette station n'existe pas ou n'est plus disponible dans les données officielles."
          icon={ArrowLeft}
          title="Station introuvable"
        >
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </EmptyStateCard>
      </div>
    );
  }

  const brandDetail =
    station.brandSource === "osm"
      ? `Enseigne enrichie via OpenStreetMap : ${station.brand}`
      : station.brandSource === "inferred"
        ? `Enseigne estimee : ${station.brand}`
        : station.brandSource === "not_provided"
          ? "Enseigne non communiquee dans le dataset officiel"
          : null;

  return (
    <div className="container py-6 md:py-8">
      <section className="mb-6 md:mb-8">
        <Card className="glass-panel">
          <CardContent className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_15rem] md:p-8">
            <div className="space-y-4">
              <Button onClick={() => navigate(-1)} variant="tonal">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <SectionHeading eyebrow="Source officielle DGCCRF" subtitle={`${station.address}, ${station.city}`} title={station.name} />
              <div className="flex flex-wrap gap-2">
                {brandDetail ? <Badge variant="secondary">{brandDetail}</Badge> : null}
                <Badge variant={station.isOpen ? "success" : "danger"}>{station.isOpen ? "Ouverte" : "Fermee"}</Badge>
                {freshness ? <Badge variant="outline">Maj {freshness}</Badge> : null}
                <Badge variant="outline">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  {station.openingHours}
                </Badge>
                {distanceKm != null && driveMinutes != null ? (
                  <Badge variant="outline">
                    {formatDistance(distanceKm)} - ~ {formatDriveTime(driveMinutes)}
                  </Badge>
                ) : null}
                {netSavings != null && netSavings > 0 ? (
                  <Badge variant="success">+{formatMoney(netSavings)} nets sur {fillVolumeLiters}L</Badge>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={() => navigate("/")} variant="tonal">
                Retour à l'accueil
              </Button>
              <Button asChild>
                <a href={getGoogleMapsDirectionsUrl(station.lat, station.lng)} rel="noreferrer" target="_blank">
                  <Navigation className="h-4 w-4" />
                  Y aller
                </a>
              </Button>
              <Button onClick={() => toggleFavorite(station.id)} variant="outline">
                <Star className={`h-4 w-4 ${isFavorite ? "fill-current text-amber-500" : ""}`} />
                {isFavorite ? "Retirer des favorites" : "Ajouter aux favorites"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {station.fuels.map((fuel) => (
            <button
              className={`rounded-[24px] border p-4 text-left transition ${activeFuel === fuel ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card"}`}
              key={fuel}
              onClick={() => setActiveFuel(fuel)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <strong>{fuel}</strong>
              </div>
              <div className="mt-3 font-display text-2xl tracking-tight">{formatPrice(station.fuelPrices[fuel])}</div>
              <p className="mt-2 text-sm text-muted-foreground">Appuyez pour afficher l'historique detaille.</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 md:mb-8">
        <PriceHistoryChart fuel={activeFuel} station={station} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Services</p>
            <h3 className="font-display text-xl tracking-tight">Equipements disponibles</h3>
            <div className="flex flex-wrap gap-2">
              {station.services.map((service) => (
                <Badge key={service}>{service}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Infos</p>
            <h3 className="font-display text-xl tracking-tight">Horaires et rentabilite</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Horaires : {station.openingHours}</p>
              <p>Statut : {station.isOpen ? "Disponible maintenant" : "Actuellement fermee"}</p>
              <p>Adresse complete : {station.address}, {station.city}</p>
              <p>Maj prix : {freshness ?? "Inconnue"}</p>
              <p>Prix moyen de zone : {formatPrice(averagePrice)}</p>
              <p>Gain net estime : {netSavings != null ? `+${formatMoney(netSavings)}` : "Non calcule"}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
