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
  it("counts distinct SQL attempts after the latest user question", () => {
    const messages = [
      message({ role: "user", parts: [{ type: "text", text: "Ancienne question" }] }),
      message({ role: "assistant", parts: [{ type: "tool-execute_sql", toolCallId: "old", state: "output-error", input: { sql: "SELECT old", purpose: "Ancien" }, errorText: "Ancien échec" }] }),
      message({ role: "user", parts: [{ type: "text", text: "Question courante" }] }),
      message({
        role: "assistant",
        parts: [
          { type: "tool-execute_sql", toolCallId: "sql-1", state: "output-error", input: { sql: "SELECT 1;", purpose: "Premier" }, errorText: "Échec" },
          { type: "tool-execute_sql", toolCallId: "sql-2", state: "output-error", input: { sql: "SELECT 2", purpose: "Deuxième" }, errorText: "Échec" },
          { type: "tool-execute_sql", toolCallId: "sql-3", state: "output-error", input: { sql: "SELECT 1", purpose: "Même requête, autre objectif" }, errorText: "Échec" },
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

  it("does not count an interrupted SQL call that was never executed", () => {
    const messages = [
      message({ role: "user", parts: [{ type: "text", text: "Question" }] }),
      message({
        role: "assistant",
        parts: [{
          type: "tool-execute_sql",
          toolCallId: "sql-interrupted",
          state: "input-available",
          input: { sql: "SELECT 1", purpose: "Tester" },
        }],
      }),
    ];

    expect(countSqlCallsForCurrentQuestion(messages)).toBe(0);
  });
});
