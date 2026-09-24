import {
  convertToModelMessages,
  isStepCount,
  streamText,
} from "ai";
import { dashboardTools } from "~~/shared/agents/dashboard-tools";
import { agentModelLabel } from "~~/shared/agents/models";
import { resourceContextSchema } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { agentErrorMessage, normalizeAgentError } from "~~/server/agents/errors";
import { useAgentModelSettings } from "~~/server/agents/model-settings";
import { buildDashboardInstructions, type DashboardPromptContext } from "~~/server/agents/prompts/dashboard";
import { resolveAgentModelId, useAgentModel } from "~~/server/agents/provider";
import { fetchDatasetMetadata } from "~~/server/services/datagouv";

const MODEL_REQUEST_TIMEOUT_MS = 120_000;

function structuredHttpError(error: unknown, fallbackStatusCode = 500) {
  const normalized = normalizeAgentError(error);
  const statusCode = normalized.code === "prototype_configuration" ? 503
    : normalized.code === "ai_authentication" ? 502
      : normalized.code === "ai_rate_limit" || normalized.code === "ai_account_quota" ? 429
        : fallbackStatusCode;
  return createError({
    statusCode,
    statusMessage: "L’assistant du tableau de bord n’a pas pu traiter la demande.",
    data: normalized,
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: ExplorationMessage[];
    resource?: unknown;
    dashboard?: DashboardPromptContext["dashboard"];
    modelId?: unknown;
  }>(event);

  if (!Array.isArray(body.messages) || !body.dashboard) {
    throw createError({ statusCode: 400, statusMessage: "Le contexte du tableau de bord est incomplet." });
  }
  const resource = resourceContextSchema.safeParse(body.resource);
  if (!resource.success) {
    throw createError({ statusCode: 400, statusMessage: "Le contexte de la ressource est absent ou invalide." });
  }

  let activeModelId: string;
  let model: ReturnType<typeof useAgentModel>;
  try {
    activeModelId = resolveAgentModelId(body.modelId);
    model = useAgentModel(activeModelId);
  }
  catch (error) {
    throw structuredHttpError(error, 503);
  }

  const tools = {
    ...dashboardTools,
    get_dataset_metadata: {
      ...dashboardTools.get_dataset_metadata,
      execute: async () => fetchDatasetMetadata(resource.data.datasetId),
    },
  };
  const instructions = buildDashboardInstructions({
    dashboard: body.dashboard,
    resource: resource.data,
  }, agentModelLabel(activeModelId));

  let completedStepCount = 0;
  const result = streamText({
    model,
    ...useAgentModelSettings(),
    instructions,
    messages: await convertToModelMessages(body.messages, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    stopWhen: isStepCount(5),
    abortSignal: AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS),
    onStepFinish() {
      completedStepCount += 1;
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    sendReasoning: true,
    messageMetadata({ part }) {
      if (part.type === "start") return { createdAt: new Date().toISOString() };
      if (part.type === "finish") return {
        finishReason: part.finishReason,
        prototypeStepLimitReached: completedStepCount >= 5 && part.finishReason === "tool-calls",
        totalUsage: part.totalUsage,
      };
    },
    onError(error) {
      console.error("Dashboard agent error", error);
      return agentErrorMessage(error);
    },
  });
});
