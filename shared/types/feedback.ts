export interface FeedbackContext {
  question: string;
  resource: string;
  dataset: string;
  datasetName?: string;
  datasetUrl?: string;
  resourceName: string;
  model: string;
}

export type FeedbackOrigin = "response_feedback" | "after_six_questions";
