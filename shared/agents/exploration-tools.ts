import { tool } from "ai";
import { z } from "zod";

const datasetValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const datasetRowSchema = z.record(z.string(), datasetValueSchema);

export const explorationTools = {
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
};
