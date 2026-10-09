export const AGENT_CONVERSATION_LIMITS = {
  maxQuestionCharacters: 4_000,
  maxMessages: 20,
  maxRequestBytes: 512 * 1024,
  maxSchemaColumns: 300,
  maxOutputTokens: 4_096,
} as const;

type ConversationMessage = {
  role: string;
  parts?: Array<{ type?: string; text?: unknown }>;
};

export function userMessageText(message: ConversationMessage) {
  if (message.role !== "user") return "";
  return (message.parts ?? [])
    .filter(part => part.type === "text" && typeof part.text === "string")
    .map(part => part.text as string)
    .join("\n");
}

/**
 * Conserve une fenêtre récente sans muter l'historique visible. Une fenêtre
 * commence si possible par un message utilisateur afin de rester cohérente
 * pour le modèle et les reprises automatiques après un tool.
 */
export function recentConversationMessages<T extends ConversationMessage>(messages: T[]) {
  const recent = messages.slice(-AGENT_CONVERSATION_LIMITS.maxMessages);
  const firstUserIndex = recent.findIndex(message => message.role === "user");
  return firstUserIndex > 0 ? recent.slice(firstUserIndex) : recent;
}
