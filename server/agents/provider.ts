import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function useAgentModel() {
  const config = useRuntimeConfig();

  const compatibleBaseUrl = config.albertApiUrl || process.env.ALBERT_API_URL;
  const compatibleApiKey = config.albertApiKey || process.env.ALBERT_API_KEY;
  const compatibleModel = config.albertModel || process.env.ALBERT_MODEL;

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
