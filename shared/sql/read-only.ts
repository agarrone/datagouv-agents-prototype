export function validateReadOnlySql(sql: string) {
  if (sql.length > 20_000) {
    throw new Error("La requête SQL est trop longue.");
  }

  const normalized = sql.trim().replace(/;+\s*$/, "");
  const withoutComments = normalized
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();

  // Les contrôles de capacités ne doivent pas interpréter le contenu des
  // chaînes comme du SQL (par exemple une recherche portant sur « read_csv »).
  const executableSql = withoutComments
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/\$\$[\s\S]*?\$\$/g, "$$$$");

  if (!/^(select|with)\b/i.test(withoutComments)) {
    throw new Error("Seules les requêtes SELECT ou WITH sont autorisées.");
  }
  if (executableSql.includes(";")) {
    throw new Error("Une seule requête SQL peut être exécutée à la fois.");
  }
  if (
    /\b(insert|update|delete|drop|alter|create|copy|attach|detach|install|load|call|pragma)\b/i
      .test(executableSql)
  ) {
    throw new Error("La requête contient une instruction non autorisée.");
  }

  // DuckDB expose des fonctions de table capables de lire le réseau, des
  // fichiers ou d'autres moteurs, même à l'intérieur d'un SELECT. On bloque
  // uniquement ces capacités : les CTE, fenêtres, agrégations, UNNEST et
  // fonctions analytiques ordinaires restent disponibles.
  if (
    /\b(?:read_[a-z0-9_]+|[a-z0-9_]+_scan|st_read|glob|query|query_table|getvariable|pragma_[a-z0-9_]+)\s*\(/i
      .test(executableSql)
  ) {
    throw new Error("La requête ne peut pas lire une source externe. Utilisez uniquement la table data.");
  }

  if (/\b(?:information_schema|pg_catalog|duckdb_[a-z0-9_]*)\b/i.test(executableSql)) {
    throw new Error("Les tables système de DuckDB ne sont pas accessibles.");
  }

  return normalized;
}
