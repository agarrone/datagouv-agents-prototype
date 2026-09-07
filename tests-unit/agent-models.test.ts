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
      "mistral-medium-3-5-128b",
      "openai/gpt-oss-120b",
    ]);
  });

  it("uses Mistral Medium 3.5 by default", () => {
    expect(DEFAULT_AGENT_MODEL_ID).toBe("mistral-medium-3-5-128b");
    expect(agentModelLabel(DEFAULT_AGENT_MODEL_ID)).toBe("Mistral Medium 3.5");
  });

  it("rejects arbitrary model identifiers", () => {
    expect(isAgentModelId("openai/gpt-oss-120b")).toBe(true);
    expect(isAgentModelId("untrusted/model")).toBe(false);
  });
});
