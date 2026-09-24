import type { ChartSpec, DatasetRow, MapBasemap, MapSpec } from "./exploration";

export type DashboardVisualizationKind = "chart" | "map" | "indicator";
export type DashboardVisualizationSize = "small" | "medium" | "large";
export type DashboardSemanticType = "category" | "number" | "date" | "datetime" | "geography" | "latitude" | "longitude" | "text" | "boolean" | "unknown";
export type DashboardFieldRole = "dimension" | "measure" | "label" | "value" | "latitude" | "longitude" | "geometry" | "time";
export type DashboardFilterOperator =
  | "equals" | "notEquals" | "contains" | "startsWith" | "endsWith"
  | "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual"
  | "between" | "isEmpty" | "isNotEmpty";

export interface DashboardFieldBinding {
  field: string;
  role: DashboardFieldRole;
  semanticType: DashboardSemanticType;
  label?: string;
  unit?: string;
}

export interface DashboardVisualizationFilter {
  id: string;
  column: string;
  operator: DashboardFilterOperator;
  value: string;
  secondValue?: string;
  semanticType?: DashboardSemanticType;
  caseSensitive?: boolean;
}

export interface DashboardChartAppearance {
  orientation: "horizontal" | "vertical";
  palette: string[];
  showLegend: boolean;
  showValues: boolean;
}

export interface DashboardMapAppearance {
  basemap: MapBasemap;
  fillPalette: [string, string];
  fillOpacity: number;
  showLegend: boolean;
}

export interface DashboardIndicatorSpec {
  type: "number";
  title: string;
  description: string;
  valueField: string;
  unit?: string;
}

interface DashboardVisualizationBase {
  version: 1;
  title: string;
  description: string;
  size: DashboardVisualizationSize;
  data: {
    resourceId: string;
    datasetReference?: string;
    resourceName?: string;
    resourceUrl?: string;
    engine: "duckdb-sql";
    query: string;
  };
  filters: DashboardVisualizationFilter[];
  fields?: DashboardFieldBinding[];
}

export type DashboardVisualizationDefinition =
  | DashboardVisualizationBase & {
      kind: "chart";
      specification: ChartSpec;
      appearance: DashboardChartAppearance;
    }
  | DashboardVisualizationBase & {
      kind: "map";
      specification: MapSpec;
      appearance: DashboardMapAppearance;
    }
  | DashboardVisualizationBase & {
      kind: "indicator";
      specification: DashboardIndicatorSpec;
      appearance: Record<string, never>;
    };

export interface DashboardVisualizationValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DashboardVisualizationState {
  draft: DashboardVisualizationDefinition;
  saved: DashboardVisualizationDefinition | null;
  dirty: boolean;
  revision: number;
  savedAt?: string;
}

function requiredFields(definition: DashboardVisualizationDefinition) {
  if (definition.kind === "chart") {
    return [
      definition.specification.xField,
      ...definition.specification.series.map(series => series.field),
    ];
  }
  if (definition.kind === "indicator") return [definition.specification.valueField];
  if (definition.specification.type === "points") {
    return [
      definition.specification.latitudeField,
      definition.specification.longitudeField,
      definition.specification.labelField,
      definition.specification.valueField,
    ].filter((field): field is string => Boolean(field));
  }
  if (definition.specification.type === "geojson") {
    return [
      definition.specification.geojsonField,
      definition.specification.labelField,
      definition.specification.valueField,
    ].filter((field): field is string => Boolean(field));
  }
  return [
    definition.specification.dataKey,
    definition.specification.valueField,
    definition.specification.labelField,
  ].filter((field): field is string => Boolean(field));
}

export function validateDashboardVisualization(
  definition: DashboardVisualizationDefinition,
  rows: DatasetRow[],
): DashboardVisualizationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const query = definition.data.query.trim();

  if (!definition.data.resourceId) errors.push("La source de données est absente.");
  if (!query) errors.push("La requête SQL est absente.");
  else if (!/^(select|with)\b/i.test(query)) errors.push("La requête doit commencer par SELECT ou WITH.");
  if (!definition.title.trim()) errors.push("Le titre est requis.");
  if (!rows.length) errors.push("La requête ne retourne aucune donnée.");

  const columns = new Set(rows.flatMap(row => Object.keys(row)));
  for (const field of requiredFields(definition)) {
    if (!columns.has(field)) errors.push(`Le champ « ${field} » est absent du résultat SQL.`);
  }

  if (definition.kind === "chart" && !definition.specification.series.length) {
    errors.push("Le graphique doit comporter au moins une série.");
  }
  if (rows.length > 5000) warnings.push("Le résultat contient plus de 5 000 lignes et peut être difficile à lire.");
  if (definition.kind === "chart" && definition.specification.type === "pie" && rows.length > 12) {
    warnings.push("Un graphique en anneau devient difficile à lire au-delà de 12 catégories.");
  }

  return { valid: errors.length === 0, errors, warnings };
}
