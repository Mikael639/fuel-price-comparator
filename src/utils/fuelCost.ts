export function calculateFuelCost(
  distanceKm: number,
  consumptionL100: number,
  pricePerLiter: number,
): number {
  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(consumptionL100) ||
    !Number.isFinite(pricePerLiter)
  ) {
    return 0;
  }

  if (distanceKm <= 0 || consumptionL100 <= 0 || pricePerLiter <= 0) {
    return 0;
  }

  const litersUsed = (distanceKm * consumptionL100) / 100;
  return litersUsed * pricePerLiter;
}
