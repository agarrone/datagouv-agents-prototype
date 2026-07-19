import { describe, expect, it } from "vitest";
import { validateReadOnlySql } from "../shared/sql/read-only";

describe("validateReadOnlySql", () => {
  it.each([
    "SELECT * FROM data",
    "WITH filtered AS (SELECT * FROM data) SELECT * FROM filtered",
    "-- analyse\nSELECT organization, COUNT(*) FROM data GROUP BY organization",
  ])("accepte une requête de lecture : %s", (sql) => {
    expect(validateReadOnlySql(sql)).toBeTruthy();
  });

  it.each([
    "DELETE FROM data",
    "CREATE TABLE copy AS SELECT * FROM data",
    "SELECT * FROM data; DROP TABLE data",
    "PRAGMA version",
  ])("refuse une requête non autorisée : %s", (sql) => {
    expect(() => validateReadOnlySql(sql)).toThrow();
  });
});
