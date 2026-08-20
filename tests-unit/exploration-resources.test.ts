import { describe, expect, it } from "vitest";
import {
  explorationResources,
  findInitialDatasetResource,
  findMatchingDatasetResource,
  resourceContextName,
} from "../shared/data/exploration-resources";

describe("exploration resources", () => {
  it("keeps the nine migrated resources available", () => {
    expect(explorationResources).toHaveLength(9);
  });

  it("uses unique identifiers and valid Parquet URLs", () => {
    const ids = new Set(explorationResources.map(resource => resource.id));

    expect(ids.size).toBe(explorationResources.length);
    for (const resource of explorationResources) {
      expect(resource.title).not.toBe("");
      expect(resource.organization).not.toBe("");
      expect(new URL(resource.parquetUrl).protocol).toBe("https:");
      expect(new URL(resource.parquetUrl).pathname).toMatch(/\.parquet$/);
    }
  });

  it("matches a Hydra resource exposed through a different domain", () => {
    const match = findMatchingDatasetResource([{
      id: "2876a346-d50c-4911-934e-19ee07b0e503",
      title: "elus-maires-mai.csv",
      format: "CSV",
      url: "https://static.data.gouv.fr/elus-maires-mai.csv",
      parquetUrl: "https://hydra.s3.rbx.io.cloud.ovh.net/parquet/2876a346-d50c-4911-934e-19ee07b0e503.parquet",
    }], {
      id: "repertoire-elus",
      parquetUrl: "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/2876a346-d50c-4911-934e-19ee07b0e503.parquet",
    });

    expect(match?.title).toBe("elus-maires-mai.csv");
  });

  it("does not invent a resource name when metadata is unavailable", () => {
    expect(resourceContextName({})).toBe("Nom de la ressource non disponible");
  });

  it("selects the first explorable resource by default", () => {
    const resources = [
      { id: "unavailable", title: "PDF", format: "PDF", url: "https://example.test/file.pdf", parquetUrl: null },
      { id: "first", title: "Premier CSV", format: "CSV", url: "https://example.test/first.csv", parquetUrl: "https://example.test/first.parquet" },
      { id: "second", title: "Second CSV", format: "CSV", url: "https://example.test/second.csv", parquetUrl: "https://example.test/second.parquet" },
    ];

    expect(findInitialDatasetResource(resources, {
      id: "dataset-demo",
      datasetReference: "dataset-demo",
      title: "Démo",
      organization: "Organisation",
      parquetUrl: "https://example.test/second.parquet",
    })?.id).toBe("first");
  });

  it("preserves an explicitly selected resource", () => {
    const resources = [
      { id: "first", title: "Premier CSV", format: "CSV", url: "https://example.test/first.csv", parquetUrl: "https://example.test/first.parquet" },
      { id: "second", title: "Second CSV", format: "CSV", url: "https://example.test/second.csv", parquetUrl: "https://example.test/second.parquet" },
    ];

    expect(findInitialDatasetResource(resources, {
      id: "second",
      datasetReference: "dataset-demo",
      title: "Démo",
      organization: "Organisation",
      parquetUrl: "https://example.test/second.parquet",
      resourceName: "Second CSV",
    })?.id).toBe("second");
  });
});
