export type ExplorationErrorKind =
  | "network"
  | "provider"
  | "sql"
  | "duckdb"
  | "visualization"
  | "unknown";

export type ExplorationRecoveryAction =
  | "retry"
  | "reload-resource"
  | "clarify";

export interface ExplorationErrorPresentation {
  kind: ExplorationErrorKind;
  title: string;
  message: string;
  action: ExplorationRecoveryAction;
  actionLabel: string;
  technicalDetails: string;
}

const providerPattern = /provider|fournisseur|mod[eè]le|gateway|albert|api key|unauthori[sz]ed|quota|rate.?limit|\b401\b|\b403\b|\b429\b/i;
const networkPattern = /network|fetch|connexion|connect|timeout|timed out|econn|enotfound|socket|hors ligne/i;
const sqlPattern = /\bsql\b|parser|syntax|binder|catalog|column|colonne|ambiguous|conversion|query|requ[eê]te/i;
const duckDbPattern = /duckdb|wasm|parquet|table data|database|base de donn[eé]es|fichier.*charg/i;

export function classifyExplorationError(
  reason: unknown,
  context?: "sql" | "duckdb" | "visualization" | "provider",
): ExplorationErrorPresentation {
  const technicalDetails = reason instanceof Error
    ? reason.message
    : typeof reason === "string" && reason.trim()
      ? reason
      : "Erreur technique non renseignée.";

  const kind: ExplorationErrorKind = context
    ?? (providerPattern.test(technicalDetails)
      ? "provider"
      : networkPattern.test(technicalDetails)
        ? "network"
        : sqlPattern.test(technicalDetails)
          ? "sql"
          : duckDbPattern.test(technicalDetails)
            ? "duckdb"
            : "unknown");

  return ({
    network: {
      kind,
      title: "Connexion interrompue",
      message: "La communication avec le service a été interrompue. Vous pouvez relancer la réponse.",
      action: "retry",
      actionLabel: "Réessayer",
      technicalDetails,
    },
    provider: {
      kind,
      title: "Service d’intelligence artificielle indisponible",
      message: "Le fournisseur n’a pas pu terminer la réponse. Réessayez dans quelques instants.",
      action: "retry",
      actionLabel: "Réessayer",
      technicalDetails,
    },
    sql: {
      kind,
      title: "La requête n’a pas pu être validée",
      message: "La question peut nécessiter une autre colonne, une autre valeur ou une précision supplémentaire.",
      action: "clarify",
      actionLabel: "Préciser la question",
      technicalDetails,
    },
    duckdb: {
      kind,
      title: "La ressource n’a pas pu être interrogée",
      message: "Le moteur local n’a pas pu lire correctement la ressource. Rechargez-la avant de réessayer.",
      action: "reload-resource",
      actionLabel: "Recharger la ressource",
      technicalDetails,
    },
    visualization: {
      kind,
      title: "La visualisation n’a pas pu être créée",
      message: "Les données ou les champs demandés ne permettent pas encore de produire cette visualisation.",
      action: "clarify",
      actionLabel: "Préciser la demande",
      technicalDetails,
    },
    unknown: {
      kind,
      title: "La réponse a été interrompue",
      message: "L’assistant n’a pas pu terminer cette opération. Vous pouvez la relancer.",
      action: "retry",
      actionLabel: "Réessayer",
      technicalDetails,
    },
  } satisfies Record<ExplorationErrorKind, ExplorationErrorPresentation>)[kind];
}
