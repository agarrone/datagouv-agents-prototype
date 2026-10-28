import { describe, expect, it } from "vitest";
import {
  normalizeColumnName,
  normalizeColumnNames,
} from "../shared/data/column-names";

describe("column name normalization", () => {
  it("removes one or several UTF-8 BOM characters", () => {
    expect(normalizeColumnName("\uFEFF\uFEFFNom du festival"))
      .toBe("Nom du festival");
  });

  it("removes control characters and normalizes whitespace", () => {
    expect(normalizeColumnName("  Région\n\tprincipale  "))
      .toBe("Région principale");
  });

  it("keeps normalized names unique without regard to case", () => {
    expect(normalizeColumnNames([
      "\uFEFFNom",
      "Nom",
      "nom",
      "\u0000",
    ])).toEqual([
      "Nom",
      "Nom (2)",
      "nom (3)",
      "Colonne",
    ]);
  });
});
