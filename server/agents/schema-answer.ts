import { humanizeDuckDbType } from "~~/shared/data/duckdb-types";
import type { ResourceContext } from "~~/shared/schemas/agent";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const columnQuestionPatterns = [
  /\bquelles?\s+sont\s+les\s+colonnes\b/i,
  /\bliste(?:r|e)?\s+(?:toutes?\s+)?(?:les|des)\s+colonnes\b/i,
  /\bquel(?:le)?\s+est\s+(?:le|la)\s+sch[ée]ma\b/i,
  /\bwhat\s+(?:are\s+the|are)\s+columns\b/i,
  /\blist\s+(?:all\s+)?(?:the\s+)?columns\b/i,
];

function latestUserText(messages: ExplorationMessage[]) {
  const message = messages.findLast(item => item.role === "user");
  return message?.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("\n")
    .trim() ?? "";
}

function markdownCode(value: string) {
  return `\`${value.replace(/\|/g, "\\|").replace(/`/g, "ˋ")}\``;
}

export function deterministicSchemaAnswer(
  messages: ExplorationMessage[],
  resource: ResourceContext,
) {
  if (!resource.schema) return undefined;
  const question = latestUserText(messages);
  if (!columnQuestionPatterns.some(pattern => pattern.test(question))) {
    return undefined;
  }

  const maximumRows = 20;
  const visibleColumns = resource.schema.columns.slice(0, maximumRows);
  const table = [
    "| Colonne | Type |",
    "| --- | --- |",
    ...visibleColumns.map(column =>
      `| ${markdownCode(column.name)} | ${humanizeDuckDbType(column.type)} |`,
    ),
  ].join("\n");
  const remaining = resource.schema.columns.length - visibleColumns.length;
  const suffix = remaining > 0
    ? `\n\n${visibleColumns.length} colonnes sont affichées sur ${resource.schema.columns.length}. Consultez le sélecteur « Colonnes » de l’explorateur pour voir la liste complète.`
    : "";

  return `Cette ressource contient ${resource.schema.columns.length} colonne${resource.schema.columns.length > 1 ? "s" : ""}.\n\n${table}${suffix}`;
}
