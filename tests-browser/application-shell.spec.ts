import { expect, test } from "@playwright/test";

test("affiche le statut de prototype et les métadonnées de partage", async ({ page, request }) => {
  await page.goto("/");

  const banner = page.getByRole("complementary", {
    name: "Information sur le prototype",
  });
  await expect(banner).toContainText("Prototype de démonstration");
  await expect(banner).toHaveCSS("position", "sticky");
  await expect(banner.getByRole("link", { name: /Devenir bêta-testeur/ })).toHaveAttribute(
    "href",
    "https://grist.numerique.gouv.fr/o/datagouv/forms/hwUYRYmjXZnTD1eXAaMTEa/17",
  );
  await expect(banner.getByRole("link", { name: /Donner votre avis/ })).toHaveAttribute(
    "href",
    /\/forms\/rchxExoA1GEDLCVHNae7Y8\/25\?origin=Bandeau(?:\+|%20)(?:%C2%B7|·)(?:\+|%20)Accueil/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Posez vos questions directement aux données",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://datagouv-agent.agarrone.fr/link-preview.png?v=2",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "675");
  expect((await request.get("/link-preview.png")).ok()).toBe(true);
});

test("présente une page 404 cohérente et permet de revenir à l’accueil", async ({ page }) => {
  await page.goto("/page-qui-n-existe-pas");

  await expect(page.getByRole("heading", { name: "Cette page n’existe pas" })).toBeVisible();
  await expect(page.getByText("Erreur 404", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Revenir à l’accueil" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", {
    name: "Posez vos questions directement aux données",
  })).toBeVisible();
});

test("présente des documentations courtes orientées utilisateur", async ({ page }) => {
  await page.goto("/documentation");
  await expect(page.getByRole("heading", {
    name: "Comprendre l’assistant d’exploration",
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comment l’utiliser ?" })).toBeVisible();
  await expect(page.getByText("server/agents", { exact: false })).toHaveCount(0);

  await page.getByRole("link", {
    name: "Comprendre son fonctionnement technique",
  }).click();
  await expect(page.getByRole("heading", {
    name: "Comment fonctionne l’assistant ?",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Quelles données sont échangées ?",
  })).toBeVisible();
  await expect(page.getByText("prototype_step_limit", { exact: false })).toHaveCount(0);
});

test("conserve les cartes de la page d’accueil dans le viewport mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const resourceCards = page.locator('button[aria-pressed]');
  await expect(resourceCards.first()).toBeVisible();

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.clientWidth);

  const cardsStayInViewport = await resourceCards.evaluateAll(cards => cards.every((card) => {
    const bounds = card.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
  }));
  expect(cardsStayInViewport).toBe(true);
});
