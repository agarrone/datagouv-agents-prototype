import { createGateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function useAgentModel() {
  const config = useRuntimeConfig();

  const gatewayApiKey = config.aiGatewayApiKey
    || process.env.AI_GATEWAY_API_KEY;

  if (gatewayApiKey) {
    const gateway = createGateway({
      apiKey: gatewayApiKey,
    });
    return gateway(config.aiGatewayModel);
  }

  const compatibleBaseUrl = config.aiBaseUrl || process.env.ALBERT_API_URL;
  const compatibleApiKey = config.aiApiKey || process.env.ALBERT_API_KEY;
  const compatibleModel = config.aiModel || process.env.ALBERT_MODEL;

  if (compatibleBaseUrl && compatibleApiKey && compatibleModel) {
    const provider = createOpenAICompatible({
      name: "datagouv-prototype",
      baseURL: compatibleBaseUrl,
      apiKey: compatibleApiKey,
    });

    return provider(compatibleModel);
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    const gateway = createGateway({
      apiKey: process.env.VERCEL_OIDC_TOKEN,
    });
    return gateway(config.aiGatewayModel);
  }

  throw createError({
    statusCode: 503,
    statusMessage:
      "Aucun fournisseur IA n’est configuré. Ajoutez les variables Vercel AI Gateway ou Albert.",
  });
}
