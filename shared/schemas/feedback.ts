import { z } from "zod";

export const feedbackSchema = z.object({
  rating: z.enum(["Utile", "Inutile"]),
  question: z.string().trim().max(2_000).default(""),
  answer: z.string().trim().max(5_000),
  resource: z.string().trim().max(2_000).default(""),
  dataset: z.string().trim().max(500).default(""),
  resourceName: z.string().trim().max(500).default(""),
  model: z.string().trim().max(200).default(""),
  createdAt: z.iso.datetime().optional(),
});

export type FeedbackPayload = z.infer<typeof feedbackSchema>;
