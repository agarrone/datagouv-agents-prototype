import { describe, expect, it } from "vitest";
import {
  agentModelLabel,
  agentModels,
  DEFAULT_AGENT_MODEL_ID,
  isAgentModelId,
} from "../shared/agents/models";

describe("agent models", () => {
  it("exposes the two models available for comparison", () => {
    expect(agentModels.map(model => model.id)).toEqual([
      "mistral-medium-3-5",
      "gpt-oss-120b",
    ]);
  });

  it("uses GPT-OSS-120B by default", () => {
    expect(DEFAULT_AGENT_MODEL_ID).toBe("gpt-oss-120b");
    expect(agentModelLabel(DEFAULT_AGENT_MODEL_ID)).toBe("GPT-OSS-120B");
  });

  it("rejects arbitrary model identifiers", () => {
    expect(isAgentModelId("gpt-oss-120b")).toBe(true);
    expect(isAgentModelId("untrusted/model")).toBe(false);
  });
});
