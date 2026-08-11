export interface FeedbackContext {
  question: string;
  resource: string;
  dataset: string;
  resourceName: string;
  model: string;
}

export type FeedbackOrigin = "response_feedback" | "after_six_questions";
