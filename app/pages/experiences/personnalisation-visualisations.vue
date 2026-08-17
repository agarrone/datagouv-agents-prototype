<script setup lang="ts">
import { explorationResources } from "~~/shared/data/exploration-resources";
import type {
  ChartSpec,
  ChartType,
  DatasetRow,
  MapBasemap,
  MapSpec,
} from "~~/shared/types/exploration";

type PaletteId = "blue" | "green" | "orange" | "purple";

const festivalResource = explorationResources.find(resource => resource.id === "festivals-france")!;
const dataset = useDatasetEngine();
const rows = ref<DatasetRow[]>([]);
const loading = ref(true);
const error = ref("");

const chartType = ref<ChartType>("bar");
const orientation = ref<"horizontal" | "vertical">("horizontal");
const sortDirection = ref<"asc" | "desc">("desc");
const limit = ref(10);
const showValues = ref(true);
const showLegend = ref(false);
const paletteId = ref<PaletteId>("blue");

const basemap = ref<MapBasemap>("light");
const mapPaletteId = ref<PaletteId>("blue");
const mapOpacity = ref(78);
const mapLegend = ref(true);

const palettes: Record<PaletteId, { label: string; colors: string[]; map: [string, string] }> = {
  blue: {
    label: "Bleu France",
    colors: ["#000091", "#6a6af4", "#cacafb"],
    map: ["#ececfe", "#000091"],
  },
  green: {
    label: "Vert",
    colors: ["#18753c", "#27a658", "#b8fec9"],
    map: ["#e3fdeb", "#18753c"],
  },
  orange: {
    label: "Orangé",
    colors: ["#a55800", "#e4794a", "#fbd335"],
    map: ["#fff4f3", "#a55800"],
  },
  purple: {
    label: "Violet",
    colors: ["#6e445a", "#a558a0", "#e4c7d3"],
    map: ["#f7ecf2", "#6e445a"],
  },
};

const sortedRows = computed(() => {
  const result = [...rows.value].sort((left, right) => {
    const difference = Number(left.nombre_festivals) - Number(right.nombre_festivals);
    return sortDirection.value === "asc" ? difference : -difference;
  })
    .slice(0, limit.value);
  return orientation.value === "horizontal" && chartType.value !== "pie"
    ? result.reverse()
    : result;
});

const chartSpec = computed<ChartSpec>(() => ({
  type: chartType.value,
  title: "Nombre de festivals par région",
  description: `Les ${limit.value} régions retenues selon le nombre de festivals répertoriés.`,
  xField: "region",
  xLabel: "Région",
  series: [{ field: "nombre_festivals", label: "Nombre de festivals" }],
}));

const chartAppearance = computed(() => ({
  orientation: orientation.value,
  palette: palettes[paletteId.value].colors,
  showLegend: showLegend.value,
  showValues: showValues.value,
}));

const mapSpec: MapSpec = {
  type: "choropleth",
  title: "Répartition des festivals par région",
  description: "Le nombre de festivals répertoriés dans chaque région française.",
  boundary: "france-regions",
  dataKey: "region",
  valueField: "nombre_festivals",
  labelField: "region",
  valueLabel: "Nombre de festivals",
};

const mapKey = computed(() => [
  basemap.value,
  mapPaletteId.value,
  mapOpacity.value,
  mapLegend.value,
].join("-"));

const source = "Liste des festivals en France · Ministère de la Culture";

function resetChart() {
  chartType.value = "bar";
  orientation.value = "horizontal";
  sortDirection.value = "desc";
  limit.value = 10;
  showValues.value = true;
  showLegend.value = false;
  paletteId.value = "blue";
}

function resetMap() {
  basemap.value = "light";
  mapPaletteId.value = "blue";
  mapOpacity.value = 78;
  mapLegend.value = true;
}

onMounted(async () => {
  try {
    await dataset.load(festivalResource);
    const result = await dataset.executeSql(`
      SELECT
        "Région principale de déroulement" AS region,
        COUNT(*)::INTEGER AS nombre_festivals
      FROM data
      WHERE "Région principale de déroulement" IS NOT NULL
        AND TRIM(CAST("Région principale de déroulement" AS VARCHAR)) <> ''
      GROUP BY 1
      ORDER BY nombre_festivals DESC
    `);
    rows.value = result.rows;
  }
  catch (reason) {
    error.value = reason instanceof Error
      ? reason.message
      : "Les données n’ont pas pu être chargées.";
  }
  finally {
    loading.value = false;
  }
});

useSeoMeta({
  title: "Personnalisation des visualisations — Expérience",
  description: "Laboratoire non référencé de personnalisation des graphiques et cartes.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <main class="min-h-dvh bg-[#f6f6f6] text-[#161616]">
    <header class="border-b border-[#e5e5e5] bg-white">
      <div class="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <NuxtLink class="inline-flex items-center gap-1.5 text-[12px] text-[#000091] underline underline-offset-4" to="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-[14px]" />
          Retour à l’accueil
        </NuxtLink>
        <p class="mt-8 text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Expérience non référencée</p>
        <h1 class="mt-2 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">Personnaliser une visualisation</h1>
        <p class="mt-3 max-w-3xl text-[14px] leading-6 text-[#555555]">
          Testez des réglages de présentation sans recalculer les données. L’agrégation nationale est chargée une seule fois avec DuckDB depuis la Liste des festivals en France.
        </p>
      </div>
    </header>

    <div class="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-10">
      <ExplorationStatusMessage
        v-if="error"
        title="Impossible de charger l’expérience"
        :message="error"
        tone="error"
      />

      <div v-else-if="loading" class="rounded-md border border-[#e5e5e5] bg-white p-6">
        <ExplorationAgentThinking label="Chargement et agrégation des festivals" />
      </div>

      <div v-else class="space-y-8">
        <section class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside class="h-fit rounded-md border border-[#e5e5e5] bg-white xl:sticky xl:top-4">
            <div class="border-b border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3">
              <h2 class="text-[13px] font-semibold">Réglages du graphique</h2>
              <p class="mt-1 text-[11px] leading-4 text-[#555555]">Ces changements ne relancent pas la requête SQL.</p>
            </div>
            <div class="space-y-4 p-4 text-[12px]">
              <label class="block">
                <span class="font-medium">Type</span>
                <select v-model="chartType" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option value="bar">Barres</option>
                  <option value="line">Lignes</option>
                  <option value="area">Aires</option>
                  <option value="pie">Anneau</option>
                </select>
              </label>
              <label v-if="chartType !== 'pie'" class="block">
                <span class="font-medium">Orientation</span>
                <select v-model="orientation" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option value="horizontal">Horizontale</option>
                  <option value="vertical">Verticale</option>
                </select>
              </label>
              <label class="block">
                <span class="font-medium">Tri</span>
                <select v-model="sortDirection" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option value="desc">Décroissant</option>
                  <option value="asc">Croissant</option>
                </select>
              </label>
              <label class="block">
                <span class="font-medium">Nombre de régions</span>
                <select v-model.number="limit" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option :value="5">5</option>
                  <option :value="10">10</option>
                  <option :value="18">Toutes</option>
                </select>
              </label>
              <label class="block">
                <span class="font-medium">Palette</span>
                <select v-model="paletteId" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option v-for="(palette, id) in palettes" :key="id" :value="id">{{ palette.label }}</option>
                </select>
              </label>
              <label class="flex items-center justify-between gap-3"><span>Afficher les valeurs</span><input v-model="showValues" class="accent-[#000091]" type="checkbox"></label>
              <label class="flex items-center justify-between gap-3"><span>Afficher la légende</span><input v-model="showLegend" class="accent-[#000091]" type="checkbox"></label>
              <button class="agent-focusable h-7 w-full rounded-md border border-[#000091] text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="resetChart">Réinitialiser</button>
            </div>
          </aside>

          <div class="min-w-0">
            <ExplorationAgentChart
              :appearance="chartAppearance"
              :play-completion-sound="false"
              :rows="sortedRows"
              :source="source"
              :spec="chartSpec"
              :truncated="false"
            />
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside class="h-fit rounded-md border border-[#e5e5e5] bg-white xl:sticky xl:top-4">
            <div class="border-b border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3">
              <h2 class="text-[13px] font-semibold">Réglages de la carte</h2>
              <p class="mt-1 text-[11px] leading-4 text-[#555555]">La jointure territoriale reste identique.</p>
            </div>
            <div class="space-y-4 p-4 text-[12px]">
              <label class="block">
                <span class="font-medium">Fond de carte</span>
                <select v-model="basemap" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option value="light">Positron</option>
                  <option value="standard">OSM Bright</option>
                  <option value="dark">Dark Matter</option>
                </select>
              </label>
              <label class="block">
                <span class="font-medium">Palette</span>
                <select v-model="mapPaletteId" class="mt-1.5 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2">
                  <option v-for="(palette, id) in palettes" :key="id" :value="id">{{ palette.label }}</option>
                </select>
              </label>
              <label class="block">
                <span class="flex items-center justify-between gap-3"><span>Opacité</span><span class="font-mono text-[11px] text-[#555555]">{{ mapOpacity }} %</span></span>
                <input v-model.number="mapOpacity" class="mt-2 w-full accent-[#000091]" max="100" min="30" step="4" type="range">
              </label>
              <label class="flex items-center justify-between gap-3"><span>Afficher la légende</span><input v-model="mapLegend" class="accent-[#000091]" type="checkbox"></label>
              <button class="agent-focusable h-7 w-full rounded-md border border-[#000091] text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="resetMap">Réinitialiser</button>
            </div>
          </aside>

          <div class="min-w-0">
            <ExplorationAgentMap
              :key="mapKey"
              :basemap="basemap"
              :fill-opacity="mapOpacity / 100"
              :fill-palette="palettes[mapPaletteId].map"
              :play-completion-sound="false"
              :rows="rows"
              :show-legend="mapLegend"
              :source="source"
              :spec="mapSpec"
              :truncated="false"
            />
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
