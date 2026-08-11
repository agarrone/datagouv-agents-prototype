import { describe, expect, it } from "vitest";
import {
  buildExplorationInstructions,
  explorationPromptSections,
} from "~~/server/agents/prompts/exploration";

describe("exploration prompt", () => {
  it("assembles every specialized policy once", () => {
    const instructions = buildExplorationInstructions({
      datasetId: "dataset-id",
      organization: "Producteur public",
      resourceId: "resource-id",
      resourceName: "Ressource Parquet",
      title: "Jeu de données de test",
    });

    for (const section of explorationPromptSections) {
      expect(instructions.match(new RegExp(section.slice(0, 24), "g"))).toHaveLength(1);
    }
  });

  it("adds the active resource context", () => {
    const instructions = buildExplorationInstructions({
      datasetId: "catalogue-datagouv",
      organization: "data.gouv.fr",
      resourceId: "parquet-resource",
      resourceName: "Version Parquet",
      title: "Catalogue des données",
      schema: {
        rowCount: 42,
        columns: [{ name: "title", type: "VARCHAR" }],
      },
    });

    expect(instructions).toContain("jeu de données : Catalogue des données");
    expect(instructions).toContain("producteur : data.gouv.fr");
    expect(instructions).toContain("identifiant de ressource : parquet-resource");
    expect(instructions).toContain("table locale : data");
    expect(instructions).toContain("schéma déjà chargé : 42 lignes");
    expect(instructions).toContain("title (VARCHAR)");
    expect(instructions).toContain("utilise un tableau Markdown pour un top");
    expect(instructions).toContain("nombre entier");
  });
});
