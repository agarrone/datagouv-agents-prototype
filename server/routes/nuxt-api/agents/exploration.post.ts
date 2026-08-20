import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
} from "ai";
import { explorationTools } from "~~/shared/agents/exploration-tools";
import { resourceContextSchema } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { useAgentModel } from "~~/server/agents/provider";
import { buildExplorationInstructions } from "~~/server/agents/prompts/exploration";
import { explorerIntentInstruction } from "~~/server/agents/explorer-intent";
import { deterministicSchemaAnswer } from "~~/server/agents/schema-answer";
import {
  countSqlCallsForCurrentQuestion,
  MAX_SQL_CALLS_PER_QUESTION,
} from "~~/server/agents/tool-budget";
import { fetchDatasetMetadata } from "~~/server/services/datagouv";
import { agentErrorMessage, normalizeAgentError } from "~~/server/agents/errors";

function structuredHttpError(error: unknown, fallbackStatusCode = 500) {
  const normalized = normalizeAgentError(error);
  const statusCode = normalized.code === "prototype_configuration" ? 503
    : normalized.code === "ai_authentication" ? 502
      : normalized.code === "ai_rate_limit" || normalized.code === "ai_account_quota" ? 429
        : fallbackStatusCode;
  return createError({
    statusCode,
    statusMessage: "L’assistant n’a pas pu traiter la demande.",
    data: normalized,
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: ExplorationMessage[];
    resource?: unknown;
  }>(event);
  if (!Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      statusMessage: "La liste des messages est absente.",
      data: {
        code: "prototype_invalid_request",
        source: "prototype",
        retryable: true,
        technicalDetails: "La propriété messages est absente ou n’est pas une liste.",
      },
    });
  }
  const resource = resourceContextSchema.safeParse(body.resource);
  if (!resource.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le contexte de la ressource est absent ou invalide.",
      data: {
        code: "prototype_invalid_request",
        source: "prototype",
        retryable: true,
        technicalDetails: "Le contexte de ressource envoyé à la route est absent ou invalide.",
      },
    });
  }

  const schemaAnswer = deterministicSchemaAnswer(body.messages, resource.data);
  if (schemaAnswer) {
    const stream = createUIMessageStream<ExplorationMessage>({
      originalMessages: body.messages,
      execute({ writer }) {
        const textId = "schema-answer";
        writer.write({
          type: "start",
          messageMetadata: { createdAt: new Date().toISOString() },
        });
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: schemaAnswer });
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const tools = {
    ...explorationTools,
    get_dataset_metadata: {
      ...explorationTools.get_dataset_metadata,
      execute: async () => fetchDatasetMetadata(resource.data.datasetId),
    },
  };
  const instructions = `${buildExplorationInstructions(resource.data)}${
    explorerIntentInstruction(body.messages)
  }`;
  const previousSqlCalls = countSqlCallsForCurrentQuestion(body.messages);
  const allToolNames = Object.keys(tools) as Array<keyof typeof tools>;

  let model: ReturnType<typeof useAgentModel>;
  try {
    model = useAgentModel();
  }
  catch (error) {
    throw structuredHttpError(error, 503);
  }

  let completedStepCount = 0;
  const result = streamText({
    model,
    instructions,
    messages: await convertToModelMessages(body.messages, {
      tools,
    }),
    tools,
    prepareStep({ steps, instructions: stepInstructions }) {
      const currentSqlCalls = steps.reduce(
        (count, step) => count + step.toolCalls.filter(
          call => call.toolName === "execute_sql",
        ).length,
        0,
      );
      if (previousSqlCalls + currentSqlCalls < MAX_SQL_CALLS_PER_QUESTION) {
        return undefined;
      }

      const currentInstructions = typeof stepInstructions === "string"
        ? stepInstructions
        : instructions;
      return {
        activeTools: allToolNames.filter(name => name !== "execute_sql"),
        instructions: currentInstructions.includes("Limite technique SQL atteinte")
          ? currentInstructions
          : `${currentInstructions}\n\nLimite technique SQL atteinte : les trois appels autorisés pour cette question ont été consommés. N’appelle plus execute_sql ; réponds avec les résultats déjà obtenus ou explique sobrement pourquoi ils ne suffisent pas.`,
      };
    },
    stopWhen: isStepCount(5),
    abortSignal: event.node.req.signal,
    onStepFinish() {
      completedStepCount += 1;
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    messageMetadata({ part }) {
      if (part.type === "start") return { createdAt: new Date().toISOString() };
      if (part.type === "finish") return {
        finishReason: part.finishReason,
        prototypeStepLimitReached: completedStepCount >= 5 && part.finishReason === "tool-calls",
        totalUsage: part.totalUsage,
      };
    },
    onError(error) {
      console.error("Exploration agent error", error);
      return agentErrorMessage(error);
    },
  });
});
