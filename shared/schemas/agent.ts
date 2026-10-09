import { z } from "zod";
import { AGENT_CONVERSATION_LIMITS } from "../agents/conversation-limits";

export const resourceContextSchema = z.object({
  datasetId: z.string().min(1),
  resourceId: z.string().min(1),
  title: z.string().min(1),
  organization: z.string().min(1),
  resourceName: z.string().min(1),
  url: z.url().refine(value => /^https:\/\//i.test(value), {
    message: "La ressource doit utiliser HTTPS.",
  }),
  schema: z.object({
    rowCount: z.number().int().nonnegative(),
    columns: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    })).max(AGENT_CONVERSATION_LIMITS.maxSchemaColumns),
  }).optional(),
});

export type ResourceContext = z.infer<typeof resourceContextSchema>;
