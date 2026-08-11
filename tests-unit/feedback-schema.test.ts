import { describe, expect, it } from "vitest";
import { feedbackSchema } from "../shared/schemas/feedback";

describe("feedbackSchema", () => {
  it("accepte un retour contextualisé", () => {
    const result = feedbackSchema.safeParse({
      rating: "Utile",
      question: "Quelles sont les colonnes ?",
      answer: "Le jeu contient trois colonnes.",
      resource: "https://example.test/resource.parquet",
      dataset: "Jeu de test",
      resourceName: "Ressource Parquet",
      model: "agent-exploration",
      origin: "after_six_questions",
      createdAt: "2026-07-27T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBe("after_six_questions");
  });

  it("identifie par défaut un feedback sur une réponse", () => {
    const result = feedbackSchema.parse({ rating: "Inutile", answer: "Réponse" });
    expect(result.origin).toBe("response_feedback");
  });

  it("refuse une évaluation inconnue", () => {
    expect(feedbackSchema.safeParse({
      rating: "Moyen",
      answer: "Réponse",
    }).success).toBe(false);
  });
});
