import { convertToModelMessages, isStepCount, streamText } from "ai";
import { dashboardTools as visualizationTools } from "~~/shared/agents/dashboard-tools";
import { explorationTools } from "~~/shared/agents/exploration-tools";
import { AGENT_CONVERSATION_LIMITS } from "~~/shared/agents/conversation-limits";
import { agentModelLabel } from "~~/shared/agents/models";
import { resourceContextSchema } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { agentErrorMessage, normalizeAgentError } from "~~/server/agents/errors";
import { useAgentModelSettings } from "~~/server/agents/model-settings";
import { buildVisualizationInstructions, type VisualizationPromptContext } from "~~/server/agents/prompts/visualization";
import { resolveAgentModelId, useAgentModel } from "~~/server/agents/provider";
import { acquireAgentCapacity } from "~~/server/agents/rate-limit";
import { assertAgentRequestLimits } from "~~/server/agents/request-limits";
import { fetchDatasetMetadata, verifyDatagouvResource } from "~~/server/services/datagouv";

const MODEL_REQUEST_TIMEOUT_MS = 120_000;

function structuredHttpError(error: unknown, fallbackStatusCode = 500) {
  const normalized = normalizeAgentError(error);
  return createError({
    statusCode: normalized.code === "prototype_configuration" ? 503 : fallbackStatusCode,
    statusMessage: "L’assistant de visualisation n’a pas pu traiter la demande.",
    data: normalized,
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: ExplorationMessage[];
    resource?: unknown;
    visualization?: VisualizationPromptContext;
    modelId?: unknown;
  }>(event);
  assertAgentRequestLimits(body);
  if (!Array.isArray(body.messages) || !body.visualization) {
    throw createError({ statusCode: 400, statusMessage: "Le contexte de la visualisation est incomplet." });
  }
  const resource = resourceContextSchema.safeParse(body.resource);
  if (!resource.success) throw createError({ statusCode: 400, statusMessage: "Le contexte de la ressource est invalide." });
  try {
    await verifyDatagouvResource(resource.data.datasetId, resource.data.resourceId, resource.data.url);
  } catch {
    throw createError({ statusCode: 403, statusMessage: "Cette ressource ne provient pas de data.gouv.fr." });
  }

  const capacity = await acquireAgentCapacity(event);
  let activeModelId: string;
  let model: ReturnType<typeof useAgentModel>;
  try {
    activeModelId = resolveAgentModelId(body.modelId);
    model = useAgentModel(activeModelId);
  } catch (error) {
    capacity.release();
    throw structuredHttpError(error, 503);
  }

  const tools = {
    ...visualizationTools,
    update_chart: explorationTools.update_chart,
    get_dataset_metadata: {
      ...visualizationTools.get_dataset_metadata,
      execute: async () => fetchDatasetMetadata(resource.data.datasetId),
    },
  };
  const result = streamText({
    model,
    ...useAgentModelSettings(),
    maxOutputTokens: AGENT_CONVERSATION_LIMITS.maxOutputTokens,
    instructions: buildVisualizationInstructions(body.visualization, resource.data, agentModelLabel(activeModelId)),
    messages: await convertToModelMessages(body.messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(5),
    abortSignal: AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    sendReasoning: true,
    messageMetadata({ part }) {
      if (part.type === "start") return { createdAt: new Date().toISOString() };
      if (part.type === "finish") {
        capacity.release();
        return { finishReason: part.finishReason, totalUsage: part.totalUsage };
      }
    },
    onError(error) {
      capacity.release();
      console.error("Visualization agent error", error);
      return agentErrorMessage(error);
    },
  });
});
