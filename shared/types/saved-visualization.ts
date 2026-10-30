import type { DatasetRow } from "./exploration";
import type { DashboardVisualizationDefinition } from "./dashboard-visualization";

export const VISUALIZATION_LIBRARY_STORAGE_KEY = "datagouv-visualization-library-v1";
export const DASHBOARD_VISUALIZATION_HANDOFF_KEY = "datagouv-dashboard-visualization-handoff-v1";

export interface SavedVisualization {
  id: string;
  status: "draft" | "published";
  definition: DashboardVisualizationDefinition;
  resource: {
    id: string;
    datasetId: string;
    datasetReference?: string;
    title: string;
    resourceName: string;
    organization: string;
    parquetUrl: string;
  };
  rows: DatasetRow[];
  revision: number;
  savedAt: string;
}

export interface DashboardVisualizationHandoff {
  visualizationId: string;
  dashboardId: string;
  groupId: string;
  blockId?: string;
  requestedAt: string;
}

export function readVisualizationLibrary(storage: Pick<Storage, "getItem">): SavedVisualization[] {
  try {
    const serialized = storage.getItem(VISUALIZATION_LIBRARY_STORAGE_KEY);
    if (!serialized) return [];
    const parsed = JSON.parse(serialized) as unknown;
    return Array.isArray(parsed) ? parsed as SavedVisualization[] : [];
  }
  catch {
    return [];
  }
}

export function writeVisualizationLibrary(storage: Pick<Storage, "setItem">, records: SavedVisualization[]) {
  storage.setItem(VISUALIZATION_LIBRARY_STORAGE_KEY, JSON.stringify(records));
}
