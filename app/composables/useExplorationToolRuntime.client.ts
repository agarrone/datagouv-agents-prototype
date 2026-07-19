import type {
  ChatAddToolOutputFunction,
  ChatOnToolCallCallback,
} from "ai";
import {
  chartRequiredFields,
  mapRequiredFields,
} from "~~/shared/agents/visualization-fields";
import type {
  DatasetQueryResult,
  DatasetSchemaResult,
  ExplorationMessage,
} from "~~/shared/types/exploration";

export interface ExplorationToolDataset {
  inspectSchema: () => Promise<DatasetSchemaResult>;
  executeSql: (sql: string) => Promise<DatasetQueryResult>;
  createChartData: (requiredFields: string[]) => Promise<DatasetQueryResult>;
  createMapData: (requiredFields: string[]) => Promise<DatasetQueryResult>;
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
  async function handleToolCall({ toolCall }: ExplorationToolCallOptions) {
    if (toolCall.dynamic) return;

    try {
      if (toolCall.toolName === "inspect_schema") {
        const output = await dataset.inspectSchema();
        await addToolOutput({
          tool: "inspect_schema",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "execute_sql") {
        const output = await dataset.executeSql(toolCall.input.sql);
        await addToolOutput({
          tool: "execute_sql",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "create_chart") {
        const output = await dataset.createChartData(
          chartRequiredFields(toolCall.input),
        );
        await addToolOutput({
          tool: "create_chart",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "create_map") {
        const output = await dataset.createMapData(
          mapRequiredFields(toolCall.input),
        );
        await addToolOutput({
          tool: "create_map",
          toolCallId: toolCall.toolCallId,
          output,
        });
      }
    } catch (reason) {
      await addToolOutput({
        state: "output-error",
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        errorText: reason instanceof Error
          ? reason.message
          : "Le tool n’a pas pu être exécuté.",
      });
    }
  }

  return { handleToolCall };
}
