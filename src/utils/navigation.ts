export const getGoogleMapsDirectionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const getWazeUrl = (lat: number, lng: number) =>
  `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

export const getAppleMapsUrl = (lat: number, lng: number) =>
  `https://maps.apple.com/?daddr=${lat},${lng}`;
