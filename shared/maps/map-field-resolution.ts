import type {
  DatasetRow,
  DatasetValue,
  MapFieldCorrection,
  MapSpec,
} from "../types/exploration";

type FieldRole = MapFieldCorrection["role"];

export interface MapFieldResolution {
  spec: MapSpec;
  corrections: MapFieldCorrection[];
  warnings: string[];
}

function normalizeFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fieldTokens(value: string) {
  return normalizeFieldName(value).split(" ").filter(Boolean);
}

function numericValue(value: DatasetValue | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
}

function hasValues(
  rows: DatasetRow[],
  field: string,
  validate: (value: DatasetValue) => boolean = value => value !== null && String(value).trim() !== "",
) {
  const values = rows
    .map(row => row[field])
    .filter((value): value is DatasetValue => value !== null && value !== undefined)
    .slice(0, 40);
  return values.length > 0 && values.some(validate);
}

function looksLikeGeoJson(value: DatasetValue) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Boolean(
      parsed
      && typeof parsed === "object"
      && "type" in parsed
      && (
        "coordinates" in parsed
        || (parsed.type === "Feature" && "geometry" in parsed)
      ),
    );
  } catch {
    return false;
  }
}

function semanticCandidates(
  role: FieldRole,
  columns: string[],
  rows: DatasetRow[],
  boundary?: "france-regions" | "france-departments",
) {
  return columns.filter((column) => {
    const tokens = fieldTokens(column);
    const compact = tokens.join("");
    if (role === "latitude") {
      return (tokens.includes("latitude") || tokens.includes("lat"))
        && hasValues(rows, column, value => {
          const number = numericValue(value);
          return number !== undefined && number >= -90 && number <= 90;
        });
    }
    if (role === "longitude") {
      return (tokens.includes("longitude") || tokens.includes("lon") || tokens.includes("lng") || tokens.includes("long"))
        && hasValues(rows, column, value => {
          const number = numericValue(value);
          return number !== undefined && number >= -180 && number <= 180;
        });
    }
    if (role === "geometry") {
      return (tokens.includes("geojson") || tokens.includes("geometry") || tokens.includes("geometrie") || tokens.includes("geom"))
        && hasValues(rows, column, looksLikeGeoJson);
    }
    if (role === "label") {
      return tokens.some(token => ["label", "libelle", "name", "nom", "title", "titre"].includes(token))
        && hasValues(rows, column);
    }
    if (role === "territory") {
      const territoryTokens = boundary === "france-regions"
        ? ["region", "regions", "reg"]
        : ["departement", "departements", "department", "departments", "dept", "dep"];
      return (
        tokens.some(token => territoryTokens.includes(token))
        || territoryTokens.some(token => compact.includes(token))
      ) && hasValues(rows, column);
    }
    return hasValues(rows, column, value => numericValue(value) !== undefined);
  });
}

function resolveRequiredField(options: {
  requested: string;
  role: FieldRole;
  columns: string[];
  rows: DatasetRow[];
  excluded?: string[];
  boundary?: "france-regions" | "france-departments";
}) {
  const { requested, role, rows, boundary } = options;
  const columns = options.columns.filter(column => !options.excluded?.includes(column));
  if (columns.includes(requested)) return requested;

  const normalizedRequested = normalizeFieldName(requested);
  const normalizedMatches = columns.filter(
    column => normalizeFieldName(column) === normalizedRequested,
  );
  if (normalizedMatches.length === 1) return normalizedMatches[0]!;

  const candidates = semanticCandidates(role, columns, rows, boundary);
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    throw new Error(
      `Le champ « ${requested} » est absent et plusieurs colonnes pourraient le remplacer : ${candidates.join(", ")}. Une précision est nécessaire.`,
    );
  }
  throw new Error(
    `Le champ « ${requested} » est absent du résultat SQL. Colonnes disponibles : ${columns.join(", ")}.`,
  );
}

function correction(
  corrections: MapFieldCorrection[],
  role: FieldRole,
  requested: string,
  resolved: string,
) {
  if (requested !== resolved) corrections.push({ role, from: requested, to: resolved });
}

function resolveOptionalField(options: Parameters<typeof resolveRequiredField>[0]) {
  try {
    return resolveRequiredField(options);
  } catch (reason) {
    if (reason instanceof Error && reason.message.includes("plusieurs colonnes")) {
      throw reason;
    }
    return undefined;
  }
}

export function resolveMapFields(
  spec: MapSpec,
  columns: string[],
  rows: DatasetRow[],
): MapFieldResolution {
  const corrections: MapFieldCorrection[] = [];
  const warnings: string[] = [];

  if (spec.type === "points") {
    const latitudeField = resolveRequiredField({
      requested: spec.latitudeField,
      role: "latitude",
      columns,
      rows,
    });
    const longitudeField = resolveRequiredField({
      requested: spec.longitudeField,
      role: "longitude",
      columns,
      rows,
      excluded: [latitudeField],
    });
    const labelField = resolveRequiredField({
      requested: spec.labelField,
      role: "label",
      columns,
      rows,
      excluded: [latitudeField, longitudeField],
    });
    const valueField = spec.valueField
      ? resolveOptionalField({
          requested: spec.valueField,
          role: "value",
          columns,
          rows,
          excluded: [latitudeField, longitudeField, labelField],
        })
      : undefined;
    correction(corrections, "latitude", spec.latitudeField, latitudeField);
    correction(corrections, "longitude", spec.longitudeField, longitudeField);
    correction(corrections, "label", spec.labelField, labelField);
    if (spec.valueField && valueField) correction(corrections, "value", spec.valueField, valueField);
    if (spec.valueField && !valueField) {
      warnings.push(`La mesure « ${spec.valueField} » n’a pas été trouvée ; les points utilisent une taille uniforme.`);
    }
    return {
      spec: { ...spec, latitudeField, longitudeField, labelField, valueField },
      corrections,
      warnings,
    };
  }

  if (spec.type === "geojson") {
    const geojsonField = resolveRequiredField({
      requested: spec.geojsonField,
      role: "geometry",
      columns,
      rows,
    });
    const labelField = resolveRequiredField({
      requested: spec.labelField,
      role: "label",
      columns,
      rows,
      excluded: [geojsonField],
    });
    const valueField = spec.valueField
      ? resolveOptionalField({
          requested: spec.valueField,
          role: "value",
          columns,
          rows,
          excluded: [geojsonField, labelField],
        })
      : undefined;
    correction(corrections, "geometry", spec.geojsonField, geojsonField);
    correction(corrections, "label", spec.labelField, labelField);
    if (spec.valueField && valueField) correction(corrections, "value", spec.valueField, valueField);
    if (spec.valueField && !valueField) {
      warnings.push(`La mesure « ${spec.valueField} » n’a pas été trouvée ; les géométries utilisent un style uniforme.`);
    }
    return {
      spec: { ...spec, geojsonField, labelField, valueField },
      corrections,
      warnings,
    };
  }

  const dataKey = resolveRequiredField({
    requested: spec.dataKey,
    role: "territory",
    columns,
    rows,
    boundary: spec.boundary,
  });
  const valueField = resolveRequiredField({
    requested: spec.valueField,
    role: "value",
    columns,
    rows,
    excluded: [dataKey],
  });
  const labelField = spec.labelField
    ? resolveOptionalField({
        requested: spec.labelField,
        role: "label",
        columns,
        rows,
        excluded: [dataKey, valueField],
      })
    : undefined;
  correction(corrections, "territory", spec.dataKey, dataKey);
  correction(corrections, "value", spec.valueField, valueField);
  if (spec.labelField && labelField) correction(corrections, "label", spec.labelField, labelField);
  if (spec.labelField && !labelField) {
    warnings.push(`Le libellé « ${spec.labelField} » n’a pas été trouvé ; le nom officiel du territoire sera utilisé.`);
  }
  return {
    spec: { ...spec, dataKey, valueField, labelField },
    corrections,
    warnings,
  };
}
