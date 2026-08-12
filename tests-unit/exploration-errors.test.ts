import { describe, expect, it } from "vitest";
import { classifyExplorationError } from "~~/shared/errors/exploration";

describe("exploration error presentation", () => {
  it("distinguishes provider and network failures", () => {
    expect(classifyExplorationError("AI Gateway rate limit 429").kind).toBe("provider");
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

  it("keeps the raw error only as technical details", () => {
    const error = classifyExplorationError("Parser Error at line 1", "sql");
    expect(error.message).not.toContain("Parser Error");
    expect(error.technicalDetails).toBe("Parser Error at line 1");
  });
});
