import type { InferUITools, UIMessage } from "ai";
import type { explorationTools } from "../agents/exploration-tools";

export type ExplorationTools = InferUITools<typeof explorationTools>;

export type ExplorationMessage = UIMessage<
  {
    createdAt?: string;
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

