import { z } from "zod";

export const publicationDraftSchema = z.object({
  title: z.string(),
  acronym: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  organization: z.string(),
  license: z.string(),
  frequency: z.string(),
  spatialCoverage: z.string(),
  temporalStart: z.string(),
  temporalEnd: z.string(),
  spatialGranularity: z.string(),
  tags: z.array(z.string()),
});

export const publicationContextSchema = z.object({
  step: z.number().int().min(0).max(3),
  fileName: z.string().min(1),
  format: z.string().min(1),
  resourceTitle: z.string().min(1),
  organization: z.string().min(1),
  schema: z.object({
    rowCount: z.number().int().nonnegative(),
    columns: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    })),
    sample: z.array(z.record(z.string(), z.union([
      z.string(), z.number(), z.boolean(), z.null(),
    ]))).max(5),
  }),
  draft: publicationDraftSchema,
});

export type PublicationContext = z.infer<typeof publicationContextSchema>;
