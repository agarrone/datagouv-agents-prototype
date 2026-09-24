import { describe, expect, it } from "vitest";
import {
  validateDashboardVisualization,
  type DashboardVisualizationDefinition,
} from "../shared/types/dashboard-visualization";

const chart: DashboardVisualizationDefinition = {
  version: 1,
  kind: "chart",
  title: "Festivals par région",
  description: "Nombre de festivals regroupés par région.",
  size: "medium",
  data: { resourceId: "festivals-france", engine: "duckdb-sql", query: "SELECT region, COUNT(*) AS total FROM data GROUP BY region" },
  filters: [],
  specification: {
    type: "bar",
    title: "Festivals par région",
    description: "Nombre de festivals regroupés par région.",
    xField: "region",
    series: [{ field: "total", label: "Festivals" }],
  },
  appearance: { orientation: "vertical", palette: ["#000091"], showLegend: false, showValues: true },
};

describe("dashboard visualization contract", () => {
  it("validates a visualization against its transformed rows", () => {
    expect(validateDashboardVisualization(chart, [{ region: "Occitanie", total: 42 }])).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it("reports missing result fields and unsafe query shapes", () => {
    const invalid = structuredClone(chart);
    invalid.data.query = "DELETE FROM data";
    expect(validateDashboardVisualization(invalid, [{ region: "Occitanie" }])).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        "La requête doit commencer par SELECT ou WITH.",
        "Le champ « total » est absent du résultat SQL.",
      ]),
    });
  });

  it("validates every series of a multi-series chart", () => {
    const multiSeries = structuredClone(chart);
    if (multiSeries.kind !== "chart") throw new Error("Expected a chart definition");
    multiSeries.specification.series.push({ field: "average", label: "Moyenne" });
    expect(validateDashboardVisualization(multiSeries, [{ region: "Occitanie", total: 42, average: 12 }]).valid).toBe(true);
    expect(validateDashboardVisualization(multiSeries, [{ region: "Occitanie", total: 42 }]).errors).toContain(
      "Le champ « average » est absent du résultat SQL.",
    );
  });
});
