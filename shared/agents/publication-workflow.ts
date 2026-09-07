export const publicationStageIds = [
  "identity", "description", "short-description", "keywords",
  "license", "temporal", "spatial", "complete",
] as const;

export type PublicationStageId = typeof publicationStageIds[number];

export const publicationWorkflow = {
  identity: { label: "Titre et acronyme", tool: "suggest_identity", fields: ["title", "acronym"], next: "description" },
  description: { label: "Description", tool: "suggest_descriptions", fields: ["description"], next: "short-description" },
  "short-description": { label: "Description courte", tool: "suggest_descriptions", fields: ["shortDescription"], next: "keywords" },
  keywords: { label: "Mots-clés", tool: "suggest_keywords", fields: ["tags"], next: "license" },
  license: { label: "Licence", tool: "suggest_license", fields: ["license"], next: "temporal" },
  temporal: { label: "Temps", tool: "suggest_temporal_metadata", fields: ["frequency", "temporalStart", "temporalEnd"], next: "spatial" },
  spatial: { label: "Espace", tool: "suggest_spatial_metadata", fields: ["spatialCoverage", "spatialGranularity"], next: "complete" },
  complete: { label: "Métadonnées proposées", tool: null, fields: [], next: null },
} as const satisfies Record<PublicationStageId, {
  label: string;
  tool: string | null;
  fields: readonly string[];
  next: PublicationStageId | null;
}>;

export function nextPublicationStage(stage: PublicationStageId) {
  return publicationWorkflow[stage].next;
}
