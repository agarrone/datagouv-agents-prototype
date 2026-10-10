import { describe, expect, it } from "vitest";

const baseUrl = process.env.FEEDBACK_TEST_BASE_URL?.replace(/\/$/, "");
const runIntegration = process.env.RUN_GRIST_INTEGRATION_TEST === "1" && Boolean(baseUrl);

describe.runIf(runIntegration)("Grist feedback integration", () => {
  it("creates a feedback record through the application endpoint", async () => {
    const createdAt = new Date().toISOString();
    const response = await fetch(`${baseUrl}/nuxt-api/feedback`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseUrl!,
      },
      body: JSON.stringify({
        rating: "Utile",
        question: `[TEST D’INTÉGRATION] Feedback Grist ${createdAt}`,
        answer: "Enregistrement généré automatiquement pour vérifier le parcours de feedback.",
        resource: "https://object.files.data.gouv.fr/test-integration.parquet",
        dataset: "test-integration-feedback",
        datasetName: "Test d’intégration du prototype",
        datasetUrl: "https://www.data.gouv.fr/fr/datasets/test-integration-feedback/",
        resourceName: "Ressource de test — à supprimer",
        model: "gpt-oss-120b",
        origin: "response_feedback",
        createdAt,
      }),
    });

    expect(response.status, await response.text()).toBe(200);
  });
});
