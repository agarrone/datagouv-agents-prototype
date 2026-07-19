import { z } from "zod";

export const resourceContextSchema = z.object({
  datasetId: z.string().min(1),
  resourceId: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
});

export type ResourceContext = z.infer<typeof resourceContextSchema>;

