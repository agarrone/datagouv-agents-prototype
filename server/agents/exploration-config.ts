export const EXPLORATION_AGENT_LIMITS = {
  maxSteps: 5,
  maxSqlCallsPerQuestion: 3,
  maxToolOperationsPerQuestion: 8,
  modelRequestTimeoutMs: 120_000,
  turnExecutionTimeoutMs: 240_000,
} as const;

// Increment this identifier whenever a prompt change can affect evaluation
// results. It is returned with assistant messages for trace correlation.
export const EXPLORATION_PROMPT_VERSION = "2026-10-09.1";
