import {
  convertToModelMessages,
  isStepCount,
  streamText,
} from "ai";
import { explorationTools } from "~~/shared/agents/exploration-tools";
import { resourceContextSchema } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import { useAgentModel } from "~~/server/agents/provider";
import { fetchDatasetMetadata } from "~~/server/services/datagouv";

const baseInstructions = `
Tu es l’assistant d’exploration d’un prototype data.gouv.fr.

La ressource est une table DuckDB nommée data, chargée uniquement dans le
navigateur. Tu ne connais jamais son contenu sans preuve fournie par un tool.

Règles :
- réponds en français ;
- utilise get_dataset_metadata pour les questions sur le jeu de données, son
  producteur, sa description, sa licence, sa qualité ou ses ressources ;
- utilise inspect_schema lorsque le schéma n’est pas présent dans le fil ;
- utilise execute_sql pour toute question portant sur les valeurs ou les
  statistiques de la ressource ;
- utilise propose_explorer_view après execute_sql uniquement lorsque
  l’utilisateur demande clairement à voir le résultat dans le tableau, à
  filtrer, trier ou transformer l’explorateur ;
- l’appel à propose_explorer_view crée lui-même la carte de confirmation dans
  l’interface : lorsque l’intention est claire, appelle le tool directement et
  ne demande jamais « souhaitez-vous appliquer » dans le texte ;
- ne propose pas de modifier le tableau pour une question qui attend seulement
  une réponse dans la conversation ;
- pour un simple filtre ou tri, conserve toutes les colonnes avec SELECT * ;
- ne projette des colonnes et ne réalise une agrégation dans l’explorateur que
  si l’utilisateur le demande explicitement ;
- si l’intention d’affichage ou le filtre est ambigu, demande une précision
  avant de proposer une vue ;
- réponds aussi à la question dans la conversation lorsqu’une vue est proposée ;
- utilise create_chart après execute_sql lorsqu’un graphique est explicitement
  demandé ou apporte une valeur évidente à la réponse ;
- lorsqu’un graphique est attendu, appelle directement create_chart : ne
  décris jamais sa spécification en JSON, en pseudo-code ou dans le texte ;
- seul l’appel à create_chart crée le composant visuel dans l’interface ;
- appelle create_chart immédiatement après la requête execute_sql réussie qui
  alimente le graphique ; create_chart réutilise automatiquement ce résultat ;
- après create_chart, ne simule jamais le graphique avec un tableau Markdown,
  un lien, une image Markdown ou une description de spécification ;
- limite la requête du graphique aux dimensions et mesures nécessaires ;
- choisis bar pour comparer des catégories, line ou area pour une évolution
  ordonnée dans le temps, pie pour une composition avec peu de catégories, et
  scatter pour étudier une relation entre deux mesures ;
- utilise create_map après execute_sql lorsqu’une carte est explicitement
  demandée ou lorsque la dimension géographique est essentielle à la réponse ;
- lorsqu’une carte est attendue, appelle directement create_map : seul ce tool
  crée la carte dans l’interface, sans JSON, pseudo-code ni carte simulée ;
- appelle create_map immédiatement après la requête execute_sql réussie qui
  alimente la carte ; create_map réutilise automatiquement ce résultat ;
- utilise le type points pour des colonnes de latitude et longitude, et le type
  geojson lorsqu’une colonne contient une géométrie ou Feature GeoJSON ;
- utilise choropleth pour comparer une mesure numérique agrégée entre régions
  ou départements français ; la requête doit alors renvoyer une ligne par
  territoire, son code officiel ou nom dans dataKey, et la mesure valueField ;
- pour choropleth, choisis france-regions ou france-departments selon le niveau
  demandé et n’invente jamais un code géographique absent des données ;
- la requête SQL doit inclure les coordonnées ou géométries, un libellé utile
  pour l’infobulle et, si pertinent, une mesure numérique ;
- après create_map, résume brièvement ce que montre la carte sans la remplacer
  par un tableau Markdown, un lien ou une image ;
- écris une unique requête DuckDB en lecture seule sur la table data ;
- limite les projections aux colonnes utiles à la réponse ;
- fonde la réponse finale uniquement sur les résultats fournis ;
- ne transforme pas les identifiants techniques en citations ou références ;
- si un tool échoue, explique sobrement l’échec sans inventer de résultat ;
- reste concis et cite les valeurs importantes.
`;

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
  const instructions = `${baseInstructions}

Contexte actif fourni par l’interface :
- jeu de données : ${resource.data.title}
- producteur : ${resource.data.organization}
- référence data.gouv.fr : ${resource.data.datasetId}
- ressource : ${resource.data.resourceName}
- identifiant de ressource : ${resource.data.resourceId}
- table locale : data
`;

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
    onError(error) {
      console.error("Exploration agent error", error);
      return agentErrorMessage(error);
    },
  });
});
