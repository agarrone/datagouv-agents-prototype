import type { FeedbackPayload } from "~~/shared/schemas/feedback";

export function buildFeedbackFields(feedback: FeedbackPayload) {
  const originLabel = feedback.origin === "after_six_questions"
    ? "Invitation après 6 questions"
    : "Feedback sur une réponse";

  const fields: Record<string, string> = {
    Rating: feedback.rating,
    Question: feedback.question,
    Answer: feedback.answer,
    // La table Grist ne possède pas de colonne Feedback_origin. Le champ
    // Details permet de conserver l’origine sans rendre l’envoi invalide.
    Details: `Origine : ${originLabel}`,
    Resource: feedback.resource,
    Model: feedback.model,
    CreatedAt: feedback.createdAt ?? new Date().toISOString(),
  };

  if (feedback.datasetName) fields.Dataset_name = feedback.datasetName;
  if (feedback.datasetUrl) fields.Dataset_url = feedback.datasetUrl;
  if (feedback.resourceName) fields.Ressource_name = feedback.resourceName;

  return fields;
}
