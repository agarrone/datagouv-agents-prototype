import { z } from "zod";

export const feedbackSchema = z.object({
  rating: z.enum(["Utile", "Inutile"]),
  question: z.string().trim().max(2_000).default(""),
  // Les réponses qui contiennent une visualisation ou une explication détaillée
  // dépassent régulièrement 5 000 caractères. Le feedback doit rester possible
  // dans ces cas, sans accepter pour autant une charge sans limite.
  answer: z.string().trim().max(50_000),
  comment: z.string().trim().max(5_000).default(""),
  resource: z.string().trim().max(2_000).default(""),
  dataset: z.string().trim().max(500).default(""),
  datasetName: z.string().trim().max(500).default(""),
  datasetUrl: z.url().max(2_000).or(z.literal("")).default(""),
  resourceName: z.string().trim().max(500).default(""),
  model: z.string().trim().max(200).default(""),
  origin: z.enum(["response_feedback", "after_six_questions"]).default("response_feedback"),
  createdAt: z.iso.datetime().optional(),
});

export type FeedbackPayload = z.infer<typeof feedbackSchema>;
