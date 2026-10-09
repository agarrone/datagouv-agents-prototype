export const agentModels = [
  {
    id: "mistral-medium-3-5",
    label: "Mistral Medium 3.5",
  },
  {
    id: "gpt-oss-120b",
    label: "GPT-OSS-120B",
  },
] as const;

export type AgentModelId = typeof agentModels[number]["id"];

export const DEFAULT_AGENT_MODEL_ID: AgentModelId = "gpt-oss-120b";

export function isAgentModelId(value: unknown): value is AgentModelId {
  return typeof value === "string" && agentModels.some(model => model.id === value);
}

export function agentModelLabel(id: string) {
  return agentModels.find(model => model.id === id)?.label ?? id;
}
