/**
 * Utilitaires communs au proxy local (server/proxy-server.mjs) et aux
 * fonctions serverless (api/*). Ils evitent la duplication du cache, de la
 * lecture de corps de requete et des reponses JSON.
 */

export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

export class ProxyHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ProxyHttpError";
    this.status = status;
  }
}

/**
 * Cache TTL borne : evite qu'un client puisse faire croitre la memoire du
 * processus en variant indefiniment les cles de requete.
 */
export const createTtlCache = (maxEntries = 500) => {
  const entries = new Map();

  const pruneExpired = () => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        entries.delete(key);
      }
    }
  };

  return {
    get(key) {
      const entry = entries.get(key);

      if (!entry) {
        return null;
      }

      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return null;
      }

      return entry.value;
    },
    set(key, value, ttlMs) {
      entries.delete(key);

      if (entries.size >= maxEntries) {
        pruneExpired();
      }

      while (entries.size >= maxEntries) {
        // Les Map conservent l'ordre d'insertion : on retire la plus ancienne.
        const oldestKey = entries.keys().next().value;
        entries.delete(oldestKey);
      }

      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    get size() {
      return entries.size;
    },
  };
};

/**
 * Lit le corps d'une requete en refusant (413) tout ce qui depasse `maxBytes`.
 * Reutilise `request.body` quand la plateforme (ex. Vercel) l'a deja analyse.
 */
export const readRequestBody = (request, maxBytes = MAX_REQUEST_BODY_BYTES) =>
  new Promise((resolve, reject) => {
    if (typeof request.body === "string") {
      if (Buffer.byteLength(request.body) > maxBytes) {
        reject(new ProxyHttpError(413, "Corps de requete trop volumineux."));
        return;
      }

      resolve(request.body);
      return;
    }

    const declaredLength = Number(request.headers?.["content-length"]);

    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      reject(new ProxyHttpError(413, "Corps de requete trop volumineux."));
      return;
    }

    const chunks = [];
    let receivedBytes = 0;
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) {
        return;
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += buffer.length;

      if (receivedBytes > maxBytes) {
        settled = true;
        reject(new ProxyHttpError(413, "Corps de requete trop volumineux."));
        return;
      }

      chunks.push(buffer);
    });

    request.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks).toString("utf8"));
      }
    });

    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });

export const sanitizeUpstreamErrorMessage = (payload, status) => {
  const normalized = payload
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return `Proxy upstream error (${status})`;
  }

  return normalized.slice(0, 220);
};

export const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Appelle un service amont avec un timeout et renvoie le JSON.
 * Toute erreur est convertie en ProxyHttpError pour ne jamais exposer de
 * detail interne (stack, message de parsing...) au client.
 */
export const proxyJsonRequest = async (targetUrl, init = {}) => {
  let response;

  try {
    response = await fetch(targetUrl, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new ProxyHttpError(
      isTimeout ? 504 : 502,
      isTimeout ? "Le service amont n'a pas repondu a temps." : "Le service amont est injoignable.",
    );
  }

  const payload = await response.text();

  if (!response.ok) {
    throw new ProxyHttpError(response.status, sanitizeUpstreamErrorMessage(payload, response.status));
  }

  try {
    return JSON.parse(payload);
  } catch {
    throw new ProxyHttpError(502, "Le service amont a renvoye une reponse invalide.");
  }
};

export const createSendJson = (setCorsHeaders) => (response, statusCode, payload) => {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

/** Message generique pour les erreurs inattendues : le detail reste dans les logs. */
export const toPublicErrorMessage = (error) => {
  if (error instanceof ProxyHttpError) {
    return error.message;
  }

  console.error("[proxy] Erreur inattendue:", error);
  return "Erreur interne du serveur.";
};

const COORDINATE = String.raw`-?\d{1,3}(?:\.\d{1,8})?`;
const COORDINATE_PAIR = `${COORDINATE},${COORDINATE}`;
const COORDINATE_PAIR_PATTERN = new RegExp(`^${COORDINATE_PAIR}$`);
const COORDINATE_LIST_PATTERN = new RegExp(`^${COORDINATE_PAIR}(?:;${COORDINATE_PAIR}){1,24}$`);

const isValidLngLat = (pair) => {
  const [lng, lat] = pair.split(",").map(Number);
  return Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
};

/**
 * Valide les coordonnees transmises a OSRM ("lng,lat;lng,lat...") avant de les
 * injecter dans le chemin de l'URL amont. Renvoie la chaine normalisee ou null.
 */
export const parseRouteCoordinates = ({ origin, destination, coordinates }) => {
  const candidate = coordinates ?? (origin && destination ? `${origin};${destination}` : null);

  if (!candidate || !COORDINATE_LIST_PATTERN.test(candidate)) {
    return null;
  }

  return candidate.split(";").every(isValidLngLat) ? candidate : null;
};

export const isValidCoordinatePair = (value) =>
  typeof value === "string" && COORDINATE_PAIR_PATTERN.test(value) && isValidLngLat(value);

/**
 * La requete Overpass relayee doit correspondre exactement a celle construite
 * par le front (src/services/osmService.ts) : sinon le proxy servirait de
 * relais ouvert vers Overpass.
 */
const OSM_BRAND_QUERY_PATTERN = new RegExp(
  String.raw`^\[out:json\]\[timeout:\d{1,3}\];\(node\["amenity"="fuel"\]\(around:\d{1,4},(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)\);way\["amenity"="fuel"\]\(around:\d{1,4},-?\d{1,3}(?:\.\d+)?,-?\d{1,3}(?:\.\d+)?\);\);outcentertags\d{1,2};$`,
);

export const isAllowedOsmBrandQuery = (query) => {
  // Les espaces sont retires des deux cotes : le motif ci-dessus est ecrit sans espace.
  const compact = query.replace(/\s+/g, "");

  if (!OSM_BRAND_QUERY_PATTERN.test(compact)) {
    return false;
  }

  const match = compact.match(OSM_BRAND_QUERY_PATTERN);
  return Math.abs(Number(match[1])) <= 90 && Math.abs(Number(match[2])) <= 180;
};
