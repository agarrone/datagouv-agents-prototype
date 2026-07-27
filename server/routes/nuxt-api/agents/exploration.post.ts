import {
  convertToModelMessages,
  isStepCount,
  streamText,
} from "ai";
import { explorationTools } from "~~/shared/agents/exploration-tools";
import { resourceContextSchema } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { useAgentModel } from "~~/server/agents/provider";
import { buildExplorationInstructions } from "~~/server/agents/prompts/exploration";
import { fetchDatasetMetadata } from "~~/server/services/datagouv";

function agentErrorMessage(error: unknown) {
  const details = error instanceof Error
    ? `${error.message} ${error.cause ?? ""}`
    : String(error);

  if (/too many requests|429/i.test(details)) {
    return "Le service d’assistance reçoit trop de demandes pour le moment. Réessayez dans quelques instants.";
  }
  return "L’assistant n’a pas pu terminer cette réponse.";
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
    });
  }
  const resource = resourceContextSchema.safeParse(body.resource);
  if (!resource.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le contexte de la ressource est absent ou invalide.",
    });
  }

  const tools = {
    ...explorationTools,
    get_dataset_metadata: {
      ...explorationTools.get_dataset_metadata,
      execute: async () => fetchDatasetMetadata(resource.data.datasetId),
    },
  };
  const instructions = buildExplorationInstructions(resource.data);

  const result = streamText({
    model: useAgentModel(),
    instructions,
    messages: await convertToModelMessages(body.messages, {
      tools,
    }),
    tools,
    stopWhen: isStepCount(5),
    abortSignal: event.node.req.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    messageMetadata({ part }) {
      if (part.type === "start") return { createdAt: new Date().toISOString() };
      if (part.type === "finish") return { totalUsage: part.totalUsage };
    },
    onError(error) {
      console.error("Exploration agent error", error);
      return agentErrorMessage(error);
    },
  });
});
