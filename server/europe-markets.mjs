import XLSX from "xlsx";

const EUROPE_HISTORY_URL =
  "https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx";

const EUROPE_COUNTRIES = {
  FR: "France",
  BE: "Belgique",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  NL: "Pays-Bas",
  PT: "Portugal",
  LU: "Luxembourg",
};

const excelDateToIso = (value) => {
  if (typeof value !== "number") return null;
  const parsedDate = XLSX.SSF.parse_date_code(value);
  if (!parsedDate) return null;
  return new Date(Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d)).toISOString();
};

export const buildEuropeMarketsPayload = async () => {
  const response = await fetch(EUROPE_HISTORY_URL, {
    headers: { "User-Agent": "FuelFlashProxy/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Europe history unavailable (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets["Prices with taxes"] ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  const headerRow = rows[0] ?? [];
  const dataRows = rows
    .slice(3)
    .filter((row) => typeof row[0] === "number")
    .slice(0, 7)
    .reverse();

  const markets = Object.entries(EUROPE_COUNTRIES)
    .map(([code, name]) => {
      const sp95Index = headerRow.indexOf(`${code}_price_with_tax_euro95`);
      const dieselIndex = headerRow.indexOf(`${code}_price_with_tax_diesel`);
      const gplIndex = headerRow.indexOf(`${code}_price_with_tax_LPG`);

      const snapshots = dataRows
        .map((row) => ({
          date: excelDateToIso(row[0]),
          prices: {
            SP95: typeof row[sp95Index] === "number" ? row[sp95Index] / 1000 : null,
            Diesel: typeof row[dieselIndex] === "number" ? row[dieselIndex] / 1000 : null,
            GPL: typeof row[gplIndex] === "number" ? row[gplIndex] / 1000 : null,
          },
        }))
        .filter((snapshot) => snapshot.date != null);

      if (snapshots.length === 0) return null;
      return { code, name, currency: "EUR", snapshots };
    })
    .filter(Boolean);

  return {
    markets,
    source: "live",
    updatedAt: markets[0]?.snapshots.at(-1)?.date ?? null,
    sourceLabel: "Commission europeenne • Weekly Oil Bulletin",
  };
};
