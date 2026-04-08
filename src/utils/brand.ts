export const getBrandLogoUrl = (brand: string) => {
  const normalized = brand.toLowerCase();
  
  if (normalized.includes("total")) return "/logos/total.png";
  if (normalized.includes("carrefour")) return "/logos/carrefour.png";
  if (normalized.includes("leclerc")) return "/logos/leclerc.png";
  if (normalized.includes("intermarche")) return "/logos/intermarche.png";
  if (normalized.includes("super u") || normalized.includes("système u")) return "/logos/superu.png";
  if (normalized.includes("auchan")) return "/logos/auchan.png";
  if (normalized.includes("esso")) return "/logos/esso.png";
  if (normalized.includes("shell")) return "/logos/shell.png";
  if (normalized.includes("bp")) return "/logos/bp.png";
  if (normalized.includes("casino")) return "/logos/casino.png";
  if (normalized.includes("agri")) return "/logos/agri.png";
  
  return null;
};
