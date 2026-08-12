import { describe, expect, it } from "vitest";
import { feedbackSchema } from "~~/shared/schemas/feedback";
import { buildFeedbackFields } from "~~/server/services/feedback";

describe("Grist feedback fields", () => {
  it("records dataset and resource labels when available", () => {
    const feedback = feedbackSchema.parse({
      rating: "Utile",
      question: "Question",
      answer: "Réponse",
      dataset: "jeu-de-test",
      datasetName: "Jeu de test",
      datasetUrl: "https://www.data.gouv.fr/fr/datasets/jeu-de-test/",
      resourceName: "Ressource Parquet",
    });

    expect(buildFeedbackFields(feedback)).toMatchObject({
      Dataset_name: "Jeu de test",
      Dataset_url: "https://www.data.gouv.fr/fr/datasets/jeu-de-test/",
      Ressource_name: "Ressource Parquet",
    });
    expect(buildFeedbackFields(feedback)).not.toHaveProperty("Dataset");
  });

  it("omits optional Grist fields when unavailable", () => {
    const feedback = feedbackSchema.parse({
      rating: "Inutile",
      answer: "Réponse",
    });
    const fields = buildFeedbackFields(feedback);

    expect(fields).not.toHaveProperty("Dataset_name");
    expect(fields).not.toHaveProperty("Dataset_url");
    expect(fields).not.toHaveProperty("Ressource_name");
  });
});
