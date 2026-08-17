import { createMCPClient } from "@ai-sdk/mcp";
import {
  createAgentUIStreamResponse,
  isStepCount,
  ToolLoopAgent,
} from "ai";
import { publicationTools } from "~~/shared/agents/publication-tools";
import { publicationContextSchema } from "~~/shared/schemas/publication-agent";
import type { PublicationAssistantMessage } from "~~/shared/types/publication";
import { useAgentModel } from "~~/server/agents/provider";
import { buildPublicationInstructions } from "~~/server/agents/prompts/publication";

const GUIDE_MCP_URL = "https://guides.data.gouv.fr/~gitbook/mcp";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: PublicationAssistantMessage[];
    context?: unknown;
  }>(event);
  if (!Array.isArray(body.messages)) {
    throw createError({ statusCode: 400, statusMessage: "La liste des messages est absente." });
  }
  const context = publicationContextSchema.safeParse(body.context);
  if (!context.success) {
    throw createError({ statusCode: 400, statusMessage: "Le contexte de publication est absent ou invalide." });
  }

  const mcpClient = await createMCPClient({
    transport: { type: "http", url: GUIDE_MCP_URL },
  });

  try {
    const guideTools = await mcpClient.tools();
    const guideQuestionTool = guideTools.askQuestion;
    if (!guideQuestionTool) {
      throw new Error("Le tool de consultation du guide data.gouv.fr est indisponible.");
    }
    const tools = {
      ...publicationTools,
      // Le serveur MCP expose aussi recherche, lecture et feedback. Seule la
      // question documentaire est rendue accessible à cet agent.
      consult_publication_guide: {
        ...publicationTools.consult_publication_guide,
        execute: async (
          input: { question: string; goal?: string },
          options: Parameters<NonNullable<typeof guideQuestionTool.execute>>[1],
        ) => {
          if (!guideQuestionTool.execute) {
            throw new Error("Le tool de consultation du guide ne peut pas être exécuté.");
          }
          return guideQuestionTool.execute(input, options);
        },
      },
    };
    const agent = new ToolLoopAgent({
      model: useAgentModel(),
      instructions: buildPublicationInstructions(context.data),
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
      onFinish: async () => {
        await mcpClient.close();
      },
      onError(error) {
        console.error("Publication agent error", error);
        return "L’assistant de publication n’a pas pu terminer cette réponse. Réessayez dans quelques instants.";
      },
    });
  }
  catch (error) {
    await mcpClient.close();
    throw error;
  }
});
