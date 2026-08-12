import { describe, expect, it } from "vitest";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import {
  countSqlCallsForCurrentQuestion,
  MAX_SQL_CALLS_PER_QUESTION,
} from "~~/server/agents/tool-budget";

function message(value: Partial<ExplorationMessage>): ExplorationMessage {
  return value as ExplorationMessage;
}

describe("SQL tool budget", () => {
  it("counts distinct SQL calls after the latest user question", () => {
    const messages = [
      message({ role: "user", parts: [{ type: "text", text: "Ancienne question" }] }),
      message({ role: "assistant", parts: [{ type: "tool-execute_sql", toolCallId: "old" }] }),
      message({ role: "user", parts: [{ type: "text", text: "Question courante" }] }),
      message({
        role: "assistant",
        parts: [
          { type: "tool-execute_sql", toolCallId: "sql-1" },
          { type: "tool-execute_sql", toolCallId: "sql-2" },
          { type: "tool-execute_sql", toolCallId: "sql-2" },
        ],
      }),
    ];

    expect(countSqlCallsForCurrentQuestion(messages)).toBe(2);
    expect(MAX_SQL_CALLS_PER_QUESTION).toBe(3);
  });

  it("returns zero when the current question has no SQL call", () => {
    const messages = [
      message({ role: "user", parts: [{ type: "text", text: "Bonjour" }] }),
    ];

    expect(countSqlCallsForCurrentQuestion(messages)).toBe(0);
  });
});
