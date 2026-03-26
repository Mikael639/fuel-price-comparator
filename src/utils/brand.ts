export const getBrandLogoUrl = (brandName: string): string | null => {
  if (!brandName) return null;

  const mapping: Record<string, string> = {
    "total": "total",
    "totalenergies": "total",
    "total access": "total",
    "e.leclerc": "leclerc",
    "leclerc": "leclerc",
    "carrefour": "carrefour",
    "carrefour market": "carrefour",
    "carrefour contact": "carrefour",
    "intermarche": "intermarche.com",
    "intermarche contact": "intermarche.com",
    "systeme u": "magasins-u.com",
    "super u": "magasins-u.com",
    "hyper u": "magasins-u.com",
    "esso": "esso.fr",
    "esso express": "esso.fr",
    "bp": "bp.com",
    "shell": "shell.fr",
    "auchan": "auchan.fr",
    "geant casino": "geantcasino.fr",
    "casino": "supercasino.fr",
    "eni": "eni.com",
    "avia": "avia-france.fr",
    "cora": "cora.fr",
    "netto": "netto.fr",
    "g20": "supermarchesg20.com",
    "dyneff": "dyneff.fr"
  };

  const normalized = brandName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  
  const getUrl = (val: string) => {
    // If it's one of our local files
    if (["total", "leclerc", "carrefour"].includes(val)) {
      return `/logos/${val}.png`;
    }
    // Otherwise use unavatar as a proxy (more stable than direct clearbit)
    return `https://unavatar.io/${val}?fallback=false`;
  };

  // Try exact match
  if (mapping[normalized]) {
    return getUrl(mapping[normalized]);
  }

  // Try partial match
  for (const [key, val] of Object.entries(mapping)) {
    if (normalized.includes(key)) {
      return getUrl(val);
    }
  }

  return null;
};
