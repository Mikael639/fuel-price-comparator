import { buildEuropeMarketsPayload } from "../../server/europe-markets.mjs";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cached = null;
let cachedAt = 0;

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const forceRefresh = request.query?.refresh === "1";
  const now = Date.now();

  if (!forceRefresh && cached && now - cachedAt < CACHE_TTL_MS) {
    response.setHeader("X-Cache", "HIT");
    response.status(200).json(cached);
    return;
  }

  try {
    const payload = await buildEuropeMarketsPayload();
    cached = payload;
    cachedAt = now;
    response.setHeader("X-Cache", "MISS");
    response.status(200).json(payload);
  } catch (error) {
    response.status(502).json({
      error: "Europe markets unavailable",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
