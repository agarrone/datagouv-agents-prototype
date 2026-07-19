import { describe, expect, it } from "vitest";
import { resourceContextSchema } from "../shared/schemas/agent";

describe("resourceContextSchema", () => {
  it("accepte une ressource publique complète", () => {
    const result = resourceContextSchema.safeParse({
      datasetId: "dataset-id",
      resourceId: "resource-id",
      title: "Données de test",
      organization: "Organisation de test",
      resourceName: "Ressource de test",
      url: "https://example.test/resource.parquet",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a preloaded schema summary", () => {
    const result = resourceContextSchema.safeParse({
      datasetId: "dataset",
      resourceId: "resource",
      title: "Titre",
      organization: "Organisation",
      resourceName: "Ressource",
      url: "https://example.com/resource.parquet",
      schema: {
        rowCount: 12,
        columns: [{ name: "title", type: "VARCHAR" }],
      },
    });

    expect(result.success).toBe(true);
  });

  it("refuse une URL de ressource invalide", () => {
    const result = resourceContextSchema.safeParse({
      datasetId: "dataset-id",
      resourceId: "resource-id",
      title: "Données de test",
      organization: "Organisation de test",
      resourceName: "Ressource de test",
      url: "pas-une-url",
    });

    expect(result.success).toBe(false);
  });
});
