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

export const explorationTools = {
  get_dataset_metadata: tool({
    description:
      "Récupère les métadonnées publiques du jeu de données actif sur data.gouv.fr : description, producteur, licence, mise à jour, qualité et liste des ressources. Ne pas l’utiliser pour interroger les valeurs du fichier.",
    inputSchema: z.object({}),
    outputSchema: datasetMetadataOutputSchema,
  }),
  inspect_schema: tool({
    description:
      "Inspecte la table data chargée dans le navigateur. Utiliser ce tool avant d’écrire une requête lorsque le schéma n’est pas déjà présent dans la conversation.",
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
  execute_sql: tool({
    description:
      "Exécute une unique requête SQL DuckDB en lecture seule sur la table data. Les résultats sont limités et renvoyés au modèle.",
    inputSchema: z.object({
      sql: z
        .string()
        .min(1)
        .describe("Requête DuckDB commençant par SELECT ou WITH."),
      purpose: z
        .string()
        .min(1)
        .describe("Description courte de ce que la requête vérifie."),
    }),
    outputSchema: z.object({
      columns: z.array(z.string()),
      rows: z.array(datasetRowSchema),
      rowCount: z.number(),
      truncated: z.boolean(),
      elapsedMs: z.number(),
    }),
  }),
  propose_explorer_view: tool({
    description:
      "Affiche dans l’interface une carte proposant d’appliquer au tableau une requête SQL déjà vérifiée. L’appel ne modifie rien : la carte contient elle-même le bouton de confirmation. Lorsque l’intention d’affichage est claire, appeler directement ce tool sans demander de confirmation dans le texte.",
    inputSchema: z.object({
      sql: z
        .string()
        .min(1)
        .describe("Requête DuckDB en lecture seule déjà vérifiée."),
      title: z
        .string()
        .min(1)
        .describe("Titre court décrivant la vue proposée."),
      reason: z
        .string()
        .min(1)
        .describe("Explication concise de l’intérêt de cette vue."),
    }),
    outputSchema: z.object({
      applied: z.boolean(),
      title: z.string(),
      rowCount: z.number(),
      columns: z.array(z.string()),
      truncated: z.boolean(),
    }),
  }),
};
