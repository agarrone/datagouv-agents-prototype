import { explorerPrompt } from "./explorer";
import { identityPrompt } from "./identity";
import { responsePrompt } from "./response";
import { routingPrompt } from "./routing";
import { sqlPrompt } from "./sql";
import { visualizationsPrompt } from "./visualizations";

export interface ExplorationPromptContext {
  datasetId: string;
  organization: string;
  resourceId: string;
  resourceName: string;
  title: string;
  schema?: {
    rowCount: number;
    columns: Array<{ name: string; type: string }>;
  };
}

export const explorationPromptSections = [
  identityPrompt,
  routingPrompt,
  sqlPrompt,
  explorerPrompt,
  visualizationsPrompt,
  responsePrompt,
] as const;

export function buildExplorationInstructions(
  context: ExplorationPromptContext,
) {
  return `${explorationPromptSections.join("\n\n")}

Contexte actif fourni par l’interface :
- jeu de données : ${context.title}
- producteur : ${context.organization}
- référence data.gouv.fr : ${context.datasetId}
- ressource : ${context.resourceName}
- identifiant de ressource : ${context.resourceId}
- table locale : data
${context.schema
    ? `- schéma déjà chargé : ${context.schema.rowCount} lignes ; colonnes : ${context.schema.columns.map(column => `${column.name} (${column.type})`).join(", ")}`
    : "- schéma déjà chargé : non"}`;
}
