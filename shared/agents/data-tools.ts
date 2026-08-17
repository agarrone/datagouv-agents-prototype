import { tool } from "ai";
import { z } from "zod";

const datasetValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const datasetRowSchema = z.record(z.string(), datasetValueSchema);

export const datasetMetadataOutputSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  organization: z.string(),
  license: z.string(),
  page: z.string(),
  lastUpdate: z.string().nullable(),
  qualityScore: z.number().nullable(),
  resources: z.array(z.object({
    id: z.string(),
    title: z.string(),
    format: z.string(),
    url: z.string().nullable(),
    parquetUrl: z.string().nullable(),
  })),
});

/**
 * Capacités de lecture génériques, partageables par tous les agents qui
 * travaillent sur une ressource data.gouv.fr. Leur exécution reste fournie par
 * le runtime du parcours concerné (exploration, publication, etc.).
 */
export const dataTools = {
  get_dataset_metadata: tool({
    description:
      "Récupère les métadonnées publiques du jeu de données actif sur data.gouv.fr : description, producteur, licence, mise à jour, qualité et liste des ressources. Ne pas l’utiliser pour interroger les valeurs du fichier.",
    inputSchema: z.object({}),
    outputSchema: datasetMetadataOutputSchema,
  }),
  inspect_schema: tool({
    description:
      "Inspecte la ressource tabulaire active : nombre de lignes, colonnes, types et échantillon. Réutiliser le schéma déjà présent dans le contexte avant d’appeler ce tool.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      table: z.literal("data"),
      rowCount: z.number(),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
      })),
      sample: z.array(datasetRowSchema),
    }),
  }),
};

export { datasetRowSchema, datasetValueSchema };
