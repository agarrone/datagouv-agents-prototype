import {
  APICallError,
  EmptyResponseBodyError,
  InvalidPromptError,
  InvalidResponseDataError,
  NoContentGeneratedError,
  NoSuchModelError,
} from "ai";
import type {
  ExplorationErrorCode,
  ExplorationErrorSource,
  SerializedExplorationError,
} from "~~/shared/errors/exploration";
import { serializeExplorationError } from "~~/shared/errors/exploration";

function compact(value: string | undefined, fallback: string) {
  return (value?.trim() || fallback).slice(0, 1200);
}

function header(headers: Record<string, string> | undefined, name: string) {
  const entry = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
}

function retryAfterSeconds(headers?: Record<string, string>) {
  const value = header(headers, "retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function providerSource(error: APICallError): ExplorationErrorSource {
  return /albert/i.test(`${error.url} ${error.message}`) ? "albert" : "ai-provider";
}

function apiErrorCode(error: APICallError): ExplorationErrorCode {
  const details = `${error.message} ${error.responseBody ?? ""}`;
  if (error.statusCode === 429) {
    return /insufficient.quota|quota.exceeded|credit|billing|budget|monthly|daily|épuis/i.test(details)
      ? "ai_account_quota"
      : "ai_rate_limit";
  }
  if (error.statusCode === 401 || error.statusCode === 403) return "ai_authentication";
  if (error.statusCode === 404 || /model.*(?:not found|unavailable|access|permission)|mod[eè]le.*(?:indisponible|acc[eè]s)/i.test(details)) return "ai_model_unavailable";
  if (/context.length|maximum context|too many tokens|token limit|contexte.*(?:long|volumineux)/i.test(details)) return "ai_context_limit";
  return "ai_provider_unavailable";
}

export function normalizeAgentError(error: unknown): SerializedExplorationError {
  if (APICallError.isInstance(error)) {
    const responseDetails = error.responseBody
      ? ` · réponse=${compact(error.responseBody, "")}`
      : "";
    const requestId = header(error.responseHeaders, "x-request-id")
      ?? header(error.responseHeaders, "request-id")
      ?? header(error.responseHeaders, "x-vercel-id");
    return {
      code: apiErrorCode(error),
      source: providerSource(error),
      retryable: error.isRetryable,
      retryAfterSeconds: retryAfterSeconds(error.responseHeaders),
      requestId,
      technicalDetails: compact(
        `HTTP ${error.statusCode ?? "inconnu"} · ${error.message}${responseDetails}`,
        "Erreur du fournisseur IA.",
      ),
    };
  }
  if (NoSuchModelError.isInstance(error)) return { code: "ai_model_unavailable", source: "ai-provider", retryable: false, technicalDetails: compact(error.message, "Modèle inconnu.") };
  if (InvalidPromptError.isInstance(error)) return { code: /token|context/i.test(error.message) ? "ai_context_limit" : "prototype_invalid_request", source: "prototype", retryable: false, technicalDetails: compact(error.message, "Prompt invalide.") };
  if (EmptyResponseBodyError.isInstance(error) || InvalidResponseDataError.isInstance(error) || NoContentGeneratedError.isInstance(error)) return { code: "ai_provider_unavailable", source: "ai-provider", retryable: true, technicalDetails: compact(error.message, "Réponse fournisseur invalide.") };

  const message = error instanceof Error ? error.message : String(error);
  if (/aucun fournisseur.*configur|variables.*gateway|variables.*albert/i.test(message)) return { code: "prototype_configuration", source: "prototype", retryable: false, technicalDetails: compact(message, "Configuration IA absente.") };
  if (/runtime des tools|tool.*initialis|tool.*ex[eé]cut/i.test(message)) return { code: "prototype_tool_runtime", source: "prototype", retryable: true, technicalDetails: compact(message, "Runtime des tools indisponible.") };
  if (/timeout|timed out|fetch failed|econn|enotfound|socket/i.test(message)) return { code: "network_interrupted", source: "prototype", retryable: true, technicalDetails: compact(message, "Connexion interrompue.") };
  return { code: "unknown", source: "prototype", retryable: true, technicalDetails: compact(message, "Erreur inconnue.") };
}

export function agentErrorMessage(error: unknown) {
  return serializeExplorationError(normalizeAgentError(error));
}
