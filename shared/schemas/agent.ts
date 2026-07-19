import { z } from "zod";

export const resourceContextSchema = z.object({
  datasetId: z.string().min(1),
  resourceId: z.string().min(1),
  title: z.string().min(1),
  organization: z.string().min(1),
  resourceName: z.string().min(1),
  url: z.url(),
  schema: z.object({
    rowCount: z.number().int().nonnegative(),
    columns: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    })),
  }).optional(),
});

export type ResourceContext = z.infer<typeof resourceContextSchema>;
