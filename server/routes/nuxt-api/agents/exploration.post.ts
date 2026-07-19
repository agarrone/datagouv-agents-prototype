import {
  convertToModelMessages,
  streamText,
} from "ai";
import { explorationTools } from "~~/shared/agents/exploration-tools";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { useAgentModel } from "~~/server/agents/provider";

const instructions = `
Tu es l’assistant d’exploration d’un prototype data.gouv.fr.

La ressource est une table DuckDB nommée data, chargée uniquement dans le
navigateur. Tu ne connais jamais son contenu sans preuve fournie par un tool.

Règles :
- réponds en français ;
- utilise inspect_schema lorsque le schéma n’est pas présent dans le fil ;
- utilise execute_sql pour toute question portant sur les valeurs ou les
  statistiques de la ressource ;
- écris une unique requête DuckDB en lecture seule sur la table data ;
- limite les projections aux colonnes utiles à la réponse ;
- fonde la réponse finale uniquement sur les résultats fournis ;
- si un tool échoue, explique sobrement l’échec sans inventer de résultat ;
- reste concis et cite les valeurs importantes.
`;

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: ExplorationMessage[] }>(event);
  if (!Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      statusMessage: "La liste des messages est absente.",
    });
  }

  const result = streamText({
    model: useAgentModel(),
    instructions,
    messages: await convertToModelMessages(body.messages, {
      tools: explorationTools,
    }),
    tools: explorationTools,
    abortSignal: event.node.req.signal,
  });

  return result.toUIMessageStreamResponse({
    onError(error) {
      console.error("Exploration agent error", error);
      return "L’assistant n’a pas pu terminer cette réponse.";
    },
  });
});
