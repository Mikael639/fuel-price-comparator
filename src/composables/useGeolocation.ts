import type { Coordinates } from "@/types/station";

type GeolocationErrorCode =
  | "denied"
  | "insecure_context"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "unknown";

interface GeolocationSuccess {
  ok: true;
  coordinates: Coordinates;
}

interface GeolocationFailure {
  ok: false;
  error: {
    code: GeolocationErrorCode;
    message: string;
  };
}

type GeolocationResult = GeolocationSuccess | GeolocationFailure;

const mapGeolocationError = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: "denied" as const,
        message:
          "La geolocalisation a ete refusee. Utilisez une position de demonstration ou recherchez votre ville manuellement.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: "unavailable" as const,
        message:
          "La position est indisponible pour le moment. Reessayez ou utilisez une position de demonstration.",
      };
    case error.TIMEOUT:
      return {
        code: "timeout" as const,
        message:
          "La demande de geolocalisation a expire. Reessayez ou passez par le mode demonstration.",
      };
    default:
      return {
        code: "unknown" as const,
        message: "Une erreur inattendue est survenue pendant la geolocalisation.",
      };
  }
};

export const useGeolocation = () => {
  const getCurrentPosition = (): Promise<GeolocationResult> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve({
          ok: false,
          error: {
            code: "unsupported",
            message:
              "Votre navigateur ne prend pas en charge la geolocalisation. Utilisez la position de demonstration.",
          },
        });
        return;
      }

      if (!window.isSecureContext) {
        resolve({
          ok: false,
          error: {
            code: "insecure_context",
            message:
              "La geolocalisation navigateur n'est disponible qu'en HTTPS. Ce site est actuellement servi en HTTP. Utilisez la recherche d'adresse, la position de demonstration, ou activez HTTPS avec un nom de domaine.",
          },
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            ok: true,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              label: "Ma position actuelle",
            },
          });
        },
        (error) => {
          resolve({
            ok: false,
            error: mapGeolocationError(error),
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });

  return {
    getCurrentPosition,
  };
};
