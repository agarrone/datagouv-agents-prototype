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

  it.each([
    "SELECT * FROM read_csv_auto('https://example.test/data.csv')",
    "SELECT * FROM read_parquet('/tmp/private.parquet')",
    "SELECT * FROM read_ndjson_auto('https://example.test/data.ndjson')",
    "SELECT * FROM postgres_scan('secret', 'public', 'users')",
    "SELECT * FROM st_read('https://example.test/data.geojson')",
    "SELECT * FROM information_schema.tables",
    "SELECT * FROM duckdb_settings()",
  ])("refuse un accès externe ou système : %s", (sql) => {
    expect(() => validateReadOnlySql(sql)).toThrow();
  });

  it.each([
    "WITH totals AS (SELECT region, COUNT(*) AS total FROM data GROUP BY region) SELECT *, RANK() OVER (ORDER BY total DESC) FROM totals",
    "SELECT unnest(tags) AS tag, COUNT(*) FROM data GROUP BY tag",
    "SELECT 'read_csv(' AS searched_text FROM data LIMIT 1",
  ])("préserve les possibilités analytiques : %s", (sql) => {
    expect(validateReadOnlySql(sql)).toBeTruthy();
  });

  it("refuse une requête démesurément longue", () => {
    expect(() => validateReadOnlySql(`SELECT * FROM data WHERE ${"TRUE OR ".repeat(3_000)}FALSE`)).toThrow();
  });
});
