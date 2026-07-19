import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
} from "@duckdb/duckdb-wasm";
import type {
  DatasetQueryResult,
  DatasetRow,
  DatasetSchemaResult,
  DatasetValue,
} from "~~/shared/types/exploration";
import { validateReadOnlySql } from "~~/shared/sql/read-only";

type EngineStatus = "idle" | "loading" | "ready" | "error";

let databasePromise: Promise<AsyncDuckDB> | undefined;
let connectionPromise: Promise<AsyncDuckDBConnection> | undefined;

function normalizeValue(value: unknown): DatasetValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return Number(value);
  if (
    typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function tableToRows(
  table: Awaited<ReturnType<AsyncDuckDBConnection["query"]>>,
): DatasetRow[] {
  const fields = table.schema.fields.map(field => field.name);

  return table.toArray().map((source) => {
    const row: DatasetRow = {};
    for (const field of fields) {
      row[field] = normalizeValue(source[field]);
    }
    return row;
  });
}

async function createDatabase() {
  const [
    duckdb,
    { default: duckdbMvpWasm },
    { default: duckdbMvpWorker },
  ] = await Promise.all([
    import("@duckdb/duckdb-wasm"),
    import("@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"),
    import(
      "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"
    ),
  ]);
  const worker = new Worker(duckdbMvpWorker);
  const database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await database.instantiate(duckdbMvpWasm);

  const response = await fetch("/fixtures/datasets.parquet");
  if (!response.ok) {
    throw new Error("La ressource Parquet de test est inaccessible.");
  }
  await database.registerFileBuffer(
    "datasets.parquet",
    new Uint8Array(await response.arrayBuffer()),
  );

  const connection = await database.connect();
  await connection.query(`
    CREATE OR REPLACE VIEW data AS
    SELECT * FROM read_parquet('datasets.parquet')
  `);
  connectionPromise = Promise.resolve(connection);

  return database;
}

async function getConnection() {
  databasePromise ??= createDatabase();
  await databasePromise;
  if (!connectionPromise) {
    throw new Error("La connexion DuckDB n’a pas pu être initialisée.");
  }
  return connectionPromise;
}

export function useDatasetEngine() {
  const status = useState<EngineStatus>("dataset-engine-status", () => "idle");
  const error = useState<string | null>("dataset-engine-error", () => null);
  const schema = useState<DatasetSchemaResult | null>(
    "dataset-engine-schema",
    () => null,
  );
  const preview = useState<DatasetRow[]>("dataset-engine-preview", () => []);

  async function inspectSchema(): Promise<DatasetSchemaResult> {
    const connection = await getConnection();
    const [description, count, sample] = await Promise.all([
      connection.query("DESCRIBE data"),
      connection.query("SELECT COUNT(*) AS count FROM data"),
      connection.query("SELECT * FROM data LIMIT 5"),
    ]);
    const descriptionRows = tableToRows(description);
    const countRows = tableToRows(count);

    const result: DatasetSchemaResult = {
      table: "data",
      rowCount: Number(countRows[0]?.count ?? 0),
      columns: descriptionRows.map(row => ({
        name: String(row.column_name),
        type: String(row.column_type),
      })),
      sample: tableToRows(sample),
    };
    schema.value = result;
    preview.value = result.sample;
    return result;
  }

  async function load() {
    if (status.value === "ready") return inspectSchema();
    status.value = "loading";
    error.value = null;

    try {
      const result = await inspectSchema();
      status.value = "ready";
      return result;
    } catch (reason) {
      status.value = "error";
      error.value = reason instanceof Error
        ? reason.message
        : "Impossible de charger la ressource.";
      throw reason;
    }
  }

  async function executeSql(sql: string): Promise<DatasetQueryResult> {
    const connection = await getConnection();
    const readOnlySql = validateReadOnlySql(sql);
    const startedAt = performance.now();
    const table = await connection.query(`
      SELECT *
      FROM (${readOnlySql}) AS agent_result
      LIMIT 101
    `);
    const allRows = tableToRows(table);
    const truncated = allRows.length > 100;
    const rows = allRows.slice(0, 100);

    return {
      columns: table.schema.fields.map(field => field.name),
      rows,
      rowCount: rows.length,
      truncated,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }

  return {
    error: readonly(error),
    executeSql,
    inspectSchema,
    load,
    preview: readonly(preview),
    schema: readonly(schema),
    status: readonly(status),
  };
}
