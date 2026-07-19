import { describe, expect, it } from "vitest";
import {
  explorationResources,
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
});
