import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
} from "ai";
import { explorationTools } from "~~/shared/agents/exploration-tools";
import { AGENT_CONVERSATION_LIMITS } from "~~/shared/agents/conversation-limits";
import { resourceContextSchema } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { resolveAgentModelId, useAgentModel } from "~~/server/agents/provider";
import { agentModelLabel } from "~~/shared/agents/models";
import { useAgentModelSettings } from "~~/server/agents/model-settings";
import { buildExplorationInstructions } from "~~/server/agents/prompts/exploration";
import { explorerIntentInstruction } from "~~/server/agents/explorer-intent";
import { deterministicSchemaAnswer } from "~~/server/agents/schema-answer";
import {
  MAX_SQL_CALLS_PER_QUESTION,
  sqlAttemptSignature,
  sqlAttemptSignaturesForCurrentQuestion,
} from "~~/server/agents/tool-budget";
import { fetchDatasetMetadata, verifyDatagouvResource } from "~~/server/services/datagouv";
import { agentErrorMessage, normalizeAgentError } from "~~/server/agents/errors";
import { assertAgentRequestLimits } from "~~/server/agents/request-limits";
import { acquireAgentCapacity } from "~~/server/agents/rate-limit";
import {
  EXPLORATION_AGENT_LIMITS,
  EXPLORATION_PROMPT_VERSION,
} from "~~/server/agents/exploration-config";

const {
  maxSteps: MAX_STEPS,
  maxToolOperationsPerQuestion: MAX_TOOL_OPERATIONS_PER_QUESTION,
  modelRequestTimeoutMs: MODEL_REQUEST_TIMEOUT_MS,
  turnExecutionTimeoutMs: TURN_EXECUTION_TIMEOUT_MS,
} = EXPLORATION_AGENT_LIMITS;

function modelAbortSignal(event: Parameters<typeof defineEventHandler>[0] extends (event: infer T) => unknown ? T : never, timeoutMs: number) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const requestSignal = event.node.req.signal;

  return requestSignal instanceof AbortSignal
    ? AbortSignal.any([requestSignal, timeoutSignal])
    : timeoutSignal;
}

function structuredHttpError(error: unknown, fallbackStatusCode = 500) {
  const normalized = normalizeAgentError(error);
  const statusCode = normalized.code === "prototype_configuration" ? 503
    : normalized.code === "ai_authentication" ? 502
      : normalized.code === "ai_rate_limit" || normalized.code === "ai_account_quota" ? 429
        : fallbackStatusCode;
  return createError({
    statusCode,
    statusMessage: "L’assistant n’a pas pu traiter la demande.",
    data: normalized,
  });
}

function completedToolCallsForCurrentQuestion(messages: ExplorationMessage[]) {
  const lastUserIndex = messages.findLastIndex(message => message.role === "user");
  const completed = new Map<string, number>();
  if (lastUserIndex < 0) return completed;

  for (const message of messages.slice(lastUserIndex + 1)) {
    for (const part of message.parts) {
      if (!("state" in part) || part.state !== "output-available") continue;
      if (!("input" in part)) continue;
      const input = part.input;
      const key = part.type === "tool-execute_sql"
        && input
        && typeof input === "object"
        && "sql" in input
        && typeof input.sql === "string"
        ? `${part.type}:${sqlAttemptSignature(input.sql)}`
        : `${part.type}:${JSON.stringify(input)}`;
      completed.set(key, (completed.get(key) ?? 0) + 1);
    }
  }
  return completed;
}

function terminalToolOperationsForCurrentQuestion(messages: ExplorationMessage[]) {
  const lastUserIndex = messages.findLastIndex(message => message.role === "user");
  const operations = new Set<string>();
  if (lastUserIndex < 0) return operations;

  for (const message of messages.slice(lastUserIndex + 1)) {
    for (const part of message.parts) {
      if (!("state" in part) || (part.state !== "output-available" && part.state !== "output-error")) continue;
      if (part.type === "tool-request_clarification") continue;
      const input = "input" in part ? part.input : undefined;
      const key = part.type === "tool-execute_sql"
        && input
        && typeof input === "object"
        && "sql" in input
        && typeof input.sql === "string"
        ? `${part.type}:${sqlAttemptSignature(input.sql)}`
        : `${part.type}:${JSON.stringify(input)}`;
      operations.add(key);
    }
  }
  return operations;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: ExplorationMessage[];
    resource?: unknown;
    modelId?: unknown;
    turnStartedAt?: unknown;
  }>(event);
  assertAgentRequestLimits(body);
  if (!Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      statusMessage: "La liste des messages est absente.",
      data: {
        code: "prototype_invalid_request",
        source: "prototype",
        retryable: true,
        technicalDetails: "La propriété messages est absente ou n’est pas une liste.",
      },
    });
  }
  const resource = resourceContextSchema.safeParse(body.resource);
  if (!resource.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le contexte de la ressource est absent ou invalide.",
      data: {
        code: "prototype_invalid_request",
        source: "prototype",
        retryable: true,
        technicalDetails: "Le contexte de ressource envoyé à la route est absent ou invalide.",
      },
    });
  }

  try {
    await verifyDatagouvResource(
      resource.data.datasetId,
      resource.data.resourceId,
      resource.data.url,
    );
  }
  catch {
    throw createError({
      statusCode: 403,
      statusMessage: "Cette ressource ne provient pas de data.gouv.fr.",
      data: {
        code: "prototype_invalid_request",
        source: "prototype",
        retryable: false,
        technicalDetails: "La ressource ou son URL Parquet ne correspond pas aux métadonnées publiques de data.gouv.fr.",
      },
    });
  }

  let activeModelId: string;
  try {
    activeModelId = resolveAgentModelId(body.modelId);
  }
  catch (error) {
    throw structuredHttpError(error, 400);
  }

  const schemaAnswer = deterministicSchemaAnswer(body.messages, resource.data);
  if (schemaAnswer) {
    const stream = createUIMessageStream<ExplorationMessage>({
      originalMessages: body.messages,
      execute({ writer }) {
        const textId = "schema-answer";
        writer.write({
          type: "start",
          messageMetadata: {
            createdAt: new Date().toISOString(),
            modelId: activeModelId,
            promptVersion: EXPLORATION_PROMPT_VERSION,
          },
        });
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: schemaAnswer });
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const capacity = await acquireAgentCapacity(event);

  const tools = {
    ...explorationTools,
    get_dataset_metadata: {
      ...explorationTools.get_dataset_metadata,
      execute: async () => fetchDatasetMetadata(resource.data.datasetId),
    },
  };
  const instructions = `${buildExplorationInstructions(resource.data, agentModelLabel(activeModelId))}${
    explorerIntentInstruction(body.messages)
  }`;
  const previousSqlSignatures = sqlAttemptSignaturesForCurrentQuestion(body.messages);
  const previousToolOperations = terminalToolOperationsForCurrentQuestion(body.messages);
  const allToolNames = Object.keys(tools) as Array<keyof typeof tools>;
  const completedCalls = completedToolCallsForCurrentQuestion(body.messages);
  const completedToolTypes = new Set(
    [...completedCalls.keys()].map(key => key.slice(0, key.indexOf(":"))),
  );
  const repeatedToolTypes = new Set(
    [...completedCalls.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key.slice(0, key.indexOf(":"))),
  );
  const unavailableTools = new Set<keyof typeof tools>();
  if (completedToolTypes.has("tool-create_chart")) unavailableTools.add("create_chart");
  if (completedToolTypes.has("tool-create_map")) unavailableTools.add("create_map");
  if (repeatedToolTypes.has("tool-execute_sql")) unavailableTools.add("execute_sql");
  if (previousToolOperations.size >= MAX_TOOL_OPERATIONS_PER_QUESTION) {
    allToolNames.forEach(name => unavailableTools.add(name));
  }
  const loopGuardInstruction = unavailableTools.size > 0
    ? "\n\nDes opérations identiques ont déjà abouti pendant cette question. Ne les répète pas : utilise leurs résultats et termine maintenant la réponse en français."
    : "";

  let model: ReturnType<typeof useAgentModel>;
  try {
    model = useAgentModel(activeModelId);
  }
  catch (error) {
    capacity.release();
    throw structuredHttpError(error, 503);
  }

  let completedStepCount = 0;
  const requestedTurnStartedAt = typeof body.turnStartedAt === "number"
    ? body.turnStartedAt
    : Date.now();
  const remainingTurnTime = Math.max(
    1,
    TURN_EXECUTION_TIMEOUT_MS - Math.max(0, Date.now() - requestedTurnStartedAt),
  );
  const result = streamText({
    model,
    ...useAgentModelSettings(),
    maxOutputTokens: AGENT_CONVERSATION_LIMITS.maxOutputTokens,
    instructions: `${instructions}${loopGuardInstruction}`,
    messages: await convertToModelMessages(body.messages, {
      tools,
      // Une clarification, une proposition de vue ou une réponse interrompue
      // peut légitimement laisser un appel interactif sans sortie. Il ne doit
      // pas rendre toutes les questions suivantes impossibles à convertir.
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    prepareStep({ steps, instructions: stepInstructions }) {
      const sqlSignatures = new Set(previousSqlSignatures);
      const toolOperations = new Set(previousToolOperations);
      for (const step of steps) {
        for (const call of step.toolCalls) {
          const genericKey = call.toolName === "execute_sql"
            && call.input
            && typeof call.input === "object"
            && "sql" in call.input
            && typeof call.input.sql === "string"
            ? `tool-execute_sql:${sqlAttemptSignature(call.input.sql)}`
            : `tool-${call.toolName}:${JSON.stringify(call.input)}`;
          toolOperations.add(genericKey);
          if (call.toolName !== "execute_sql") continue;
          const input = call.input;
          if (input && typeof input === "object" && "sql" in input && typeof input.sql === "string") {
            sqlSignatures.add(sqlAttemptSignature(input.sql));
          }
        }
      }
      const currentInstructions = typeof stepInstructions === "string"
        ? stepInstructions
        : `${instructions}${loopGuardInstruction}`;
      const sqlLimitReached = sqlSignatures.size >= MAX_SQL_CALLS_PER_QUESTION;
      const excludedTools = new Set(unavailableTools);
      if (sqlLimitReached) excludedTools.add("execute_sql");
      const toolLimitReached = toolOperations.size >= MAX_TOOL_OPERATIONS_PER_QUESTION;
      if (toolLimitReached) allToolNames.forEach(name => excludedTools.add(name));

      if (excludedTools.size === 0) return undefined;

      return {
        activeTools: allToolNames.filter(name => !excludedTools.has(name)),
        instructions: toolLimitReached
          ? `${currentInstructions}\n\nGarde-fou interne : le budget global d’opérations de cette question est atteint. N’appelle plus aucun tool. Termine avec les résultats vérifiés disponibles, sans exposer cette limite si ces résultats suffisent.`
          : !sqlLimitReached || currentInstructions.includes("Garde-fou interne : trois requêtes SQL")
          ? currentInstructions
          : `${currentInstructions}\n\nGarde-fou interne : trois requêtes SQL distinctes ont déjà été tentées pour la question courante. N’appelle plus execute_sql. Si les résultats obtenus suffisent, réponds normalement sans mentionner cette limite technique. Sinon, explique seulement que l’analyse n’a pas pu être vérifiée et propose à l’utilisateur de préciser sa question.`,
      };
    },
    stopWhen: isStepCount(MAX_STEPS),
    abortSignal: modelAbortSignal(
      event,
      Math.min(MODEL_REQUEST_TIMEOUT_MS, remainingTurnTime),
    ),
    onStepFinish() {
      completedStepCount += 1;
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    messageMetadata({ part }) {
      if (part.type === "start") return {
        createdAt: new Date().toISOString(),
        modelId: activeModelId,
        promptVersion: EXPLORATION_PROMPT_VERSION,
      };
      if (part.type === "finish") {
        capacity.release();
        return {
          finishReason: part.finishReason,
          modelId: activeModelId,
          promptVersion: EXPLORATION_PROMPT_VERSION,
          prototypeStepLimitReached: completedStepCount >= MAX_STEPS && part.finishReason === "tool-calls",
          totalUsage: part.totalUsage,
        };
      }
    },
    onError(error) {
      capacity.release();
      console.error("Exploration agent error", error);
      return agentErrorMessage(error);
    },
  });
});
