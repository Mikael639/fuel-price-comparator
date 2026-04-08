import { useCallback } from "react";
import type { Coordinates } from "@/types/station";

type GeolocationErrorCode = "denied" | "unavailable" | "timeout" | "unsupported" | "unknown";

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

export type GeolocationResult = GeolocationSuccess | GeolocationFailure;

const mapGeolocationError = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: "denied" as const,
        message:
          "La geolocalisation a ete refusee. Recherchez votre ville manuellement.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: "unavailable" as const,
        message: "La position est indisponible pour le moment. Reessayez ou recherchez votre ville manuellement.",
      };
    case error.TIMEOUT:
      return {
        code: "timeout" as const,
        message: "La demande de geolocalisation a expire. Reessayez ou recherchez votre ville manuellement.",
      };
    default:
      return {
        code: "unknown" as const,
        message: "Une erreur inattendue est survenue pendant la geolocalisation.",
      };
  }
};

export const getBrowserCurrentPosition = (): Promise<GeolocationResult> =>
  new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({
        ok: false,
        error: {
          code: "unsupported",
          message:
            "Votre navigateur ne prend pas en charge la geolocalisation. Recherchez votre ville manuellement.",
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

export const useGeolocation = () => {
  const getCurrentPosition = useCallback(() => getBrowserCurrentPosition(), []);

  return {
    getCurrentPosition,
  };
};
