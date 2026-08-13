import { describe, expect, it } from "vitest";
import { deterministicSchemaAnswer } from "~~/server/agents/schema-answer";
import type { ResourceContext } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const resource: ResourceContext = {
  datasetId: "dataset",
  resourceId: "resource",
  title: "Jeu de données",
  organization: "Organisation",
  resourceName: "Ressource",
  url: "https://example.test/resource.parquet",
  schema: {
    rowCount: 12,
    columns: [
      { name: "title", type: "VARCHAR" },
      { name: "views", type: "BIGINT" },
    ],
  },
};

function messages(text: string) {
  return [{
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
  }] as ExplorationMessage[];
}

describe("deterministic schema answer", () => {
  it("builds a translated Markdown table without calling the model", () => {
    const answer = deterministicSchemaAnswer(messages("Quelles sont les colonnes ?"), resource);

    expect(answer).toContain("Cette ressource contient 2 colonnes");
    expect(answer).toContain("| `title` | texte |");
    expect(answer).toContain("| `views` | nombre entier |");
  });

  it("ignores questions that require an actual analysis", () => {
    expect(deterministicSchemaAnswer(messages("Quelle colonne contient le plus de valeurs ?"), resource)).toBeUndefined();
  });

  it("shows every schema column without an arbitrary limit", () => {
    const manyColumns = Array.from({ length: 32 }, (_, index) => ({
      name: `column_${index + 1}`,
      type: "VARCHAR",
    }));
    const answer = deterministicSchemaAnswer(messages("Liste toutes les colonnes"), {
      ...resource,
      schema: { ...resource.schema!, columns: manyColumns },
    });

    expect(answer).toContain("Cette ressource contient 32 colonnes");
    expect(answer).toContain("| `column_32` | texte |");
    expect(answer).not.toContain("colonnes sont affichées sur");
  });
});
