import { describe, expect, it } from "vitest";
import { resolveMapFields } from "../shared/maps/map-field-resolution";

describe("map field resolution", () => {
  it("keeps exact fields unchanged", () => {
    const result = resolveMapFields({
      type: "points",
      title: "Carte",
      description: "Points",
      latitudeField: "latitude",
      longitudeField: "longitude",
      labelField: "nom",
    }, ["latitude", "longitude", "nom"], [{ latitude: 48.8, longitude: 2.3, nom: "Paris" }]);

    expect(result.corrections).toEqual([]);
  });

  it("repairs unique, validated aliases", () => {
    const result = resolveMapFields({
      type: "points",
      title: "Carte",
      description: "Points",
      latitudeField: "lat",
      longitudeField: "lon",
      labelField: "name",
    }, ["Latitude", "Longitude", "Nom du festival"], [{
      Latitude: 48.8,
      Longitude: 2.3,
      "Nom du festival": "Festival test",
    }]);

    expect(result.spec).toMatchObject({
      latitudeField: "Latitude",
      longitudeField: "Longitude",
      labelField: "Nom du festival",
    });
    expect(result.corrections).toHaveLength(3);
  });

  it("refuses an ambiguous label instead of guessing", () => {
    expect(() => resolveMapFields({
      type: "points",
      title: "Carte",
      description: "Points",
      latitudeField: "latitude",
      longitudeField: "longitude",
      labelField: "libelle",
    }, ["latitude", "longitude", "nom", "titre"], [{
      latitude: 48.8,
      longitude: 2.3,
      nom: "Paris",
      titre: "Festival",
    }])).toThrow("plusieurs colonnes");
  });

  it("drops an optional measure when it cannot be identified safely", () => {
    const result = resolveMapFields({
      type: "points",
      title: "Carte",
      description: "Points",
      latitudeField: "latitude",
      longitudeField: "longitude",
      labelField: "nom",
      valueField: "frequentation",
    }, ["latitude", "longitude", "nom"], [{ latitude: 48.8, longitude: 2.3, nom: "Paris" }]);

    expect(result.spec.valueField).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });

  it("also refuses ambiguity for optional fields", () => {
    expect(() => resolveMapFields({
      type: "points",
      title: "Carte",
      description: "Points",
      latitudeField: "latitude",
      longitudeField: "longitude",
      labelField: "nom",
      valueField: "mesure",
    }, ["latitude", "longitude", "nom", "score", "total"], [{
      latitude: 48.8,
      longitude: 2.3,
      nom: "Paris",
      score: 12,
      total: 42,
    }])).toThrow("plusieurs colonnes");
  });
});
