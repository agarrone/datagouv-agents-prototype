import type { FeedbackPayload } from "~~/shared/schemas/feedback";

export function buildFeedbackFields(feedback: FeedbackPayload) {
  const fields: Record<string, string> = {
    rating: feedback.rating,
    question: feedback.question,
    answer: feedback.answer,
    resource_url: feedback.resource,
    model_id: feedback.model,
  };

  if (feedback.datasetName) fields.dataset_name = feedback.datasetName;
  if (feedback.datasetUrl) fields.dataset_url = feedback.datasetUrl;
  if (feedback.resourceName) fields.resource_name = feedback.resourceName;

  return fields;
}
