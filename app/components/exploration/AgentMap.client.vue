<script setup lang="ts">
import "maplibre-gl/dist/maplibre-gl.css";

import type {
  GeoJSONSource,
  MapGeoJSONFeature,
} from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  Geometry,
} from "geojson";
import type {
  DatasetRow,
  MapSpec,
} from "~~/shared/types/exploration";
import {
  normalizeTerritoryCode,
  normalizeTerritoryName,
} from "~~/shared/maps/territory-match";

const props = defineProps<{
  spec: MapSpec;
  rows: DatasetRow[];
  truncated: boolean;
  playCompletionSound?: boolean;
}>();

const mapElement = ref<HTMLElement | null>(null);
const { playUiSound } = useUiSound();
const renderedCount = ref(0);
const mapError = ref<string | null>(null);
const legendRange = ref<[number, number] | null>(null);
let maplibre: typeof import("maplibre-gl") | undefined;
let map: import("maplibre-gl").Map | undefined;
let resizeObserver: ResizeObserver | undefined;
let completionSoundPlayed = false;

const sourceId = "agent-map-data";
const interactiveLayers = ["agent-fill", "agent-line", "agent-points"];

const baseStyle = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{
    id: "osm",
    type: "raster" as const,
    source: "osm",
  }],
};

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function displayValue(value: unknown) {
  return typeof value === "number"
    ? value.toLocaleString("fr-FR")
    : String(value ?? "—");
}

function humanizeField(field: string) {
  const label = field.replace(/[._-]+/g, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : field;
}

function rowDetails(row: DatasetRow, excludedFields: string[]) {
  const excluded = new Set(excludedFields);
  return Object.entries(row)
    .filter(([field, value]) => (
      !excluded.has(field)
      && value !== null
      && String(value).trim() !== ""
    ))
    .slice(0, 4)
    .map(([field, value]) => ({
      label: humanizeField(field),
      value: displayValue(value),
    }));
}

function parseGeometry(value: unknown): Geometry | undefined {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return undefined;
    if ("type" in parsed && parsed.type === "Feature" && "geometry" in parsed) {
      return parsed.geometry as Geometry;
    }
    if ("type" in parsed && "coordinates" in parsed) {
      return parsed as Geometry;
    }
  } catch {
    return undefined;
  }
}

function localCollection(): FeatureCollection {
  const features = props.rows.flatMap<Feature>((row, index) => {
    let geometry: Geometry | undefined;
    const excludedFields: string[] = [];
    if (props.spec.type === "points") {
      const latitude = asNumber(row[props.spec.latitudeField]);
      const longitude = asNumber(row[props.spec.longitudeField]);
      if (latitude === undefined || longitude === undefined) return [];
      geometry = { type: "Point", coordinates: [longitude, latitude] };
      excludedFields.push(props.spec.latitudeField, props.spec.longitudeField);
    } else if (props.spec.type === "geojson") {
      geometry = parseGeometry(row[props.spec.geojsonField]);
      if (!geometry) return [];
      excludedFields.push(props.spec.geojsonField);
    } else {
      return [];
    }

    excludedFields.push(props.spec.labelField);
    if (props.spec.valueField) excludedFields.push(props.spec.valueField);

    return [{
      type: "Feature",
      id: index,
      geometry,
      properties: {
        label: displayValue(row[props.spec.labelField]),
        value: props.spec.valueField
          ? asNumber(row[props.spec.valueField]) ?? 0
          : 1,
        valueLabel: props.spec.valueField
          ? displayValue(row[props.spec.valueField])
          : undefined,
        details: JSON.stringify(rowDetails(row, excludedFields)),
      },
    }];
  });
  renderedCount.value = features.length;
  return { type: "FeatureCollection", features };
}

async function choroplethCollection(): Promise<FeatureCollection> {
  if (props.spec.type !== "choropleth") return localCollection();
  const spec = props.spec;
  const level = spec.boundary === "france-regions"
    ? "regions"
    : "departments";
  const response = await fetch(`/nuxt-api/boundaries?level=${level}`);
  if (!response.ok) throw new Error("Les contours géographiques sont indisponibles.");
  const boundaries = await response.json() as FeatureCollection;
  if (boundaries.type !== "FeatureCollection") {
    throw new Error("Le fond de carte reçu n’est pas valide.");
  }

  const byCode = new Map<string, DatasetRow>();
  const byName = new Map<string, DatasetRow>();
  props.rows.forEach((row) => {
    byCode.set(normalizeTerritoryCode(row[spec.dataKey]), row);
    byName.set(normalizeTerritoryName(row[spec.dataKey]), row);
  });

  let matched = 0;
  const features = boundaries.features.flatMap<Feature>((feature) => {
    if (!feature.geometry) return [];
    const properties = feature.properties ?? {};
    const row = byCode.get(normalizeTerritoryCode(properties.code))
      ?? byName.get(normalizeTerritoryName(properties.nom));
    const value = row ? asNumber(row[spec.valueField]) : undefined;
    if (value !== undefined) matched += 1;
    return [{
      ...feature,
      properties: {
        ...properties,
        label: row && spec.labelField
          ? displayValue(row[spec.labelField])
          : displayValue(properties.nom),
        value: value ?? null,
        valueLabel: value === undefined ? "Aucune donnée" : displayValue(value),
        details: row
          ? JSON.stringify(rowDetails(row, [
              spec.dataKey,
              spec.valueField,
              spec.labelField ?? "",
            ]))
          : "[]",
      },
    }];
  });
  if (matched === 0) {
    throw new Error(
      "Aucun territoire du résultat SQL ne correspond au fond de carte.",
    );
  }
  const values = features
    .map(feature => asNumber(feature.properties?.value))
    .filter((value): value is number => value !== undefined);
  legendRange.value = [Math.min(...values), Math.max(...values)];
  renderedCount.value = matched;
  return { type: "FeatureCollection", features };
}

function extendBounds(
  bounds: import("maplibre-gl").LngLatBounds,
  coordinates: unknown,
): void {
  if (
    Array.isArray(coordinates)
    && coordinates.length >= 2
    && typeof coordinates[0] === "number"
    && typeof coordinates[1] === "number"
  ) {
    bounds.extend([coordinates[0], coordinates[1]]);
    return;
  }
  if (Array.isArray(coordinates)) coordinates.forEach(item => extendBounds(bounds, item));
}

function showPopup(feature: MapGeoJSONFeature, longitude: number, latitude: number) {
  if (!map) return;
  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = String(feature.properties?.label ?? "Lieu");
  content.append(title);

  if (feature.properties?.valueLabel) {
    const value = document.createElement("p");
    value.className = "agent-map-popup-value";
    value.textContent = `${props.spec.valueLabel ?? "Valeur"} : ${feature.properties.valueLabel}`;
    content.append(value);
  }

  try {
    const details = JSON.parse(String(feature.properties?.details ?? "[]")) as Array<{
      label: string;
      value: string;
    }>;
    details.forEach((detail) => {
      const line = document.createElement("p");
      line.className = "agent-map-popup-detail";
      const label = document.createElement("span");
      label.textContent = `${detail.label} : `;
      line.append(label, document.createTextNode(detail.value));
      content.append(line);
    });
  } catch {
    // Invalid optional details must not prevent the popup from opening.
  }

  if (!maplibre) return;
  new maplibre.Popup({ closeButton: false, maxWidth: "280px" })
    .setLngLat([longitude, latitude])
    .setDOMContent(content)
    .addTo(map);
}

async function renderMap() {
  if (!mapElement.value) return;
  mapError.value = null;
  maplibre ??= await import("maplibre-gl");
  legendRange.value = null;
  const geojson = props.spec.type === "choropleth"
    ? await choroplethCollection()
    : localCollection();

  if (!map) {
    map = new maplibre.Map({
      container: mapElement.value,
      style: baseStyle,
      center: [2.2, 46.5],
      zoom: 4.2,
      attributionControl: {},
    });
    map.addControl(
      new maplibre.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.on("error", (event) => {
      mapError.value = event.error?.message ?? "La carte n’a pas pu être chargée.";
    });
    map.on("load", () => updateSource(geojson));
    return;
  }
  if (map.loaded()) updateSource(geojson);
}

function updateSource(geojson: FeatureCollection) {
  if (!map) return;
  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(geojson);
  } else {
    map.addSource(sourceId, { type: "geojson", data: geojson });
    map.addLayer({
      id: "agent-fill",
      type: "fill",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": props.spec.type === "choropleth" && legendRange.value
          ? [
              "case",
              ["!=", ["get", "value"], null],
              [
                "interpolate",
                ["linear"],
                ["get", "value"],
                legendRange.value[0],
                "#ececfe",
                legendRange.value[0] === legendRange.value[1]
                  ? legendRange.value[1] + 1
                  : legendRange.value[1],
                "#000091",
              ],
              "#e5e5e5",
            ]
          : "#6A6AF4",
        "fill-opacity": props.spec.type === "choropleth" ? 0.78 : 0.48,
      },
    });
    map.addLayer({
      id: "agent-line",
      type: "line",
      source: sourceId,
      filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
      paint: {
        "line-color": "#000091",
        "line-width": 2,
      },
    });
    map.addLayer({
      id: "agent-points",
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": "#000091",
        "circle-opacity": 0.82,
        "circle-radius": props.spec.valueField
          ? ["interpolate", ["linear"], ["sqrt", ["max", ["get", "value"], 0]], 0, 5, 100, 14]
          : 7,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });

    interactiveLayers.forEach((layerId) => {
      map?.on("mouseenter", layerId, () => {
        if (map) map.getCanvas().style.cursor = "pointer";
      });
      map?.on("mouseleave", layerId, () => {
        if (map) map.getCanvas().style.cursor = "";
      });
      map?.on("click", layerId, (event) => {
        const feature = event.features?.[0];
        if (feature) showPopup(feature, event.lngLat.lng, event.lngLat.lat);
      });
    });
  }

  if (!maplibre) return;
  const bounds = new maplibre.LngLatBounds();
  geojson.features.forEach((feature) => {
    if (feature.geometry.type === "GeometryCollection") {
      feature.geometry.geometries.forEach((geometry) => {
        if ("coordinates" in geometry) extendBounds(bounds, geometry.coordinates);
      });
    } else {
      extendBounds(bounds, feature.geometry.coordinates);
    }
  });
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: 44,
      maxZoom: props.spec.type === "choropleth" ? 8 : 13,
      duration: 450,
    });
  }
  if (props.playCompletionSound !== false && !completionSoundPlayed) {
    completionSoundPlayed = true;
    playUiSound("sparkle");
  }
}

async function safelyRenderMap() {
  try {
    await renderMap();
  } catch (reason) {
    mapError.value = reason instanceof Error
      ? reason.message
      : "La carte n’a pas pu être affichée.";
    playUiSound("error");
  }
}

onMounted(() => {
  void safelyRenderMap();
  if (mapElement.value) {
    resizeObserver = new ResizeObserver(() => map?.resize());
    resizeObserver.observe(mapElement.value);
  }
});

watch(
  () => [props.spec, props.rows],
  () => void safelyRenderMap(),
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map?.remove();
});
</script>

<template>
  <ExplorationResultCard
    content-class="p-5"
    :description="spec.description"
    eyebrow="Carte"
    :title="spec.title"
  >
    <div class="relative h-72 w-full overflow-hidden border border-[#e5e5e5]">
      <div ref="mapElement" class="h-full w-full" />
      <div
        v-if="spec.type === 'choropleth' && legendRange"
        class="absolute bottom-3 left-3 z-10 w-36 rounded-sm border border-[#929292] bg-white p-3 text-[12px] shadow-sm"
      >
        <p class="mb-2 font-semibold">{{ spec.valueLabel }}</p>
        <div class="h-2 bg-gradient-to-r from-[#ececfe] to-[#000091]" />
        <div class="mt-1 flex justify-between gap-2 text-[#666]">
          <span>{{ legendRange[0].toLocaleString("fr-FR") }}</span>
          <span>{{ legendRange[1].toLocaleString("fr-FR") }}</span>
        </div>
      </div>
      <div
        v-if="mapError"
        class="absolute inset-0 flex items-center justify-center bg-[#fef4f4] p-5 text-center text-[13px] text-[#ce0500]"
      >
        {{ mapError }}
      </div>
    </div>
    <template #footer>
      <span>{{ renderedCount }} entités affichées</span>
      <span v-if="truncated">Résultat limité aux 5 000 premières lignes</span>
      <span v-else>Données calculées localement</span>
    </template>
  </ExplorationResultCard>
</template>

<style scoped>
:deep(.maplibregl-popup-content) {
  border: 1px solid #929292;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 16%);
  font-family: Marianne, Arial, sans-serif;
  padding: 12px;
}

:deep(.maplibregl-popup-tip) {
  display: none;
}

:deep(.agent-map-popup-value) {
  color: #666;
  margin: 4px 0 0;
}

:deep(.agent-map-popup-detail) {
  margin: 4px 0 0;
}

:deep(.agent-map-popup-detail span) {
  color: #666;
}
</style>
