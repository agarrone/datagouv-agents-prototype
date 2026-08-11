import { describe, expect, it } from "vitest";
import { humanizeDuckDbType } from "../shared/data/duckdb-types";

describe("humanizeDuckDbType", () => {
  it.each([
    ["VARCHAR", "texte"],
    ["BIGINT", "nombre entier"],
    ["DECIMAL(12,2)", "nombre décimal"],
    ["BOOLEAN", "oui / non"],
    ["DATE", "date"],
    ["TIMESTAMP WITH TIME ZONE", "date et heure"],
    ["VARCHAR[]", "liste"],
    ["STRUCT(nom VARCHAR)", "objet structuré"],
  ])("translates %s", (type, label) => {
    expect(humanizeDuckDbType(type)).toBe(label);
  });

  it("uses a neutral fallback for unknown types", () => {
    expect(humanizeDuckDbType("CUSTOM_TYPE")).toBe("valeur");
  });
});
