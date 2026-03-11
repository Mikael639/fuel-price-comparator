import type { Coordinates } from "@/types/station";

type GeolocationErrorCode =
  | "denied"
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
          "La géolocalisation a été refusée. Utilisez une position de démonstration ou recherchez votre ville manuellement.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: "unavailable" as const,
        message:
          "La position est indisponible pour le moment. Réessayez ou utilisez une position de démonstration.",
      };
    case error.TIMEOUT:
      return {
        code: "timeout" as const,
        message:
          "La demande de géolocalisation a expiré. Réessayez ou passez par le mode démonstration.",
      };
    default:
      return {
        code: "unknown" as const,
        message: "Une erreur inattendue est survenue pendant la géolocalisation.",
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
              "Votre navigateur ne prend pas en charge la géolocalisation. Utilisez la position de démonstration.",
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
