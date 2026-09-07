import { describe, expect, it } from "vitest";
import { nextPublicationStage, publicationStageIds, publicationWorkflow } from "../shared/agents/publication-workflow";
import { publicationTools } from "../shared/agents/publication-tools";

describe("publication workflow", () => {
  it("keeps one ordered path through all metadata groups", () => {
    const visited = ["identity"];
    let current = "identity" as keyof typeof publicationWorkflow;

    while (nextPublicationStage(current)) {
      current = nextPublicationStage(current)!;
      visited.push(current);
    }

    expect(visited).toEqual([...publicationStageIds]);
  });

  it("references an existing suggestion tool for every active stage", () => {
    for (const stage of publicationStageIds) {
      const tool = publicationWorkflow[stage].tool;
      if (tool) expect(publicationTools).toHaveProperty(tool);
    }
  });

  it("provides a dedicated interactive clarification tool", () => {
    expect(publicationTools).toHaveProperty("request_publication_clarification");
  });
});
