import { expect, test } from "@playwright/test";

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
    { id: "91170007", prix_nom: "Gazole", prix_valeur: 1.71, prix_maj: "2026-03-10T08:00:00.000Z" },
    { id: "91170007", prix_nom: "SP95", prix_valeur: 1.8, prix_maj: "2026-03-10T08:00:00.000Z" },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/prix-des-carburants-en-france-flux-instantane-v2/records**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(nearbyStationsPayload),
    });
  });

  await page.route("**/prix-carburants-quotidien/records**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(dailyHistoryPayload),
    });
  });

  await page.route("**/overpass-api.de/api/interpreter", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ elements: [] }),
    });
  });
});

test("can select a manual location and open a station detail", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "Ville de démonstration" }).click();
  await page.getByRole("option", { name: "Juvisy-sur-Orge Centre" }).click();

  await expect(page.getByText("Vos stations favorites")).toHaveCount(0);
  await expect(page.getByText("Liste des stations")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Station Juvisy-sur-Orge/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Voir détails" }).first().click();

  await expect(page).toHaveURL(/\/station\//);
  await expect(page.getByText("Historique officiel")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ajouter aux favorites|Retirer des favorites/ })).toBeVisible();
});
