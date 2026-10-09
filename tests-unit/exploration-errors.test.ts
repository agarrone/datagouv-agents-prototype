import { describe, expect, it } from "vitest";
import {
  classifyExplorationError,
  finishReasonError,
  serializeExplorationError,
} from "~~/shared/errors/exploration";

describe("exploration error presentation", () => {
  it("distinguishes provider and network failures", () => {
    expect(classifyExplorationError("Albert rate limit 429").kind).toBe("provider");
    expect(classifyExplorationError("fetch failed: network timeout").kind).toBe("network");
  });

  it("uses an explicit context for local operations", () => {
    const sql = classifyExplorationError("Binder Error: column missing", "sql");
    const duckdb = classifyExplorationError("Impossible de lire le fichier", "duckdb");
    const visualization = classifyExplorationError("Champ latitude absent", "visualization");

    expect(sql.action).toBe("clarify");
    expect(duckdb.action).toBe("reload-resource");
    expect(visualization.actionLabel).toBe("Préciser la demande");
  });

  it("presents blocked external SQL reads as a restriction", () => {
    const error = classifyExplorationError(
      "La requête ne peut pas lire une source externe. Utilisez uniquement la table data.",
      "sql",
    );

    expect(error.code).toBe("sql_restricted");
    expect(error.title).toBe("Opération SQL non autorisée");
  });

  it("keeps the raw error only as technical details", () => {
    const error = classifyExplorationError("Parser Error at line 1", "sql");
    expect(error.message).not.toContain("Parser Error");
    expect(error.technicalDetails).toBe("Parser Error at line 1");
  });

  it("preserves structured quota details", () => {
    const serialized = serializeExplorationError({
      code: "ai_rate_limit",
      source: "albert",
      retryable: true,
      retryAfterSeconds: 24,
      requestId: "req_demo",
      technicalDetails: "HTTP 429 · tokens_per_minute exceeded",
    });
    const error = classifyExplorationError(new Error(serialized));

    expect(error.title).toBe("Quota temporaire atteint");
    expect(error.sourceLabel).toBe("Service Albert");
    expect(error.retryAfterSeconds).toBe(24);
    expect(error.requestId).toBe("req_demo");
    expect(error.message).toContain("ne vient pas de votre question");
  });

  it("distinguishes account quota from a temporary rate limit", () => {
    const error = classifyExplorationError({
      code: "ai_account_quota",
      source: "albert",
      retryable: false,
      technicalDetails: "insufficient_quota",
    });

    expect(error.title).toBe("Quota du compte épuisé");
    expect(error.action).toBeUndefined();
  });

  it("distinguishes local throttling, queue pressure and the shared budget", () => {
    const local = classifyExplorationError({
      code: "prototype_rate_limit",
      source: "prototype",
      retryable: true,
      retryAfterSeconds: 5,
      technicalDetails: "Deux réponses sont déjà en cours.",
    });
    const queue = classifyExplorationError({
      code: "prototype_queue_timeout",
      source: "prototype",
      retryable: true,
      retryAfterSeconds: 15,
      technicalDetails: "File locale pleine.",
    });
    const budget = classifyExplorationError({
      code: "prototype_global_budget",
      source: "prototype",
      retryable: true,
      technicalDetails: "80 % du quota quotidien atteint.",
    });

    expect(local.title).toBe("Demandes trop rapprochées");
    expect(queue.title).toBe("Forte affluence");
    expect(budget.message).toContain("ne vient pas de votre question");
  });

  it("identifies output and prototype limits", () => {
    expect(classifyExplorationError(finishReasonError("length")).code).toBe("ai_output_limit");
    expect(classifyExplorationError({
      code: "prototype_step_limit",
      source: "prototype",
      retryable: false,
      technicalDetails: "stopWhen=isStepCount(5)",
    }).message).toContain("pas un dépassement du quota");
  });

  it("parses structured data from an HTTP error body", () => {
    const error = classifyExplorationError(new Error(JSON.stringify({
      statusCode: 503,
      data: {
        code: "prototype_configuration",
        source: "prototype",
        retryable: false,
        technicalDetails: "Aucun fournisseur configuré",
      },
    })));
    expect(error.code).toBe("prototype_configuration");
    expect(error.sourceLabel).toBe("Prototype");
  });
});
