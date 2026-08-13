import type { ExplorationMessage } from "~~/shared/types/exploration";

function messageText(message: ExplorationMessage) {
  return message.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join(" ")
    .trim();
}

export function latestUserRequest(messages: ExplorationMessage[]) {
  return [...messages]
    .reverse()
    .find(message => message.role === "user");
}

export function requestsExplorerChange(messages: ExplorationMessage[]) {
  const message = latestUserRequest(messages);
  if (!message) return false;
  const text = messageText(message).toLocaleLowerCase("fr");

  return [
    /^(?:(?:peux|pourrais)-tu\s+|merci de\s+)?filtre\b/,
    /\bfiltr(?:er|ez|ons)\b/,
    /^(?:(?:peux|pourrais)-tu\s+|merci de\s+)?trie\b/,
    /\btri(?:er|ez|ons)\b/,
    /\bappliqu(?:e|er|ez|ons)\b.{0,40}\b(?:filtre|tri|vue|requ[eê]te)\b/,
    /\b(?:affich(?:e|er|ez|ons)|montr(?:e|er|ez|ons))\b.{0,60}\b(?:tableau|explorateur)\b/,
    /\b(?:dans|sur|au)\s+(?:le\s+|l[’'])?(?:tableau|explorateur)\b/,
    /\b(?:garde|conserve)\s+(?:uniquement|seulement)\b/,
  ].some(pattern => pattern.test(text));
}

export function explorerIntentInstruction(messages: ExplorationMessage[]) {
  if (!requestsExplorerChange(messages)) return "";
  return `

Intention d’interface détectée pour cette demande : l’utilisateur demande de
modifier la vue de l’explorateur. Conserve cette intention après toute demande
de clarification. Dès qu’une requête SQL correspondant au filtre ou au tri a
été exécutée avec succès, appelle propose_explorer_view avec cette même requête.
Ne te contente pas d’indiquer dans le texte que le filtre peut être appliqué.`;
}
