export interface GenericFeedbackContext {
  datasetName?: string;
  datasetUrl?: string;
  resourceName?: string;
  resourceUrl?: string;
  model?: string;
}

export function useGenericFeedbackContext() {
  return useState<GenericFeedbackContext>("generic-feedback-context", () => ({}));
}
