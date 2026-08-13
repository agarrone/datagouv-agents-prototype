import { describe, expect, it } from "vitest";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import {
  explorerIntentInstruction,
  requestsExplorerChange,
} from "~~/server/agents/explorer-intent";

function messages(text: string): ExplorationMessage[] {
  return [{
    id: "user-message",
    role: "user",
    parts: [{ type: "text", text }],
  }];
}

describe("explorer intent", () => {
  it.each([
    "Filtre sur les données non-moissonnées",
    "Trie le tableau par nombre de vues",
    "Garde uniquement les organisations Lime",
    "Affiche ces résultats dans l’explorateur",
    "Applique cette requête comme filtre",
  ])("detects an explicit explorer change in: %s", (question) => {
    expect(requestsExplorerChange(messages(question))).toBe(true);
    expect(explorerIntentInstruction(messages(question))).toContain(
      "appelle propose_explorer_view",
    );
  });

  it.each([
    "Combien de jeux de données ne sont pas moissonnés ?",
    "Montre-moi les dix organisations principales",
    "Quel filtre serait pertinent ?",
    "Explique-moi le contenu de ce jeu de données",
  ])("does not turn an answer request into a view change: %s", (question) => {
    expect(requestsExplorerChange(messages(question))).toBe(false);
    expect(explorerIntentInstruction(messages(question))).toBe("");
  });
});
