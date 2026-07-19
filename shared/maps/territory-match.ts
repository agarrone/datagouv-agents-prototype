export function normalizeTerritoryCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^\d$/.test(code) ? code.padStart(2, "0") : code;
}

export function normalizeTerritoryName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(?:fr[- ]?)?(?:2a|2b|\d{1,3})\s*[-–—_:]\s*/i, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
