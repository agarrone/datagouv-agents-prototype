export type ExplorationErrorKind = "network" | "provider" | "prototype" | "sql" | "duckdb" | "visualization" | "external" | "unknown";

export type ExplorationErrorCode =
  | "network_interrupted" | "ai_rate_limit" | "ai_account_quota"
  | "ai_authentication" | "ai_model_unavailable" | "ai_context_limit"
  | "ai_output_limit" | "ai_content_filter" | "ai_provider_unavailable"
  | "prototype_configuration" | "prototype_invalid_request"
  | "prototype_step_limit" | "prototype_tool_runtime" | "sql_invalid"
  | "sql_restricted" | "duckdb_initialization" | "resource_unavailable"
  | "visualization_invalid" | "external_service_unavailable" | "unknown";

export type ExplorationErrorSource = "albert" | "ai-provider" | "prototype" | "browser" | "duckdb" | "data.gouv.fr" | "cartography" | "external-service" | "unknown";
export type ExplorationRecoveryAction = "retry" | "reload-resource" | "clarify";

export interface SerializedExplorationError {
  code: ExplorationErrorCode;
  source: ExplorationErrorSource;
  technicalDetails: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
  requestId?: string;
}

export interface ExplorationErrorPresentation extends SerializedExplorationError {
  kind: ExplorationErrorKind;
  title: string;
  message: string;
  sourceLabel: string;
  action?: ExplorationRecoveryAction;
  actionLabel?: string;
}

export const EXPLORATION_ERROR_PREFIX = "DATAGOUV_AGENT_ERROR:";

const providerPattern = /provider|fournisseur|mod[eè]le|gateway|albert|api key|unauthori[sz]ed|quota|rate.?limit|trop de demandes|too many requests|\b401\b|\b403\b|\b429\b/i;
const networkPattern = /network|fetch|connexion|connect|timeout|timed out|econn|enotfound|socket|hors ligne|aborted/i;
const sqlPattern = /\bsql\b|parser|syntax|binder|catalog|column|colonne|ambiguous|conversion|query|requ[eê]te/i;
const duckDbPattern = /duckdb|wasm|parquet|table data|database|base de donn[eé]es|fichier.*charg|memory/i;

function rawDetails(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string" && reason.trim()) return reason;
  if (reason && typeof reason === "object") {
    for (const key of ["data", "statusMessage", "message"]) {
      if (!(key in reason)) continue;
      const value = (reason as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value;
      if (value && typeof value === "object" && "code" in value && "source" in value) {
        return `${EXPLORATION_ERROR_PREFIX}${JSON.stringify(value)}`;
      }
    }
  }
  return "Erreur technique non renseignée.";
}

export function serializeExplorationError(error: SerializedExplorationError) {
  return `${EXPLORATION_ERROR_PREFIX}${JSON.stringify(error)}`;
}

export function parseSerializedExplorationError(reason: unknown): SerializedExplorationError | undefined {
  if (reason && typeof reason === "object" && "code" in reason && "source" in reason) return reason as SerializedExplorationError;
  const text = rawDetails(reason);
  const markerIndex = text.indexOf(EXPLORATION_ERROR_PREFIX);
  if (markerIndex < 0) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      for (const candidate of [parsed, parsed.data, parsed.error]) {
        if (candidate && typeof candidate === "object" && "code" in candidate && "source" in candidate) return candidate as SerializedExplorationError;
      }
    }
    catch {
      // Les erreurs ordinaires ne sont pas nécessairement sérialisées en JSON.
    }
    return undefined;
  }
  try {
    const parsed = JSON.parse(text.slice(markerIndex + EXPLORATION_ERROR_PREFIX.length).trim()) as SerializedExplorationError;
    return parsed?.code && parsed?.source ? parsed : undefined;
  }
  catch {
    return undefined;
  }
}

function inferError(reason: unknown, context?: "sql" | "duckdb" | "visualization" | "provider"): SerializedExplorationError {
  const technicalDetails = rawDetails(reason);
  if (context === "sql") return { code: /seules les requêtes|non autoris[eé]e|une seule requête/i.test(technicalDetails) ? "sql_restricted" : "sql_invalid", source: "duckdb", technicalDetails, retryable: false };
  if (context === "duckdb") return {
    code: /wasm|worker|instantiate|memory|allocation|out of memory/i.test(technicalDetails) ? "duckdb_initialization" : "resource_unavailable",
    source: "duckdb",
    technicalDetails,
    retryable: true,
  };
  if (context === "visualization") return { code: "visualization_invalid", source: "prototype", technicalDetails, retryable: false };
  if (context === "provider" || providerPattern.test(technicalDetails)) return { code: /429|quota|rate.?limit|trop de demandes|too many requests/i.test(technicalDetails) ? "ai_rate_limit" : "ai_provider_unavailable", source: /albert/i.test(technicalDetails) ? "albert" : "ai-provider", technicalDetails, retryable: true };
  if (networkPattern.test(technicalDetails)) return { code: "network_interrupted", source: "browser", technicalDetails, retryable: true };
  if (/data\.gouv\.fr|m[eé]tadonn[eé]es|hydra/i.test(technicalDetails)) return { code: "external_service_unavailable", source: "data.gouv.fr", technicalDetails, retryable: true };
  if (/contours|fond de carte|cartograph|maplibre/i.test(technicalDetails)) return { code: "external_service_unavailable", source: "cartography", technicalDetails, retryable: true };
  if (sqlPattern.test(technicalDetails)) return { code: "sql_invalid", source: "duckdb", technicalDetails, retryable: false };
  if (duckDbPattern.test(technicalDetails)) return { code: "resource_unavailable", source: "duckdb", technicalDetails, retryable: true };
  return { code: "unknown", source: "unknown", technicalDetails, retryable: true };
}

const sourceLabels: Record<ExplorationErrorSource, string> = {
  albert: "Service Albert", "ai-provider": "Fournisseur IA", prototype: "Prototype",
  browser: "Connexion du navigateur", duckdb: "Moteur local DuckDB",
  "data.gouv.fr": "Service data.gouv.fr", cartography: "Service cartographique",
  "external-service": "Service externe", unknown: "Origine indéterminée",
};

export function classifyExplorationError(reason: unknown, context?: "sql" | "duckdb" | "visualization" | "provider"): ExplorationErrorPresentation {
  const error = parseSerializedExplorationError(reason) ?? inferError(reason, context);
  const retryDelay = error.retryAfterSeconds ? ` Vous pourrez réessayer dans ${error.retryAfterSeconds} seconde${error.retryAfterSeconds > 1 ? "s" : ""}.` : "";
  const presentations = {
    network_interrupted: ["network", "Connexion interrompue", "La communication entre votre navigateur et le prototype a été interrompue.", "retry", "Réessayer"],
    ai_rate_limit: ["provider", "Quota temporaire atteint", `Le service d’intelligence artificielle reçoit trop de demandes. Le problème ne vient pas de votre question.${retryDelay}`, "retry", "Réessayer"],
    ai_account_quota: ["provider", "Quota du compte épuisé", "Le compte utilisé par le prototype a consommé le quota qui lui était attribué. L’équipe du prototype doit intervenir.", undefined, undefined],
    ai_authentication: ["provider", "Accès au service IA refusé", "La clé ou les droits du fournisseur IA ne sont pas valides. Le problème vient de la configuration du prototype.", undefined, undefined],
    ai_model_unavailable: ["provider", "Modèle indisponible", "Le modèle configuré n’est pas accessible avec ce compte. Le problème vient de la configuration du prototype.", undefined, undefined],
    ai_context_limit: ["provider", "Conversation trop volumineuse", "La conversation et le contexte des données dépassent la capacité du modèle.", "clarify", "Poser une question plus ciblée"],
    ai_output_limit: ["provider", "Réponse interrompue par sa longueur", "La réponse a atteint la longueur maximale autorisée avant d’être terminée.", "clarify", "Demander une réponse plus concise"],
    ai_content_filter: ["provider", "Réponse arrêtée par le fournisseur", "Le fournisseur IA a interrompu la génération en raison de ses règles de contenu.", "clarify", "Reformuler la question"],
    ai_provider_unavailable: ["provider", "Service d’intelligence artificielle indisponible", "Le fournisseur IA n’a pas pu terminer la réponse. Vous pouvez réessayer dans quelques instants.", "retry", "Réessayer"],
    prototype_configuration: ["prototype", "Assistant non configuré", "Le prototype ne dispose pas d’une configuration IA complète. L’équipe doit corriger le déploiement.", undefined, undefined],
    prototype_invalid_request: ["prototype", "Demande mal préparée par le prototype", "Le prototype n’a pas correctement transmis la conversation ou le contexte de la ressource.", "retry", "Réessayer"],
    prototype_step_limit: ["prototype", "Limite d’analyse du prototype atteinte", "L’assistant a consommé le nombre d’opérations autorisé pour cette question. Ce n’est pas un dépassement du quota de tokens du compte.", "clarify", "Préciser la question"],
    prototype_tool_runtime: ["prototype", "Opération du prototype interrompue", "Un composant local n’a pas pu exécuter l’opération demandée.", "retry", "Réessayer"],
    sql_invalid: ["sql", "La requête n’a pas pu être validée", "La requête ne correspond pas encore à la structure ou aux valeurs de cette ressource.", "clarify", "Préciser la question"],
    sql_restricted: ["sql", "Opération SQL non autorisée", "Le prototype accepte uniquement une requête de lecture SELECT ou WITH à la fois.", "clarify", "Modifier la requête"],
    duckdb_initialization: ["duckdb", "Moteur local indisponible", "DuckDB n’a pas pu démarrer dans ce navigateur ou ne dispose pas de suffisamment de mémoire.", "reload-resource", "Recharger la ressource"],
    resource_unavailable: ["duckdb", "Ressource impossible à interroger", "Le moteur local n’a pas pu accéder à la ressource ou la lire correctement.", "reload-resource", "Recharger la ressource"],
    visualization_invalid: ["visualization", "Visualisation impossible à créer", "Les données ou les champs demandés ne permettent pas encore de produire cette visualisation.", "clarify", "Préciser la demande"],
    external_service_unavailable: ["external", "Service externe indisponible", "Un service nécessaire à cette opération ne répond pas correctement.", "retry", "Réessayer"],
    unknown: ["unknown", "Réponse interrompue", "L’origine du problème n’a pas encore pu être déterminée. Vous pouvez relancer l’opération.", "retry", "Réessayer"],
  } as const;
  const [kind, title, message, action, actionLabel] = presentations[error.code];
  return { ...error, kind, title, message, sourceLabel: sourceLabels[error.source], action, actionLabel };
}

export function finishReasonError(reason?: string): SerializedExplorationError | undefined {
  if (reason === "length") return { code: "ai_output_limit", source: "ai-provider", technicalDetails: "finishReason=length", retryable: false };
  if (reason === "content-filter") return { code: "ai_content_filter", source: "ai-provider", technicalDetails: "finishReason=content-filter", retryable: false };
  if (reason === "error") return { code: "ai_provider_unavailable", source: "ai-provider", technicalDetails: "finishReason=error", retryable: true };
  return undefined;
}
