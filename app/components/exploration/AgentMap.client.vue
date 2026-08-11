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
  MapBasemap,
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
  source?: string;
  basemap?: MapBasemap;
  playCompletionSound?: boolean;
}>();

const mapElement = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const { playUiSound } = useUiSound();
const renderedCount = ref(0);
const rejectedCount = ref(0);
const unmatchedCount = ref(0);
const pointsAreClustered = ref(false);
const mapError = ref<string | null>(null);
const legendRange = ref<[number, number] | null>(null);
let maplibre: typeof import("maplibre-gl") | undefined;
let map: import("maplibre-gl").Map | undefined;
let resizeObserver: ResizeObserver | undefined;
let completionSoundPlayed = false;
let previousBodyOverflow = "";

const sourceId = "agent-map-data";
const interactiveLayers = ["agent-fill", "agent-line", "agent-points"];

const resolvedBasemap = computed<MapBasemap>(() => props.basemap ?? (
  props.spec.type === "choropleth" ? "light" : "standard"
));

const basemapStyle = computed(() => ({
  standard: "https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json",
  light: "https://openmaptiles.geo.data.gouv.fr/styles/positron/style.json",
  dark: "https://openmaptiles.geo.data.gouv.fr/styles/dark-matter/style.json",
})[resolvedBasemap.value]);

function localizeMapLabels() {
  if (!map) return;
  map.getStyle().layers?.forEach((layer) => {
    if (layer.type !== "symbol") return;
    const textField = layer.layout?.["text-field"];
    if (!textField || !JSON.stringify(textField).includes("name")) return;
    map?.setLayoutProperty(layer.id, "text-field", [
      "coalesce",
      ["get", "name:fr"],
      textField,
    ]);
  });
}

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
      if (
        latitude === undefined
        || longitude === undefined
        || latitude < -90
        || latitude > 90
        || longitude < -180
        || longitude > 180
      ) return [];
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
  rejectedCount.value = props.rows.length - features.length;
  unmatchedCount.value = 0;
  pointsAreClustered.value = props.spec.type === "points" && features.length >= 100;
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
  const boundaryCodes = new Set<string>();
  const boundaryNames = new Set<string>();
  boundaries.features.forEach((feature) => {
    boundaryCodes.add(normalizeTerritoryCode(feature.properties?.code));
    boundaryNames.add(normalizeTerritoryName(feature.properties?.nom));
  });
  let unmatchedRows = 0;
  props.rows.forEach((row) => {
    const code = normalizeTerritoryCode(row[spec.dataKey]);
    const name = normalizeTerritoryName(row[spec.dataKey]);
    byCode.set(code, row);
    byName.set(name, row);
    if (!boundaryCodes.has(code) && !boundaryNames.has(name)) unmatchedRows += 1;
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
  rejectedCount.value = 0;
  unmatchedCount.value = unmatchedRows;
  pointsAreClustered.value = false;
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

function collapseAttribution() {
  const control = map?.getContainer().querySelector<HTMLDetailsElement>(
    "details.maplibregl-ctrl-attrib",
  );
  if (control) control.open = false;
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
      style: basemapStyle.value,
      center: [2.2, 46.5],
      zoom: 4.2,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibre.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.on("error", (event) => {
      mapError.value = event.error?.message ?? "La carte n’a pas pu être chargée.";
    });
    map.on("style.load", localizeMapLabels);
    collapseAttribution();
    map.on("load", () => {
      collapseAttribution();
      updateSource(geojson);
    });
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
    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
      cluster: pointsAreClustered.value,
      clusterMaxZoom: 13,
      clusterRadius: 48,
    });
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
        "line-width": props.spec.type === "choropleth"
          ? props.spec.boundary === "france-departments" ? 0.45 : 0.7
          : 2,
      },
    });
    map.addLayer({
      id: "agent-clusters",
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#000091",
        "circle-opacity": 0.86,
        "circle-radius": ["step", ["get", "point_count"], 16, 25, 20, 100, 25],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
    map.addLayer({
      id: "agent-cluster-count",
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
      },
      paint: { "text-color": "#ffffff" },
    });
    map.addLayer({
      id: "agent-points",
      type: "circle",
      source: sourceId,
      filter: ["all", ["==", ["geometry-type"], "Point"], ["!", ["has", "point_count"]]],
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
    map.on("mouseenter", "agent-clusters", () => {
      if (map) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "agent-clusters", () => {
      if (map) map.getCanvas().style.cursor = "";
    });
    map.on("click", "agent-clusters", async (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map?.getSource(sourceId) as GeoJSONSource | undefined;
      if (!source || typeof clusterId !== "number") return;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map?.easeTo({ center: event.lngLat, zoom });
    });
  }

  if (!maplibre) return;
  const bounds = new maplibre.LngLatBounds();
  const featuresToFit = props.spec.type === "choropleth"
    ? geojson.features.filter(feature => feature.properties?.value !== null)
    : geojson.features;
  featuresToFit.forEach((feature) => {
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
  document.addEventListener("keydown", handleEscape);
});

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && isFullscreen.value) isFullscreen.value = false;
}

watch(isFullscreen, async (fullscreen) => {
  if (fullscreen) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = previousBodyOverflow;
  }
  await nextTick();
  map?.resize();
});

watch(
  () => [props.spec, props.rows],
  () => void safelyRenderMap(),
  { deep: true },
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleEscape);
  if (isFullscreen.value) document.body.style.overflow = previousBodyOverflow;
  resizeObserver?.disconnect();
  map?.remove();
});
</script>

<template>
  <Teleport to="body" :disabled="!isFullscreen">
    <div
      :class="isFullscreen ? 'fixed inset-0 z-[150] bg-white' : ''"
      :data-fullscreen="isFullscreen ? 'true' : 'false'"
    >
      <ExplorationResultCard
        class="flex h-full flex-col"
        :content-class="isFullscreen ? 'min-h-0 flex-1' : ''"
        :description="spec.description"
        :source="source"
        :title="spec.title"
      >
        <template #actions>
          <button
            :aria-label="isFullscreen ? 'Quitter le plein écran' : 'Afficher la carte en plein écran'"
            class="agent-focusable flex h-8 shrink-0 items-center justify-center gap-2 border border-[#e5e5e5] bg-white text-[12px] font-medium text-[#555555] hover:bg-[#f6f6f6]"
            :class="isFullscreen ? 'px-3' : 'w-8'"
            :title="isFullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'"
            type="button"
            @click="isFullscreen = !isFullscreen"
          >
            <i aria-hidden="true" :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'" class="text-base leading-none" />
            <span v-if="isFullscreen">Réduire</span>
          </button>
        </template>
        <div class="relative w-full overflow-hidden" :class="isFullscreen ? 'h-full min-h-0' : 'h-72'">
          <div ref="mapElement" class="h-full w-full" />
          <div
            v-if="spec.type === 'choropleth' && legendRange"
            class="absolute bottom-3 left-3 z-10 w-36 rounded-md border border-[#e5e5e5] bg-white p-3 text-[12px] shadow-sm"
          >
            <p class="mb-2 font-semibold">{{ spec.valueLabel }}</p>
            <div class="h-2 bg-gradient-to-r from-[#ececfe] to-[#000091]" />
            <div class="mt-1 flex justify-between gap-2 text-[#555555]">
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
          <span v-if="rejectedCount > 0">
            {{ rejectedCount.toLocaleString("fr-FR") }} ligne{{ rejectedCount > 1 ? "s" : "" }} ignorée{{ rejectedCount > 1 ? "s" : "" }} : coordonnées ou géométrie invalides
          </span>
          <span v-if="unmatchedCount > 0">
            {{ unmatchedCount.toLocaleString("fr-FR") }} territoire{{ unmatchedCount > 1 ? "s" : "" }} non apparié{{ unmatchedCount > 1 ? "s" : "" }}
          </span>
          <span v-if="pointsAreClustered">Les points proches sont regroupés au dézoom.</span>
        </template>
      </ExplorationResultCard>
    </div>
  </Teleport>
</template>

<style scoped>
:deep(.maplibregl-popup-content) {
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 16%);
  font-family: Marianne, Arial, sans-serif;
  padding: 12px;
}

:deep(.maplibregl-popup-tip) {
  display: none;
}

:deep(.agent-map-popup-value) {
  color: #555555;
  margin: 4px 0 0;
}

:deep(.agent-map-popup-detail) {
  margin: 4px 0 0;
}

:deep(.agent-map-popup-detail span) {
  color: #555555;
}
</style>
