import type { InferUITools, LanguageModelUsage, UIMessage } from "ai";
import type { explorationTools } from "../agents/exploration-tools";

export type ExplorationTools = InferUITools<typeof explorationTools>;

export type ExplorationMessage = UIMessage<
  {
    createdAt?: string;
    totalUsage?: LanguageModelUsage;
  },
  never,
  ExplorationTools
>;

export interface DatasetColumn {
  name: string;
  type: string;
}

export type DatasetValue = string | number | boolean | null;
export type DatasetRow = Record<string, DatasetValue>;

export interface DatasetSchemaResult {
  table: "data";
  rowCount: number;
  columns: DatasetColumn[];
  sample: DatasetRow[];
}

export interface DatasetQueryResult {
  columns: string[];
  rows: DatasetRow[];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
}

export interface ExplorerViewResult extends DatasetQueryResult {
  title: string;
  sql: string;
}

export type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

export interface ChartSeriesSpec {
  field: string;
  label: string;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  description: string;
  xField: string;
  xLabel: string;
  series: ChartSeriesSpec[];
}

export type MapSpec =
  | {
      type: "points";
      title: string;
      description: string;
      latitudeField: string;
      longitudeField: string;
      labelField: string;
      valueField?: string;
      valueLabel?: string;
    }
  | {
      type: "geojson";
      title: string;
      description: string;
      geojsonField: string;
      labelField: string;
      valueField?: string;
      valueLabel?: string;
    }
  | {
      type: "choropleth";
      title: string;
      description: string;
      boundary: "france-regions" | "france-departments";
      dataKey: string;
      valueField: string;
      labelField?: string;
      valueLabel: string;
    };
