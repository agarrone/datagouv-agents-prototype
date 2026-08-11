import { describe, expect, it } from "vitest";
import { getStarterQuestions } from "../shared/agents/starter-questions";

describe("getStarterQuestions", () => {
  it("returns three fixed and two schema-aware questions", () => {
    const questions = getStarterQuestions([
      { name: "organisation", type: "VARCHAR" },
      { name: "metric.views", type: "BIGINT" },
      { name: "created_at", type: "TIMESTAMP" },
    ]);

    expect(questions).toHaveLength(5);
    expect(questions.slice(0, 3)).toEqual([
      "Explique-moi ton fonctionnement",
      "Explique-moi le contenu de ce jeu de données",
      "Quelles sont les colonnes de ce jeu de données ?",
    ]);
    expect(questions[3]).toContain("organisation");
    expect(questions[4]).toContain("metric.views");
  });

  it("ignores technical identifiers, URLs and coordinates", () => {
    const questions = getStarterQuestions([
      { name: "id", type: "VARCHAR" },
      { name: "url", type: "VARCHAR" },
      { name: "latitude", type: "DOUBLE" },
      { name: "longitude", type: "DOUBLE" },
      { name: "categorie", type: "VARCHAR" },
      { name: "date_publication", type: "DATE" },
    ]);

    expect(questions[3]).toContain("categorie");
    expect(questions[4]).toContain("date_publication");
    expect(questions.slice(3).join(" ")).not.toMatch(/latitude|longitude|« id »|« url »/i);
  });

  it("keeps two useful dimension questions when no measure or date exists", () => {
    const questions = getStarterQuestions([
      { name: "organisation", type: "VARCHAR" },
      { name: "format", type: "VARCHAR" },
    ]);

    expect(questions[3]).toContain("organisation");
    expect(questions[4]).toContain("format");
  });
});
