import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
} from "@duckdb/duckdb-wasm";
import type {
  DatasetQueryResult,
  DatasetRow,
  DatasetSchemaResult,
  DatasetValue,
  ExplorerDatasetQuery,
  ExplorerDatasetResult,
  ExplorerValueOption,
  ExplorerViewPreview,
  ExplorerViewResult,
  MapDatasetResult,
  MapSpec,
} from "~~/shared/types/exploration";
import type {
  ExplorationResource,
} from "~~/shared/data/exploration-resources";
import { validateReadOnlySql } from "~~/shared/sql/read-only";
import { resolveMapFields } from "~~/shared/maps/map-field-resolution";

type EngineStatus = "idle" | "loading" | "ready" | "error";

let databasePromise: Promise<AsyncDuckDB> | undefined;
let connectionPromise: Promise<AsyncDuckDBConnection> | undefined;
let activeWorker: Worker | undefined;
const verifiedQueries = new Set<string>();
const explorerViewPreviews = new Map<string, ExplorerViewPreview>();
let latestVerifiedQuery: string | undefined;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildExplorerWhere(query: ExplorerDatasetQuery) {
  const conditions: string[] = [];
  const search = query.search?.trim();

  if (search && query.columns.length > 0) {
    const pattern = quoteLiteral(`%${search}%`);
    conditions.push(`(${query.columns.map(column =>
      `CAST(${quoteIdentifier(column)} AS VARCHAR) ILIKE ${pattern}`,
    ).join(" OR ")})`);
  }

  for (const [column, values] of Object.entries(query.categoryFilters ?? {})) {
    if (values.length > 0) {
      conditions.push(`${quoteIdentifier(column)} IN (${values.map(quoteLiteral).join(", ")})`);
    }
  }

  for (const [column, range] of Object.entries(query.numberRanges ?? {})) {
    const min = Number(range.min);
    const max = Number(range.max);
    if (range.min?.trim() && Number.isFinite(min)) {
      conditions.push(`TRY_CAST(${quoteIdentifier(column)} AS DOUBLE) >= ${min}`);
    }
    if (range.max?.trim() && Number.isFinite(max)) {
      conditions.push(`TRY_CAST(${quoteIdentifier(column)} AS DOUBLE) <= ${max}`);
    }
  }

  for (const [column, filter] of Object.entries(query.dateFilters ?? {})) {
    const field = `TRY_CAST(${quoteIdentifier(column)} AS TIMESTAMP)`;
    if (filter.mode === "before" && filter.value) {
      conditions.push(`${field} < TRY_CAST(${quoteLiteral(filter.value)} AS TIMESTAMP)`);
    } else if (filter.mode === "after" && filter.value) {
      conditions.push(`${field} > TRY_CAST(${quoteLiteral(filter.value)} AS TIMESTAMP)`);
    } else if (filter.mode === "between") {
      if (filter.value) conditions.push(`${field} >= TRY_CAST(${quoteLiteral(filter.value)} AS TIMESTAMP)`);
      if (filter.endValue) conditions.push(`${field} <= TRY_CAST(${quoteLiteral(filter.endValue)} AS TIMESTAMP)`);
    }
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

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

async function createDatabaseFromFile(file: File) {
  const [
    duckdb,
    { default: duckdbMvpWasm },
    { default: duckdbMvpWorker },
  ] = await Promise.all([
    import("@duckdb/duckdb-wasm"),
    import("@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"),
    import("@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"),
  ]);
  const worker = new Worker(duckdbMvpWorker);
  activeWorker = worker;
  const database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await database.instantiate(duckdbMvpWasm);
  const extension = file.name.split(".").pop()?.toLocaleLowerCase() ?? "";
  const registeredName = extension === "parquet" ? "upload.parquet" : "upload.csv";
  await database.registerFileBuffer(
    registeredName,
    new Uint8Array(await file.arrayBuffer()),
  );

  const connection = await database.connect();
  const reader = extension === "parquet"
    ? `read_parquet('${registeredName}')`
    : `read_csv_auto('${registeredName}', header = true, sample_size = -1)`;
  await connection.query(`CREATE OR REPLACE VIEW data AS SELECT * FROM ${reader}`);
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
  explorerViewPreviews.clear();
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

  async function loadFile(file: File, resource: ExplorationResource) {
    status.value = "loading";
    error.value = null;
    schema.value = null;
    preview.value = [];
    activeView.value = null;
    activeResource.value = resource;

    try {
      await resetDatabase();
      databasePromise = createDatabaseFromFile(file);
      await databasePromise;
      const result = await inspectSchema();
      status.value = "ready";
      return result;
    } catch (reason) {
      await resetDatabase();
      status.value = "error";
      error.value = reason instanceof Error ? reason.message : "Impossible de lire le fichier local.";
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
    if (!verifiedQueries.has(readOnlySql) && !explorerViewPreviews.has(readOnlySql)) {
      throw new Error(
        "Cette vue doit être prévisualisée avec succès avant d’être appliquée au tableau.",
      );
    }
    const startedAt = performance.now();
    const preview = explorerViewPreviews.get(readOnlySql);
    const tablePromise = connection.query(`
      SELECT *
      FROM (${readOnlySql}) AS explorer_view
      LIMIT 101
    `);
    const [table, countTable] = await Promise.all([
      tablePromise,
      preview
        ? Promise.resolve(undefined)
        : connection.query(`
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
      rowCount: preview?.rowCount
        ?? Number(countTable ? tableToRows(countTable)[0]?.count ?? 0 : 0),
      truncated: allRows.length > 100,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
    activeView.value = result;
    return result;
  }

  async function previewExplorerView(sql: string): Promise<ExplorerViewPreview> {
    const connection = await getConnection();
    const readOnlySql = validateReadOnlySql(sql);
    const cached = explorerViewPreviews.get(readOnlySql);
    if (cached) return cached;

    const [emptyTable, countTable] = await Promise.all([
      connection.query(`
        SELECT *
        FROM (${readOnlySql}) AS explorer_view_preview
        LIMIT 0
      `),
      connection.query(`
        SELECT COUNT(*) AS count
        FROM (${readOnlySql}) AS explorer_view_count
      `),
    ]);
    const columns = emptyTable.schema.fields.map(field => field.name);
    const initialColumns = schema.value?.columns.map(column => column.name) ?? [];
    const result: ExplorerViewPreview = {
      columns,
      rowCount: Number(tableToRows(countTable)[0]?.count ?? 0),
      preservesColumns: columns.length === initialColumns.length
        && columns.every((column, index) => column === initialColumns[index]),
    };
    explorerViewPreviews.set(readOnlySql, result);
    verifiedQueries.add(readOnlySql);
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
    spec: MapSpec,
  ): Promise<MapDatasetResult> {
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
    const allRows = tableToRows(table);
    const resolution = resolveMapFields(spec, columns, allRows.slice(0, 5000));
    return {
      columns,
      rows: allRows.slice(0, 5000),
      rowCount: Math.min(allRows.length, 5000),
      truncated: allRows.length > 5000,
      elapsedMs: Math.round(performance.now() - startedAt),
      resolvedSpec: resolution.spec,
      fieldCorrections: resolution.corrections,
      warnings: resolution.warnings,
    };
  }

  async function queryExplorer(query: ExplorerDatasetQuery): Promise<ExplorerDatasetResult> {
    const connection = await getConnection();
    const limit = Math.min(200, Math.max(1, Math.floor(query.limit)));
    const offset = Math.max(0, Math.floor(query.offset));
    const columns = query.columns.length > 0 ? query.columns : ["*"];
    const source = query.baseSql?.trim()
      ? `(${validateReadOnlySql(query.baseSql)}) AS explorer_source`
      : "data";
    const select = columns[0] === "*" ? "*" : columns.map(quoteIdentifier).join(", ");
    const where = buildExplorerWhere(query);
    const order = query.sort
      ? `ORDER BY ${quoteIdentifier(query.sort.column)} ${query.sort.direction.toUpperCase()} NULLS LAST`
      : "";
    const [table, countTable] = await Promise.all([
      connection.query(`SELECT ${select} FROM ${source} ${where} ${order} LIMIT ${limit} OFFSET ${offset}`),
      connection.query(`SELECT COUNT(*) AS count FROM ${source} ${where}`),
    ]);
    return {
      columns: table.schema.fields.map(field => field.name),
      rows: tableToRows(table),
      totalRows: Number(tableToRows(countTable)[0]?.count ?? 0),
      limit,
      offset,
    };
  }

  async function getExplorerValueOptions(
    column: string,
    search = "",
    baseSql?: string,
  ): Promise<ExplorerValueOption[]> {
    const connection = await getConnection();
    const field = quoteIdentifier(column);
    const source = baseSql?.trim()
      ? `(${validateReadOnlySql(baseSql)}) AS explorer_source`
      : "data";
    const searchClause = search.trim()
      ? `AND CAST(${field} AS VARCHAR) ILIKE ${quoteLiteral(`%${search.trim()}%`)}`
      : "";
    const table = await connection.query(`
      SELECT CAST(${field} AS VARCHAR) AS value, COUNT(*) AS count
      FROM ${source}
      WHERE ${field} IS NOT NULL ${searchClause}
      GROUP BY value
      ORDER BY count DESC, value
      LIMIT 100
    `);
    return tableToRows(table).map(row => ({
      label: String(row.value),
      count: Number(row.count),
    }));
  }

  async function exportExplorerCsv(query: ExplorerDatasetQuery) {
    const connection = await getConnection();
    const database = await databasePromise;
    if (!database) throw new Error("Le moteur DuckDB n’est pas disponible.");
    const columns = query.columns.length > 0 ? query.columns : ["*"];
    const source = query.baseSql?.trim()
      ? `(${validateReadOnlySql(query.baseSql)}) AS explorer_source`
      : "data";
    const select = columns[0] === "*" ? "*" : columns.map(quoteIdentifier).join(", ");
    const where = buildExplorerWhere(query);
    const order = query.sort
      ? `ORDER BY ${quoteIdentifier(query.sort.column)} ${query.sort.direction.toUpperCase()} NULLS LAST`
      : "";
    const fileName = `explorer-${Date.now()}.csv`;
    try {
      await connection.query(`COPY (SELECT ${select} FROM ${source} ${where} ${order}) TO ${quoteLiteral(fileName)} (FORMAT CSV, HEADER)`);
      const bytes = await database.copyFileToBuffer(fileName);
      return new Blob([new Uint8Array(bytes)], { type: "text/csv;charset=utf-8" });
    } finally {
      try {
        await database.dropFile(fileName);
      } catch {
        // Le nettoyage du fichier temporaire reste sans effet sur le téléchargement.
      }
    }
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
    exportExplorerCsv,
    getExplorerValueOptions,
    inspectSchema,
    load,
    loadFile,
    preview: readonly(preview),
    previewExplorerView,
    queryExplorer,
    resetExplorerView,
    schema: readonly(schema),
    status: readonly(status),
  };
}
