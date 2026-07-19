import { createGateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function useAgentModel() {
  const config = useRuntimeConfig();

  const gatewayApiKey = config.aiGatewayApiKey
    || process.env.AI_GATEWAY_API_KEY
    || process.env.VERCEL_OIDC_TOKEN;

  if (gatewayApiKey) {
    const gateway = createGateway({
      apiKey: gatewayApiKey,
    });
    return gateway(config.aiGatewayModel);
  }

  if (!config.aiBaseUrl || !config.aiApiKey || !config.aiModel) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Vercel AI Gateway n’est pas configuré. Ajoutez NUXT_AI_GATEWAY_API_KEY.",
    });
  }

  const provider = createOpenAICompatible({
    name: "datagouv-prototype",
    baseURL: config.aiBaseUrl,
    apiKey: config.aiApiKey,
  });

  return provider(config.aiModel);
}
