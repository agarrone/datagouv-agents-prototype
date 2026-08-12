import type { ExplorationMessage } from "~~/shared/types/exploration";

export const MAX_SQL_CALLS_PER_QUESTION = 3;

export function countSqlCallsForCurrentQuestion(
  messages: ExplorationMessage[],
) {
  const lastUserIndex = messages.findLastIndex(message => message.role === "user");
  if (lastUserIndex < 0) return 0;

  const callIds = new Set<string>();
  for (const message of messages.slice(lastUserIndex + 1)) {
    for (const part of message.parts) {
      if (part.type === "tool-execute_sql") callIds.add(part.toolCallId);
    }
  }
  return callIds.size;
}
