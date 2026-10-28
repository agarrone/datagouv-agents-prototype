/**
 * Nettoie les caractères invisibles qui se glissent parfois dans les en-têtes
 * de fichiers publics (BOM UTF-8, contrôles, espaces insécables, etc.).
 */
export function normalizeColumnName(name: string) {
  const normalized = name
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return normalized || "Colonne";
}

/**
 * DuckDB traite les identifiants sans tenir compte de la casse. Les suffixes
 * garantissent donc que deux en-têtes nettoyés de la même manière restent
 * interrogeables sans ambiguïté.
 */
export function normalizeColumnNames(names: string[]) {
  const usedNames = new Set<string>();

  return names.map((name) => {
    const baseName = normalizeColumnName(name);
    let candidate = baseName;
    let suffix = 2;

    while (usedNames.has(candidate.toLocaleLowerCase("fr"))) {
      candidate = `${baseName} (${suffix})`;
      suffix += 1;
    }

    usedNames.add(candidate.toLocaleLowerCase("fr"));
    return candidate;
  });
}
