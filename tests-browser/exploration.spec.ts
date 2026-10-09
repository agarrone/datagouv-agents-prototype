import { expect, test } from "@playwright/test";

const EXPLORATION_URL = [
  "/laboratoire/exploration",
  "?resource=fixture-datasets",
  "&dataset=fixture-datasets",
  "&parquet=http%3A%2F%2Flocalhost%3A3000%2Ffixtures%2Fdatasets.parquet",
  "&title=Jeu%20de%20donn%C3%A9es%20de%20test",
  "&organization=data.gouv.fr",
  "&resourceName=Ressource%20Parquet%20de%20test",
].join("");

async function openSqlConsole(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Poser une question" }).click();
  await page.getByRole("tab", { name: "Console SQL" }).click();

  const console = page.getByRole("region", { name: "Console SQL" });
  await expect(console).toBeVisible();
  return console;
}

async function executeSql(
  page: import("@playwright/test").Page,
  sql: string,
) {
  const console = await openSqlConsole(page);
  const editor = console.getByRole("textbox");
  await editor.fill(sql);
  await console.getByRole("button", { name: "Exécuter" }).click();
  await expect(console.getByText("Résultat", { exact: true })).toBeVisible();
  return console;
}

test.describe("Explorateur de données", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EXPLORATION_URL);
    await expect(
      page.getByRole("region", { name: "Espace d’exploration du jeu de données" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Rechercher dans les données")).toBeVisible({
      timeout: 60_000,
    });
  });

  test("charge une ressource locale et affiche ses données", async ({ page }) => {
    const workspace = page.getByRole("region", {
      name: "Espace d’exploration du jeu de données",
    });
    await expect(workspace.getByRole("heading", { name: "Jeu de données de test" })).toBeVisible();
    await expect(workspace.getByText("Ressource : Ressource Parquet de test")).toBeVisible();
    await expect(page.getByText("12 lignes", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "title", exact: true })).toBeVisible();
    await expect(
      workspace.getByRole("table").getByText("Comptages vélo 2025", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Poser une question" }).click();
    const composer = page.getByRole("form", { name: "Poser une question à l’assistant" });
    await composer.getByRole("button", { name: /1 ressource utilisée/ }).click();
    await expect(composer.getByText("Ressource Parquet de test", { exact: true })).toBeVisible();
    await expect(composer.getByText("Jeu de données de test", { exact: true })).toHaveCount(0);
  });

  test("exécute une requête SQL puis applique et réinitialise une vue", async ({ page }) => {
    const console = await executeSql(
      page,
      "SELECT * FROM data WHERE theme = 'Mobilité'",
    );

    await expect(console.getByText("2 lignes", { exact: false })).toBeVisible();
    await console.getByRole("button", { name: "Appliquer à l’explorateur" }).click();
    await expect(console.getByRole("button", { name: "Appliquée" })).toBeVisible();

    await expect(page.getByText("Requête personnalisée depuis la console SQL")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Télécharger les données filtrées" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click();
    await expect(
      page.getByText("Requête personnalisée depuis la console SQL"),
    ).toBeHidden();
    await expect(page.getByText("12 lignes", { exact: true })).toBeVisible();
  });
});
