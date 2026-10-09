import { AGENT_CONVERSATION_LIMITS, userMessageText } from "~~/shared/agents/conversation-limits";

type AgentRequestBody = {
  messages?: Array<{
    role: string;
    parts?: Array<{ type?: string; text?: unknown }>;
  }>;
};

export function assertAgentRequestLimits(body: AgentRequestBody) {
  let serializedBytes = Number.POSITIVE_INFINITY;
  try {
    serializedBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
  }
  catch {
    // Un corps impossible à sérialiser est invalide et sera rejeté ci-dessous.
  }

  if (serializedBytes > AGENT_CONVERSATION_LIMITS.maxRequestBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: "La conversation et son contexte sont trop volumineux.",
    });
  }

  if (!Array.isArray(body.messages)) return;
  if (body.messages.length > AGENT_CONVERSATION_LIMITS.maxMessages) {
    throw createError({
      statusCode: 413,
      statusMessage: `La conversation dépasse ${AGENT_CONVERSATION_LIMITS.maxMessages} messages transmis.`,
    });
  }

  if (body.messages.some(message => (
    userMessageText(message).length > AGENT_CONVERSATION_LIMITS.maxQuestionCharacters
  ))) {
    throw createError({
      statusCode: 413,
      statusMessage: `Une question dépasse ${AGENT_CONVERSATION_LIMITS.maxQuestionCharacters.toLocaleString("fr-FR")} caractères.`,
    });
  }
}
