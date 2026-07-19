export type AgentExecution = "browser" | "server" | "interface";
export type AgentEffect = "read" | "proposal" | "write";

export interface AgentCapability {
  id: string;
  label: string;
  execution: AgentExecution;
  effect: AgentEffect;
}

export interface AgentTrace {
  id: string;
  startedAt: string;
  provider?: string;
  model?: string;
}

