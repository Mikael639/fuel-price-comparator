// @vitest-environment node
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBrandQuery } from "../src/services/osmService";
import {
  ProxyHttpError,
  createTtlCache,
  isAllowedOsmBrandQuery,
  parseRouteCoordinates,
  readRequestBody,
  toPublicErrorMessage,
} from "./shared.mjs";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const createRequest = (body, headers = {}) => {
  const stream = Readable.from([Buffer.from(body)]);
  stream.headers = headers;
  return stream;
};

describe("createTtlCache", () => {
  it("expire les entrees apres leur TTL", () => {
    vi.useFakeTimers();
    const cache = createTtlCache(10);

    cache.set("a", 1, 1_000);
    expect(cache.get("a")).toBe(1);

    vi.advanceTimersByTime(1_001);
    expect(cache.get("a")).toBeNull();
  });

  it("reste borne et evince les plus anciennes entrees", () => {
    const cache = createTtlCache(3);

    ["a", "b", "c", "d", "e"].forEach((key) => cache.set(key, key, 60_000));

    expect(cache.size).toBe(3);
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
    expect(cache.get("e")).toBe("e");
  });
});

describe("readRequestBody", () => {
  it("lit un corps de taille raisonnable", async () => {
    await expect(readRequestBody(createRequest("hello"), 100)).resolves.toBe("hello");
  });

  it("refuse un corps trop volumineux (413)", async () => {
    await expect(readRequestBody(createRequest("x".repeat(500)), 100)).rejects.toMatchObject({
      status: 413,
    });
  });

  it("refuse via l'en-tete content-length sans lire le flux", async () => {
    await expect(
      readRequestBody(createRequest("x", { "content-length": "999999" }), 100),
    ).rejects.toBeInstanceOf(ProxyHttpError);
  });

  it("reutilise le corps deja analyse par la plateforme", async () => {
    await expect(readRequestBody({ body: "deja-lu", headers: {} }, 100)).resolves.toBe("deja-lu");
  });
});

describe("parseRouteCoordinates", () => {
  it("accepte une liste de coordonnees valides", () => {
    expect(parseRouteCoordinates({ coordinates: "2.3522,48.8566;4.8357,45.764" })).toBe(
      "2.3522,48.8566;4.8357,45.764",
    );
    expect(parseRouteCoordinates({ origin: "2.35,48.85", destination: "-1.55,47.21" })).toBe(
      "2.35,48.85;-1.55,47.21",
    );
  });

  it.each([
    [{}],
    [{ coordinates: "../../etc/passwd" }],
    [{ coordinates: "2.35,48.85" }],
    [{ coordinates: "2.35,48.85;999,48.85" }],
    [{ coordinates: "2.35,48.85;2.36,91" }],
    [{ origin: "2.35,48.85", destination: "x;y" }],
    [{ coordinates: "2.35,48.85/../admin;2.36,48.9" }],
  ])("rejette %j", (input) => {
    expect(parseRouteCoordinates(input)).toBeNull();
  });
});

describe("isAllowedOsmBrandQuery", () => {
  it("accepte la requete construite par le front", () => {
    expect(isAllowedOsmBrandQuery(buildBrandQuery(48.6887, 2.383))).toBe(true);
    expect(isAllowedOsmBrandQuery(buildBrandQuery(-21.1151, 55.5364))).toBe(true);
  });

  it.each([
    ["[out:json];node(1);out;"],
    ['[out:json][timeout:20];(node["amenity"="fuel"](around:90,48.1,2.3););out center tags 8;'],
    [`${buildBrandQuery(48.6887, 2.383)} node["shop"](around:90,48,2);`],
    [buildBrandQuery(148.6887, 2.383)],
  ])("rejette une requete arbitraire (%#)", (query) => {
    expect(isAllowedOsmBrandQuery(query)).toBe(false);
  });
});

describe("toPublicErrorMessage", () => {
  it("n'expose pas le detail des erreurs inattendues", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(toPublicErrorMessage(new Error("ENOENT /srv/secret/path"))).toBe("Erreur interne du serveur.");
    expect(toPublicErrorMessage(new ProxyHttpError(429, "Trop de requetes"))).toBe("Trop de requetes");
  });
});
