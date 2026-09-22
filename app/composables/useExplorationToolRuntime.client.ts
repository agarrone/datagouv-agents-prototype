import type {
  ChatAddToolOutputFunction,
  ChatOnToolCallCallback,
} from "ai";
import {
  chartRequiredFields,
} from "~~/shared/agents/visualization-fields";
import type {
  MapDatasetResult,
  MapSpec,
  DatasetQueryResult,
  DatasetSchemaResult,
  ExplorationMessage,
} from "~~/shared/types/exploration";

export interface ExplorationToolDataset {
  inspectSchema: () => Promise<DatasetSchemaResult>;
  executeSql: (sql: string) => Promise<DatasetQueryResult>;
  createChartData: (requiredFields: string[]) => Promise<DatasetQueryResult>;
  createMapData: (spec: MapSpec) => Promise<MapDatasetResult>;
  visualizationSourceKey: () => string | undefined;
}

export type ExplorationToolCallOptions = Parameters<
  ChatOnToolCallCallback<ExplorationMessage>
>[0];
export type ExplorationAddToolOutput = ChatAddToolOutputFunction<
  ExplorationMessage
>;

export function useExplorationToolRuntime(
  dataset: ExplorationToolDataset,
  addToolOutput: ExplorationAddToolOutput,
) {
  const completedCalls = new Map<string, unknown>();
  const pendingCalls = new Map<string, Promise<unknown>>();

  function callKey(toolName: string, input: unknown) {
    if (
      toolName === "execute_sql"
      && input
      && typeof input === "object"
      && "sql" in input
      && typeof input.sql === "string"
    ) {
      return `${toolName}:${input.sql.trim().replace(/;+\s*$/, "")}`;
    }
    if (toolName === "create_chart" || toolName === "create_map") {
      return `${toolName}:${dataset.visualizationSourceKey() ?? "no-source"}:${JSON.stringify(input)}`;
    }
    return `${toolName}:${JSON.stringify(input)}`;
  }

  function publishToolOutput(output: Parameters<ExplorationAddToolOutput>[0]) {
    void Promise.resolve(addToolOutput(output)).catch((reason) => {
      console.error("Impossible de publier le résultat du tool", {
        tool: output.tool,
        toolCallId: output.toolCallId,
        reason,
      });
    });
  }

  async function executeOnce<T>(
    toolName: string,
    input: unknown,
    execute: () => Promise<T>,
  ): Promise<T> {
    const key = callKey(toolName, input);
    if (completedCalls.has(key)) return completedCalls.get(key) as T;

    const pending = pendingCalls.get(key);
    if (pending) return pending as Promise<T>;

    const execution = execute().then((output) => {
      completedCalls.set(key, output);
      return output;
    }).finally(() => pendingCalls.delete(key));
    pendingCalls.set(key, execution);
    return execution;
  }

  function reset() {
    completedCalls.clear();
    pendingCalls.clear();
  }

  async function handleToolCall({ toolCall }: ExplorationToolCallOptions) {
    if (toolCall.dynamic) return;

    try {
      if (toolCall.toolName === "request_clarification") {
        // Ce tool attend un choix explicite dans l’interface. Sa sortie est
        // ajoutée par la page lorsque l’utilisateur sélectionne une suggestion.
        return;
      }

      if (toolCall.toolName === "inspect_schema") {
        const output = await executeOnce(
          toolCall.toolName,
          toolCall.input,
          dataset.inspectSchema,
        );
        publishToolOutput({
          tool: "inspect_schema",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "execute_sql") {
        const output = await executeOnce(
          toolCall.toolName,
          toolCall.input,
          () => dataset.executeSql(toolCall.input.sql),
        );
        publishToolOutput({
          tool: "execute_sql",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "create_chart") {
        const output = await executeOnce(
          toolCall.toolName,
          toolCall.input,
          () => dataset.createChartData(chartRequiredFields(toolCall.input)),
        );
        publishToolOutput({
          tool: "create_chart",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "create_map") {
        const output = await executeOnce(
          toolCall.toolName,
          toolCall.input,
          () => dataset.createMapData(toolCall.input),
        );
        publishToolOutput({
          tool: "create_map",
          toolCallId: toolCall.toolCallId,
          output,
        });
      }
    } catch (reason) {
      publishToolOutput({
        state: "output-error",
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        errorText: reason instanceof Error
          ? reason.message
          : "Le tool n’a pas pu être exécuté.",
      });
    }
  }

  return { handleToolCall, reset };
}
