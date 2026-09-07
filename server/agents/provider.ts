import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { isAgentModelId, type AgentModelId } from "~~/shared/agents/models";

export function resolveAgentModelId(requestedModel: unknown): string {
  const config = useRuntimeConfig();
  const configuredModel = config.albertModel || process.env.ALBERT_MODEL;
  if (requestedModel !== undefined && requestedModel !== null && requestedModel !== "") {
    if (!isAgentModelId(requestedModel)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le modèle demandé n’est pas autorisé par ce prototype.",
      });
    }
    return requestedModel;
  }
  if (configuredModel) return configuredModel;
  throw createError({
    statusCode: 503,
    statusMessage: "Albert n’est pas configuré. Ajoutez ALBERT_MODEL.",
  });
}

export function useAgentModel(modelId?: AgentModelId | string) {
  const config = useRuntimeConfig();

  const compatibleBaseUrl = config.albertApiUrl || process.env.ALBERT_API_URL;
  const compatibleApiKey = config.albertApiKey || process.env.ALBERT_API_KEY;
  const compatibleModel = modelId || config.albertModel || process.env.ALBERT_MODEL;

  if (compatibleBaseUrl && compatibleApiKey && compatibleModel) {
    const provider = createOpenAICompatible({
      name: "datagouv-prototype",
      baseURL: compatibleBaseUrl,
      apiKey: compatibleApiKey,
    });

    return provider(compatibleModel);
  }

  throw createError({
    statusCode: 503,
    statusMessage:
      "Albert n’est pas configuré. Ajoutez ALBERT_API_URL, ALBERT_API_KEY et ALBERT_MODEL.",
  });
}
