import type { DatasetRow } from "./exploration";
import type { DashboardVisualizationDefinition } from "./dashboard-visualization";

export interface DashboardPageDefinition {
  title: string;
  heading: string;
  description: string;
}

export interface DashboardGroupDefinition {
  id: string;
  title: string;
  description: string;
  filters: Array<{ id: string; label: string; column: string; value: string; options: string[] }>;
}

export interface DashboardBlockPlacement {
  id: string;
  kind: "text" | "chart" | "map" | "indicator";
  groupId: string;
}

export interface DashboardVisualizationRecord {
  id: string;
  definition: DashboardVisualizationDefinition;
  resource: { id: string; title: string; organization: string };
  rows: DatasetRow[];
  revision: number;
  savedAt: string;
}

export interface DashboardDocument {
  version: 2;
  id: string;
  page: DashboardPageDefinition;
  groups: DashboardGroupDefinition[];
  layout: DashboardBlockPlacement[];
  visualizations: DashboardVisualizationRecord[];
  textBlocks: Array<{ id: string; title: string; content: string; size: "small" | "medium" | "large" }>;
  updatedAt: string;
}
