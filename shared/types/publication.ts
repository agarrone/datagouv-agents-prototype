import type { InferUITools, UIMessage } from "ai";
import type { publicationTools } from "../agents/publication-tools";
import type { PublicationStageId } from "../agents/publication-workflow";

export type PublicationRecommendation = {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
};

export type PublicationPromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
  stage: PublicationStageId;
  disabled?: boolean;
  hint?: string;
};

export type PublicationTools = InferUITools<typeof publicationTools>;

export type PublicationAssistantMessage = UIMessage<
  { createdAt?: string },
  never,
  PublicationTools
>;

export type PublicationAgentTool = {
  id: "inspect_schema" | "draft_metadata" | "document_publication" | "review_publication";
  label: string;
  description: string;
  status: "available" | "running" | "completed";
};
