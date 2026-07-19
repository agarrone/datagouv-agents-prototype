export function validateReadOnlySql(sql: string) {
  const normalized = sql.trim().replace(/;+\s*$/, "");
  const withoutComments = normalized
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();

  if (!/^(select|with)\b/i.test(withoutComments)) {
    throw new Error("Seules les requêtes SELECT ou WITH sont autorisées.");
  }
  if (withoutComments.includes(";")) {
    throw new Error("Une seule requête SQL peut être exécutée à la fois.");
  }
  if (
    /\b(insert|update|delete|drop|alter|create|copy|attach|detach|install|load|call|pragma)\b/i
      .test(withoutComments)
  ) {
    throw new Error("La requête contient une instruction non autorisée.");
  }

  return normalized;
}
