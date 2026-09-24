import { explorationTools } from "./exploration-tools";

/**
 * Contrat de tools propre au constructeur de tableaux de bord.
 *
 * Les capacités de lecture et de calcul restent partagées avec l'exploration
 * afin de ne pas dupliquer les contrats. Leur orchestration, leur prompt et leur
 * endpoint sont en revanche propres au tableau de bord.
 */
export const dashboardTools = {
  get_dataset_metadata: explorationTools.get_dataset_metadata,
  inspect_schema: explorationTools.inspect_schema,
  request_clarification: explorationTools.request_clarification,
  execute_sql: explorationTools.execute_sql,
  create_chart: explorationTools.create_chart,
  create_map: explorationTools.create_map,
};
