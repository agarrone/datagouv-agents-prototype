import { tool } from "ai";
import { z } from "zod";

const datasetValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const datasetRowSchema = z.record(z.string(), datasetValueSchema);

export const mapSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("points"),
    title: z.string().min(1),
    description: z.string().min(1),
    latitudeField: z.string().min(1),
    longitudeField: z.string().min(1),
    labelField: z.string().min(1),
    valueField: z.string().min(1).optional(),
    valueLabel: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("geojson"),
    title: z.string().min(1),
    description: z.string().min(1),
    geojsonField: z.string().min(1),
    labelField: z.string().min(1),
    valueField: z.string().min(1).optional(),
    valueLabel: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("choropleth"),
    title: z.string().min(1),
    description: z.string().min(1),
    boundary: z.enum(["france-regions", "france-departments"]),
    dataKey: z.string().min(1),
    valueField: z.string().min(1),
    labelField: z.string().min(1).optional(),
    valueLabel: z.string().min(1),
  }),
]);

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
  request_clarification: tool({
    description:
      "Suspend l’analyse pour demander une précision indispensable à l’utilisateur. Utiliser uniquement lorsque plusieurs interprétations plausibles changeraient réellement le résultat. L’interface affiche les choix sous forme de suggestions cliquables.",
    inputSchema: z.object({
      question: z
        .string()
        .min(1)
        .describe("Question courte et autonome adressée à l’utilisateur."),
      choices: z
        .array(z.string().min(1).max(80))
        .min(2)
        .max(4)
        .describe("Choix courts, distincts et compréhensibles sans contexte technique."),
    }),
    outputSchema: z.object({
      choice: z.string().min(1),
    }),
  }),
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
      "Affiche dans l’interface une carte proposant d’appliquer au tableau une requête SQL en lecture seule. L’interface prévisualise et vérifie cette requête avant d’activer la confirmation. L’appel ne modifie rien : la carte contient elle-même le bouton de confirmation. Lorsque l’intention d’affichage est claire, appeler directement ce tool sans demander de confirmation dans le texte.",
    inputSchema: z.object({
      sql: z
        .string()
        .min(1)
        .describe("Requête DuckDB en lecture seule à prévisualiser puis appliquer."),
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
  create_chart: tool({
    description:
      "Affiche réellement un graphique ECharts dans la conversation à partir du résultat de la dernière requête execute_sql réussie. Pour créer un graphique, appeler impérativement ce tool juste après execute_sql : ne jamais recopier la requête SQL ni écrire la spécification en JSON ou dans un bloc de code.",
    inputSchema: z.object({
      type: z.enum(["bar", "line", "area", "pie", "scatter"]),
      title: z.string().min(1),
      description: z.string().min(1),
      xField: z
        .string()
        .min(1)
        .describe("Champ des catégories, dates ou valeurs en abscisse."),
      xLabel: z.string().min(1),
      series: z
        .array(z.object({
          field: z.string().min(1),
          label: z.string().min(1),
        }))
        .min(1)
        .max(4),
    }),
    outputSchema: z.object({
      columns: z.array(z.string()),
      rows: z.array(datasetRowSchema),
      rowCount: z.number(),
      truncated: z.boolean(),
      elapsedMs: z.number(),
    }),
  }),
  create_map: tool({
    description:
      "Affiche réellement une carte MapLibre dans la conversation à partir du résultat de la dernière requête execute_sql réussie. Pour créer une carte, appeler impérativement ce tool juste après execute_sql : ne jamais recopier la requête SQL ni simuler la carte dans le texte.",
    inputSchema: mapSpecSchema,
    outputSchema: z.object({
      columns: z.array(z.string()),
      rows: z.array(datasetRowSchema),
      rowCount: z.number(),
      truncated: z.boolean(),
      elapsedMs: z.number(),
      resolvedSpec: mapSpecSchema,
      fieldCorrections: z.array(z.object({
        role: z.enum(["latitude", "longitude", "geometry", "territory", "label", "value"]),
        from: z.string(),
        to: z.string(),
      })),
      warnings: z.array(z.string()),
    }),
  }),
};
