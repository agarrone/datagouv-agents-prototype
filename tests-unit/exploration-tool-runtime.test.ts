import { describe, expect, it, vi } from "vitest";
import {
  useExplorationToolRuntime,
  type ExplorationAddToolOutput,
  type ExplorationToolCallOptions,
  type ExplorationToolDataset,
} from "../app/composables/useExplorationToolRuntime.client";

const queryResult = {
  columns: ["count"],
  rows: [{ count: 12 }],
  rowCount: 1,
  truncated: false,
  elapsedMs: 3,
};

function datasetStub(overrides: Partial<ExplorationToolDataset> = {}) {
  return {
    inspectSchema: vi.fn(),
    executeSql: vi.fn().mockResolvedValue(queryResult),
    createChartData: vi.fn().mockResolvedValue(queryResult),
    createMapData: vi.fn().mockResolvedValue(queryResult),
    ...overrides,
  } satisfies ExplorationToolDataset;
}

function toolOutputRecorder() {
  const outputs: unknown[] = [];
  const addToolOutput = ((output: unknown) => {
    outputs.push(output);
  }) as ExplorationAddToolOutput;
  return { addToolOutput, outputs };
}

describe("exploration tool runtime", () => {
  it("does not wait for addToolOutput from inside onToolCall", async () => {
    const dataset = datasetStub();
    const addToolOutput = vi.fn(
      () => new Promise<never>(() => {}),
    ) as unknown as ExplorationAddToolOutput;
    const runtime = useExplorationToolRuntime(dataset, addToolOutput);

    await runtime.handleToolCall({
      toolCall: {
        dynamic: false,
        toolName: "execute_sql",
        toolCallId: "sql-deadlock-regression",
        input: { sql: "SELECT 1", purpose: "Tester la boucle" },
      },
    } as ExplorationToolCallOptions);

    expect(addToolOutput).toHaveBeenCalledOnce();
  });

  it("executes SQL and publishes its output", async () => {
    const dataset = datasetStub();
    const recorder = toolOutputRecorder();
    const runtime = useExplorationToolRuntime(dataset, recorder.addToolOutput);

    await runtime.handleToolCall({
      toolCall: {
        dynamic: false,
        toolName: "execute_sql",
        toolCallId: "sql-1",
        input: { sql: "SELECT COUNT(*) AS count FROM data", purpose: "Compter" },
      },
    } as ExplorationToolCallOptions);

    expect(dataset.executeSql).toHaveBeenCalledWith(
      "SELECT COUNT(*) AS count FROM data",
    );
    expect(recorder.outputs).toEqual([{
      tool: "execute_sql",
      toolCallId: "sql-1",
      output: queryResult,
    }]);
  });

  it("turns local failures into tool errors", async () => {
    const dataset = datasetStub({
      executeSql: vi.fn().mockRejectedValue(new Error("SQL invalide")),
    });
    const recorder = toolOutputRecorder();
    const runtime = useExplorationToolRuntime(dataset, recorder.addToolOutput);

    await runtime.handleToolCall({
      toolCall: {
        dynamic: false,
        toolName: "execute_sql",
        toolCallId: "sql-2",
        input: { sql: "SELECT nope", purpose: "Tester" },
      },
    } as ExplorationToolCallOptions);

    expect(recorder.outputs).toEqual([{
      state: "output-error",
      tool: "execute_sql",
      toolCallId: "sql-2",
      errorText: "SQL invalide",
    }]);
  });
});
