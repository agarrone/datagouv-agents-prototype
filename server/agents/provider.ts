import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function useAgentModel() {
  const config = useRuntimeConfig();

  if (!config.aiBaseUrl || !config.aiApiKey || !config.aiModel) {
    throw createError({
      statusCode: 503,
      statusMessage: "Le fournisseur IA du prototype n’est pas configuré.",
    });
  }

  const provider = createOpenAICompatible({
    name: "datagouv-prototype",
    baseURL: config.aiBaseUrl,
    apiKey: config.aiApiKey,
  });

  return provider(config.aiModel);
}

