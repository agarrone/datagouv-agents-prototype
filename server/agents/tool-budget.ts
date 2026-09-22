import type { ExplorationMessage } from "~~/shared/types/exploration";

export const MAX_SQL_CALLS_PER_QUESTION = 3;

export function sqlAttemptSignature(sql: string) {
  return sql.trim().replace(/;+\s*$/, "");
}

export function sqlAttemptSignaturesForCurrentQuestion(
  messages: ExplorationMessage[],
) {
  const signatures = new Set<string>();
  const lastUserIndex = messages.findLastIndex(message => message.role === "user");
  if (lastUserIndex < 0) return signatures;

  for (const message of messages.slice(lastUserIndex + 1)) {
    for (const part of message.parts) {
      if (part.type !== "tool-execute_sql") continue;
      if (part.state !== "output-available" && part.state !== "output-error") continue;
      const input = "input" in part ? part.input : undefined;
      const sql = input && typeof input === "object" && "sql" in input
        ? input.sql
        : undefined;
      signatures.add(
        typeof sql === "string" && sql.trim()
          ? sqlAttemptSignature(sql)
          : `tool-call:${part.toolCallId}`,
      );
    }
  }
  return signatures;
}

export function countSqlCallsForCurrentQuestion(
  messages: ExplorationMessage[],
) {
  return sqlAttemptSignaturesForCurrentQuestion(messages).size;
}
