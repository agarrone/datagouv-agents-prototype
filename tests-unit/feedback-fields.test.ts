import { describe, expect, it } from "vitest";
import { feedbackSchema } from "~~/shared/schemas/feedback";
import { buildFeedbackFields } from "~~/server/services/feedback";

describe("Grist feedback fields", () => {
  it("records dataset and resource labels when available", () => {
    const feedback = feedbackSchema.parse({
      rating: "Utile",
      question: "Question",
      answer: "Réponse",
      comment: "Commentaire lié à la réponse",
      dataset: "jeu-de-test",
      datasetName: "Jeu de test",
      datasetUrl: "https://www.data.gouv.fr/fr/datasets/jeu-de-test/",
      resourceName: "Ressource Parquet",
      model: "gpt-oss-120b",
    });

    expect(buildFeedbackFields(feedback)).toMatchObject({
      dataset_name: "Jeu de test",
      dataset_url: "https://www.data.gouv.fr/fr/datasets/jeu-de-test/",
      resource_name: "Ressource Parquet",
      model_id: "gpt-oss-120b",
      comment: "Commentaire lié à la réponse",
    });
    expect(buildFeedbackFields(feedback)).not.toHaveProperty("dataset");
  });

  it("omits optional Grist fields when unavailable", () => {
    const feedback = feedbackSchema.parse({
      rating: "Inutile",
      answer: "Réponse",
      comment: "Commentaire lié à la réponse",
    });
    const fields = buildFeedbackFields(feedback);

    expect(fields).not.toHaveProperty("dataset_name");
    expect(fields).not.toHaveProperty("dataset_url");
    expect(fields).not.toHaveProperty("resource_name");
  });
});
