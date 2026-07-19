import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
} from "@duckdb/duckdb-wasm";
import type {
  DatasetQueryResult,
  DatasetRow,
  DatasetSchemaResult,
  DatasetValue,
  ExplorerViewResult,
} from "~~/shared/types/exploration";
import type {
  ExplorationResource,
} from "~~/shared/data/exploration-resources";
import { validateReadOnlySql } from "~~/shared/sql/read-only";

type EngineStatus = "idle" | "loading" | "ready" | "error";

let databasePromise: Promise<AsyncDuckDB> | undefined;
let connectionPromise: Promise<AsyncDuckDBConnection> | undefined;
let activeWorker: Worker | undefined;
const verifiedQueries = new Set<string>();
let latestVerifiedQuery: string | undefined;

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

async function createDatabase(parquetUrl: string) {
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
  activeWorker = worker;
  const database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await database.instantiate(duckdbMvpWasm);
  await database.registerFileURL(
    "resource.parquet",
    parquetUrl,
    duckdb.DuckDBDataProtocol.HTTP,
    false,
  );

  const connection = await database.connect();
  await connection.query(`
    CREATE OR REPLACE VIEW data AS
    SELECT * FROM read_parquet('resource.parquet')
  `);
  connectionPromise = Promise.resolve(connection);

  return database;
}

async function getConnection(parquetUrl?: string) {
  if (!databasePromise && parquetUrl) {
    databasePromise = createDatabase(parquetUrl);
  }
  if (!databasePromise) {
    throw new Error("Chargez une ressource avant de l’interroger.");
  }
  await databasePromise;
  if (!connectionPromise) {
    throw new Error("La connexion DuckDB n’a pas pu être initialisée.");
  }
  return connectionPromise;
}

async function resetDatabase() {
  const previousConnection = connectionPromise;
  const previousDatabase = databasePromise;
  connectionPromise = undefined;
  databasePromise = undefined;
  verifiedQueries.clear();
  latestVerifiedQuery = undefined;

  if (previousConnection) {
    try {
      await (await previousConnection).close();
    } catch {
      // The connection may already be unavailable after a loading error.
    }
  }
  if (previousDatabase) {
    try {
      await (await previousDatabase).terminate();
    } catch {
      // The database may not have finished initializing.
    }
  }
  activeWorker?.terminate();
  activeWorker = undefined;
}

export function useDatasetEngine() {
  const status = useState<EngineStatus>("dataset-engine-status", () => "idle");
  const error = useState<string | null>("dataset-engine-error", () => null);
  const schema = useState<DatasetSchemaResult | null>(
    "dataset-engine-schema",
    () => null,
  );
  const preview = useState<DatasetRow[]>("dataset-engine-preview", () => []);
  const activeResource = useState<ExplorationResource | null>(
    "dataset-engine-resource",
    () => null,
  );
  const activeView = useState<ExplorerViewResult | null>(
    "dataset-engine-view",
    () => null,
  );

  async function inspectSchema(): Promise<DatasetSchemaResult> {
    if (schema.value) return schema.value;

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

  async function load(resource: ExplorationResource) {
    if (
      status.value === "ready"
      && activeResource.value?.id === resource.id
    ) {
      return inspectSchema();
    }
    status.value = "loading";
    error.value = null;
    schema.value = null;
    preview.value = [];
    activeView.value = null;
    activeResource.value = resource;

    try {
      await resetDatabase();
      const connection = await getConnection(resource.parquetUrl);
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
      status.value = "ready";
      return result;
    } catch (reason) {
      await resetDatabase();
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
    verifiedQueries.add(readOnlySql);
    latestVerifiedQuery = readOnlySql;

    return {
      columns: table.schema.fields.map(field => field.name),
      rows,
      rowCount: rows.length,
      truncated,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }

  async function applyExplorerView(
    sql: string,
    title: string,
  ): Promise<ExplorerViewResult> {
    const connection = await getConnection();
    const readOnlySql = validateReadOnlySql(sql);
    if (!verifiedQueries.has(readOnlySql)) {
      throw new Error(
        "Cette requête doit être exécutée avec succès avant d’être appliquée au tableau.",
      );
    }
    const startedAt = performance.now();
    const [table, countTable] = await Promise.all([
      connection.query(`
        SELECT *
        FROM (${readOnlySql}) AS explorer_view
        LIMIT 101
      `),
      connection.query(`
        SELECT COUNT(*) AS count
        FROM (${readOnlySql}) AS explorer_view_count
      `),
    ]);
    const allRows = tableToRows(table);
    const columns = table.schema.fields.map(field => field.name);
    const result: ExplorerViewResult = {
      title,
      sql: readOnlySql,
      columns,
      rows: allRows.slice(0, 100),
      rowCount: Number(tableToRows(countTable)[0]?.count ?? 0),
      truncated: allRows.length > 100,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
    activeView.value = result;
    return result;
  }

  async function createChartData(
    requiredFields: string[],
  ): Promise<DatasetQueryResult> {
    const connection = await getConnection();
    if (!latestVerifiedQuery) {
      throw new Error(
        "Les données du graphique doivent être vérifiées par une requête SQL préalable.",
      );
    }
    const readOnlySql = latestVerifiedQuery;

    const startedAt = performance.now();
    const table = await connection.query(`
      SELECT *
      FROM (${readOnlySql}) AS chart_data
      LIMIT 1001
    `);
    const columns = table.schema.fields.map(field => field.name);
    const missingFields = requiredFields.filter(
      field => !columns.includes(field),
    );
    if (missingFields.length > 0) {
      throw new Error(
        `Champs absents du résultat SQL : ${missingFields.join(", ")}.`,
      );
    }

    const allRows = tableToRows(table);
    return {
      columns,
      rows: allRows.slice(0, 1000),
      rowCount: allRows.length > 1000 ? 1000 : allRows.length,
      truncated: allRows.length > 1000,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }

  async function createMapData(
    requiredFields: string[],
  ): Promise<DatasetQueryResult> {
    const connection = await getConnection();
    if (!latestVerifiedQuery) {
      throw new Error(
        "Les données de la carte doivent être vérifiées par une requête SQL préalable.",
      );
    }

    const startedAt = performance.now();
    const table = await connection.query(`
      SELECT *
      FROM (${latestVerifiedQuery}) AS map_data
      LIMIT 5001
    `);
    const columns = table.schema.fields.map(field => field.name);
    const missingFields = requiredFields.filter(
      field => !columns.includes(field),
    );
    if (missingFields.length > 0) {
      throw new Error(
        `Champs absents du résultat SQL : ${missingFields.join(", ")}.`,
      );
    }

    const allRows = tableToRows(table);
    return {
      columns,
      rows: allRows.slice(0, 5000),
      rowCount: Math.min(allRows.length, 5000),
      truncated: allRows.length > 5000,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }

  function resetExplorerView() {
    activeView.value = null;
  }

  return {
    activeResource: readonly(activeResource),
    activeView: readonly(activeView),
    applyExplorerView,
    createChartData,
    createMapData,
    error: readonly(error),
    executeSql,
    inspectSchema,
    load,
    preview: readonly(preview),
    resetExplorerView,
    schema: readonly(schema),
    status: readonly(status),
  };
}
