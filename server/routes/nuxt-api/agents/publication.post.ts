import { createMCPClient } from "@ai-sdk/mcp";
import {
  createAgentUIStreamResponse,
  isStepCount,
  ToolLoopAgent,
} from "ai";
import type { ToolExecutionOptions } from "ai";
import { publicationTools } from "~~/shared/agents/publication-tools";
import { publicationContextSchema } from "~~/shared/schemas/publication-agent";
import type { PublicationAssistantMessage } from "~~/shared/types/publication";
import { resolveAgentModelId, useAgentModel } from "~~/server/agents/provider";
import { agentModelLabel } from "~~/shared/agents/models";
import { useAgentModelSettings } from "~~/server/agents/model-settings";
import { buildPublicationInstructions } from "~~/server/agents/prompts/publication";
import { agentErrorMessage, normalizeAgentError } from "~~/server/agents/errors";

const GUIDE_MCP_URL = "https://guides.data.gouv.fr/~gitbook/mcp";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: PublicationAssistantMessage[];
    context?: unknown;
    modelId?: unknown;
  }>(event);
  if (!Array.isArray(body.messages)) {
    throw createError({ statusCode: 400, statusMessage: "La liste des messages est absente." });
  }
  const context = publicationContextSchema.safeParse(body.context);
  if (!context.success) {
    throw createError({ statusCode: 400, statusMessage: "Le contexte de publication est absent ou invalide." });
  }

  try {
    const activeModelId = resolveAgentModelId(body.modelId);
    const tools = {
      ...publicationTools,
      consult_publication_guide: {
        ...publicationTools.consult_publication_guide,
        execute: async (input: { question: string; goal?: string }, options: ToolExecutionOptions<unknown>) => {
          const mcpClient = await createMCPClient({
            transport: { type: "http", url: GUIDE_MCP_URL },
          });
          try {
            const guideQuestionTool = (await mcpClient.tools()).askQuestion;
            if (!guideQuestionTool?.execute) {
              throw new Error("Le guide data.gouv.fr est momentanément indisponible.");
            }
            return await guideQuestionTool.execute(input, options);
          }
          finally {
            await mcpClient.close();
          }
        },
      },
    };
    const agent = new ToolLoopAgent({
      model: useAgentModel(activeModelId),
      ...useAgentModelSettings(),
      instructions: buildPublicationInstructions(context.data, agentModelLabel(activeModelId)),
      tools,
      stopWhen: isStepCount(4),
    });

    return createAgentUIStreamResponse({
      agent,
      uiMessages: body.messages,
      abortSignal: event.node.req.signal,
      messageMetadata({ part }) {
        if (part.type === "start") return { createdAt: new Date().toISOString() };
      },
      onError(error) {
        console.error("Publication agent error", error);
        return agentErrorMessage(error);
      },
    });
  }
  catch (error) {
    const normalized = normalizeAgentError(error);
    throw createError({
      statusCode: normalized.code === "prototype_configuration" ? 503 : 500,
      statusMessage: "L’assistant de publication n’a pas pu démarrer.",
      data: normalized,
    });
  }
});
