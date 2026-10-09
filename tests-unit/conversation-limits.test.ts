import { describe, expect, it } from "vitest";
import {
  AGENT_CONVERSATION_LIMITS,
  recentConversationMessages,
  userMessageText,
} from "../shared/agents/conversation-limits";

function message(role: "user" | "assistant", text: string) {
  return { role, parts: [{ type: "text", text }] };
}

describe("conversation limits", () => {
  it("extracts only user-authored text", () => {
    expect(userMessageText(message("user", "Question"))).toBe("Question");
    expect(userMessageText(message("assistant", "Réponse"))).toBe("");
  });

  it("keeps at most the configured number of recent messages", () => {
    const messages = Array.from({ length: 30 }, (_, index) =>
      message(index % 2 === 0 ? "user" : "assistant", String(index)),
    );
    const recent = recentConversationMessages(messages);

    expect(recent.length).toBeLessThanOrEqual(AGENT_CONVERSATION_LIMITS.maxMessages);
    expect(recent.at(-1)?.parts[0]?.text).toBe("29");
    expect(recent[0]?.role).toBe("user");
  });

  it("does not mutate the visible conversation", () => {
    const messages = Array.from({ length: 25 }, (_, index) => message("user", String(index)));
    recentConversationMessages(messages);
    expect(messages).toHaveLength(25);
  });
});
