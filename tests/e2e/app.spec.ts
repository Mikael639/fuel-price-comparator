import { expect, test, type Page } from "@playwright/test";
import type { PriceFeedbackSummary } from "@/types/priceFeedback";

const nearbyStationsPayload = {
  results: [
    {
      id: 91170007,
      adresse: "12 AVENUE D'ESTIENNE D'ORVES",
      ville: "JUVISY-SUR-ORGE",
      cp: "91260",
      geom: { lat: 48.6887, lon: 2.383 },
      services_service: ["Boutique alimentaire", "Toilettes publiques"],
      horaires_automate_24_24: "Oui",
      sp95_prix: 1.793,
      sp98_prix: 1.864,
      gazole_prix: 1.688,
      e85_prix: 0.901,
      gplc_prix: 1.041,
    },
    {
      id: 91201001,
      adresse: "88 AVENUE FRANCOIS MITTERRAND",
      ville: "ATHIS-MONS",
      cp: "91200",
      geom: { lat: 48.7075, lon: 2.3928 },
      services_service: ["Lavage", "Boutique alimentaire"],
      horaires_automate_24_24: "Non",
      sp95_prix: 1.809,
      sp98_prix: 1.879,
      gazole_prix: 1.699,
      e85_prix: 0.919,
    },
  ],
};

const dailyHistoryPayload = {
  results: [
    {
      id: "91170007",
      prix_nom: "Gazole",
      prix_valeur: 1.71,
      prix_maj: "2026-03-10T08:00:00.000Z",
    },
    {
      id: "91170007",
      prix_nom: "SP95",
      prix_valeur: 1.8,
      prix_maj: "2026-03-10T08:00:00.000Z",
    },
  ],
};

const geocodingPayload = [
  {
    place_id: 1,
    lat: "48.6899",
    lon: "2.3734",
    display_name: "Juvisy-sur-Orge, Essonne, Ile-de-France, France",
    address: {
      city: "Juvisy-sur-Orge",
    },
    name: "Juvisy-sur-Orge",
  },
];

const routeGeocodingPayload = [
  {
    place_id: 2,
    lat: "48.7075",
    lon: "2.3928",
    display_name: "Athis-Mons, Essonne, Ile-de-France, France",
    address: {
      city: "Athis-Mons",
    },
    name: "Athis-Mons",
  },
];

const routePayload = {
  routes: [
    {
      distance: 6200,
      duration: 780,
      geometry: {
        coordinates: [
          [2.3734, 48.6899],
          [2.382, 48.6925],
          [2.3928, 48.7075],
        ],
      },
    },
  ],
};

const getDepartureInput = (page: Page) =>
  page.locator('input[aria-controls="departure-results"]');

const getDestinationInput = (page: Page) =>
  page.locator('input[aria-controls="destination-results"]');

test.beforeEach(async ({ page }) => {
  const feedbackSummary: PriceFeedbackSummary = {
    stationId: "91170007",
    fuel: "Diesel",
    confirmations: 0,
    reports: 0,
    lastConfirmedAt: null,
    lastReportedAt: null,
    latestFeedbackAt: null,
    latestSuggestedPrice: null,
    suggestedPriceAverage: null,
  };

  await page.route(
    "**/prix-des-carburants-en-france-flux-instantane-v2/records**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(nearbyStationsPayload),
      });
    },
  );

  await page.route("**/prix-carburants-quotidien/records**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(dailyHistoryPayload),
    });
  });

  await page.route("**/search?*", async (route) => {
    const requestUrl = route.request().url().toLowerCase();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        requestUrl.includes("athis") ? routeGeocodingPayload : geocodingPayload,
      ),
    });
  });

  await page.route("**/overpass-api.de/api/interpreter", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ elements: [] }),
    });
  });

  await page.route("**/route/v1/driving/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(routePayload),
    });
  });

  await page.route("**/api/route**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(routePayload),
    });
  });

  await page.route("**/api/price-feedback**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: feedbackSummary,
          cooldownHours: 12,
          storage: "memory",
        }),
      });
      return;
    }

    const payload = route.request().postDataJSON();

    if (payload?.isCorrect) {
      feedbackSummary.confirmations += 1;
      feedbackSummary.lastConfirmedAt = "2026-04-08T10:00:00.000Z";
      feedbackSummary.latestFeedbackAt = feedbackSummary.lastConfirmedAt;
    } else {
      feedbackSummary.reports += 1;
      feedbackSummary.lastReportedAt = "2026-04-08T10:00:00.000Z";
      feedbackSummary.latestFeedbackAt = feedbackSummary.lastReportedAt;
      feedbackSummary.latestSuggestedPrice = payload?.suggestedPrice ?? null;
      feedbackSummary.suggestedPriceAverage = payload?.suggestedPrice ?? null;
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        summary: feedbackSummary,
        cooldownHours: 12,
        storage: "memory",
      }),
    });
  });
});

test("can search a location and open a station detail", async ({ page }) => {
  await page.goto("/");

  await getDepartureInput(page).fill("Juvisy-sur-Orge");
  await getDepartureInput(page).press("Enter");
  await page
    .getByRole("option", { name: "Juvisy-sur-Orge - Juvisy-sur-Orge" })
    .click();

  await expect(page.getByText("Vos stations favorites")).toHaveCount(0);
  await expect(page.getByText("Liste des stations")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Station Juvisy-sur-Orge/ }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Voir details" }).first().click();

  await expect(page).toHaveURL(/\/station\//);
  await expect(page.getByText("Historique officiel")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Ajouter aux favorites|Retirer des favorites/,
    }),
  ).toBeVisible();
});

test("can activate route mode with a destination", async ({ page }) => {
  await page.goto("/");

  await getDepartureInput(page).fill("Juvisy-sur-Orge");
  await getDepartureInput(page).press("Enter");
  await page
    .getByRole("option", { name: "Juvisy-sur-Orge - Juvisy-sur-Orge" })
    .click();

  await getDestinationInput(page).fill("Athis-Mons");
  await page.getByRole("option", { name: "Athis-Mons - Athis-Mons" }).click();

  await expect(page.getByText("Trajet actif", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Stations visibles sur votre trajet/i),
  ).toBeVisible();
});

test("shows a friendly message when geocoding is rate limited", async ({
  page,
}) => {
  await page.route("**/search?*", async (route) => {
    const requestUrl = route.request().url().toLowerCase();

    if (requestUrl.includes("choisy")) {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Too Many Requests" }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto("/");
  await getDestinationInput(page).fill("Choisy");

  await expect(
    page.getByText(/Le geocodeur public est temporairement limite/i),
  ).toBeVisible();
});

test("lets a user report an incorrect price with an observed value", async ({
  page,
}) => {
  await page.goto("/");

  await getDepartureInput(page).fill("Juvisy-sur-Orge");
  await getDepartureInput(page).press("Enter");
  await page
    .getByRole("option", { name: "Juvisy-sur-Orge - Juvisy-sur-Orge" })
    .click();

  await page.getByRole("button", { name: "Prix incorrect" }).first().click();
  await page
    .getByLabel("Prix observe a la pompe")
    .first()
    .fill("1,679");

  const feedbackRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/api/price-feedback") &&
      request.method() === "POST",
  );

  await page.getByRole("button", { name: "Envoyer mon prix" }).first().click();

  const submittedRequest = await feedbackRequest;

  expect(submittedRequest.postDataJSON()).toMatchObject({
    stationId: "91170007",
    fuel: "Diesel",
    displayedPrice: 1.688,
    isCorrect: false,
    suggestedPrice: 1.679,
  });

  await expect(
    page.getByText(/Merci, votre signalement a ete enregistre/i).first(),
  ).toBeVisible();
});

test("falls back to a simplified route comparison when routing is unavailable", async ({
  page,
}) => {
  await page.route("**/route/v1/driving/**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "routing unavailable" }),
    });
  });

  await page.goto("/");

  await getDepartureInput(page).fill("Juvisy-sur-Orge");
  await getDepartureInput(page).press("Enter");
  await page
    .getByRole("option", { name: "Juvisy-sur-Orge - Juvisy-sur-Orge" })
    .click();

  await getDestinationInput(page).fill("Athis-Mons");
  await page.getByRole("option", { name: "Athis-Mons - Athis-Mons" }).click();

  await expect(
    page.getByText(/Comparaison simplifiee depart\/destination activee/i),
  ).toBeVisible();
  await expect(page.getByText(/Liste des stations/i)).toBeVisible();
});

test("keeps favorites after a page reload", async ({ page }) => {
  await page.goto("/");

  await getDepartureInput(page).fill("Juvisy-sur-Orge");
  await getDepartureInput(page).press("Enter");
  await page
    .getByRole("option", { name: "Juvisy-sur-Orge - Juvisy-sur-Orge" })
    .click();

  await page
    .getByRole("button", { name: /Ajouter aux favorites/i })
    .first()
    .click();
  await expect(page.getByText("Vos stations favorites")).toBeVisible();
  await page.waitForTimeout(500);

  await page.reload();

  await getDepartureInput(page).fill("Juvisy-sur-Orge");
  await getDepartureInput(page).press("Enter");
  await page
    .getByRole("option", { name: "Juvisy-sur-Orge - Juvisy-sur-Orge" })
    .click();

  await expect(page.getByText("Vos stations favorites")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Retirer des favorites/i }).first(),
  ).toBeVisible();
});
