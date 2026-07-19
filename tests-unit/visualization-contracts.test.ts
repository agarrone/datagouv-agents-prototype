import { describe, expect, it } from "vitest";
import {
  chartRequiredFields,
  mapRequiredFields,
} from "../shared/agents/visualization-fields";
import {
  normalizeTerritoryCode,
  normalizeTerritoryName,
} from "../shared/maps/territory-match";

describe("visualization field contracts", () => {
  it("keeps every chart dimension and measure", () => {
    expect(chartRequiredFields({
      type: "bar",
      title: "Vues",
      description: "Vues par organisation",
      xField: "organization",
      xLabel: "Organisation",
      series: [{ field: "views", label: "Vues" }],
    })).toEqual(["organization", "views"]);
  });

  it("requires coordinates and label for a point map", () => {
    expect(mapRequiredFields({
      type: "points",
      title: "Festivals",
      description: "Localisation des festivals",
      latitudeField: "latitude",
      longitudeField: "longitude",
      labelField: "name",
    })).toEqual(["name", "latitude", "longitude"]);
  });

  it("requires territory and measure for a choropleth", () => {
    expect(mapRequiredFields({
      type: "choropleth",
      title: "Festivals",
      description: "Nombre par département",
      boundary: "france-departments",
      dataKey: "department_code",
      valueField: "count",
      labelField: "department_name",
      valueLabel: "Festivals",
    })).toEqual(["department_name", "count", "department_code"]);
  });
});

describe("territory matching", () => {
  it("normalizes short numeric and Corsican codes", () => {
    expect(normalizeTerritoryCode(" 7 ")).toBe("07");
    expect(normalizeTerritoryCode("2a")).toBe("2A");
  });

  it("matches accented and code-prefixed names", () => {
    expect(normalizeTerritoryName("11 - Île-de-France"))
      .toBe(normalizeTerritoryName("Ile de France"));
  });
});
