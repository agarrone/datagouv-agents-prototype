import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDatagouvResource } from "../server/services/datagouv";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockDatasetResource(parquetUrl: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: "dataset-id",
    slug: "dataset-slug",
    resources: [{
      id: "resource-id",
      title: "Ressource",
      format: "CSV",
      extras: { "analysis:parsing:parquet_url": parquetUrl },
    }],
  }), { status: 200 })));
}

describe("data.gouv.fr resource verification", () => {
  it("accepts the exact Parquet URL published by data.gouv.fr", async () => {
    const url = "https://object.files.data.gouv.fr/hydra-parquet/resource-id.parquet";
    mockDatasetResource(url);

    await expect(verifyDatagouvResource("dataset-slug", "resource-id", url))
      .resolves.toMatchObject({ id: "resource-id" });
  });

  it("accepts the same Hydra file exposed through its historical host", async () => {
    mockDatasetResource("https://hydra.s3.rbx.io.cloud.ovh.net/parquet/resource-id.parquet");

    await expect(verifyDatagouvResource(
      "dataset-slug",
      "resource-id",
      "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/resource-id.parquet",
    )).resolves.toMatchObject({ id: "resource-id" });
  });

  it("rejects an URL not present in the data.gouv.fr metadata", async () => {
    mockDatasetResource("https://object.files.data.gouv.fr/hydra-parquet/resource-id.parquet");

    await expect(verifyDatagouvResource(
      "dataset-slug",
      "resource-id",
      "https://example.test/other.parquet",
    )).rejects.toThrow("attestée par data.gouv.fr");
  });
});
