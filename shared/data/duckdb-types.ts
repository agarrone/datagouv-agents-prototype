export function humanizeDuckDbType(type: string) {
  const normalized = type.trim().toUpperCase();

  if (normalized.endsWith("[]") || normalized.startsWith("LIST(") || normalized.startsWith("ARRAY(")) return "liste";
  if (normalized.startsWith("STRUCT(") || normalized.startsWith("MAP(") || normalized.startsWith("UNION(")) return "objet structuré";
  if (/^(VARCHAR|CHAR|BPCHAR|TEXT|STRING|UUID|ENUM)/.test(normalized)) return "texte";
  if (/^(TINYINT|SMALLINT|INTEGER|INT|BIGINT|HUGEINT|UTINYINT|USMALLINT|UINTEGER|UBIGINT)/.test(normalized)) return "nombre entier";
  if (/^(DECIMAL|NUMERIC|REAL|FLOAT|DOUBLE)/.test(normalized)) return "nombre décimal";
  if (normalized === "BOOLEAN" || normalized === "BOOL") return "oui / non";
  if (normalized === "DATE") return "date";
  if (normalized.startsWith("TIMESTAMP") || normalized === "DATETIME") return "date et heure";
  if (normalized.startsWith("TIME")) return "heure";
  if (normalized.startsWith("INTERVAL")) return "durée";
  if (/^(BLOB|BIT|VARINT)/.test(normalized)) return "donnée technique";

  return "valeur";
}
