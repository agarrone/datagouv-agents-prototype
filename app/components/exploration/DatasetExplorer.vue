<script setup lang="ts">
import type {
  DatasetColumn,
  ExplorerDatasetQuery,
  ExplorerDateFilter,
  ExplorerSort,
  ExplorerValueOption,
} from "~~/shared/types/exploration";
import { humanizeDuckDbType } from "~~/shared/data/duckdb-types";

const props = defineProps<{
  columns: readonly DatasetColumn[];
  rowCount: number;
  baseSql?: string;
  viewTitle?: string;
}>();
const emit = defineEmits<{ resetView: [] }>();
const dataset = useDatasetEngine();

const search = ref("");
const columnSearch = ref("");
const selectedColumns = ref<string[]>([]);
const columnsOpen = ref(false);
const openFilter = ref<string>();
const sort = ref<ExplorerSort>();
const categoryFilters = ref<Record<string, string[]>>({});
const numberRanges = ref<Record<string, { min?: string; max?: string }>>({});
const dateFilters = ref<Record<string, ExplorerDateFilter>>({});
const valueOptions = ref<Record<string, ExplorerValueOption[]>>({});
const valueSearch = ref("");
const rows = ref<Record<string, string | number | boolean | null>[]>([]);
const totalRows = ref(props.rowCount);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref<string>();
const exporting = ref(false);
const batchSize = 50;
const columnWidths = reactive<Record<string, number>>({});
let requestSequence = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const allColumnNames = computed(() => props.columns.map(column => column.name));
const visibleColumns = computed(() => selectedColumns.value.length ? selectedColumns.value : allColumnNames.value);
const visibleDefinitions = computed(() => visibleColumns.value
  .map(name => props.columns.find(column => column.name === name))
  .filter((column): column is DatasetColumn => Boolean(column)));
const filteredDefinitions = computed(() => props.columns.filter(column => column.name.toLocaleLowerCase("fr").includes(columnSearch.value.toLocaleLowerCase("fr"))));
const hasMore = computed(() => rows.value.length < totalRows.value);
const activeFilters = computed(() => {
  const items: { key: string; label: string }[] = [];
  if (search.value) items.push({ key: "search", label: `« ${search.value} »` });
  for (const [column, values] of Object.entries(categoryFilters.value)) if (values.length) items.push({ key: `category:${column}`, label: `${column} : ${values.join(", ")}` });
  for (const [column, range] of Object.entries(numberRanges.value)) if (range.min || range.max) items.push({ key: `number:${column}`, label: `${column} : ${range.min || "−∞"} à ${range.max || "+∞"}` });
  for (const [column, filter] of Object.entries(dateFilters.value)) if (filter.value) items.push({ key: `date:${column}`, label: `${column} : ${filter.mode === "before" ? "avant" : filter.mode === "after" ? "après" : "entre"} ${filter.value}` });
  if (sort.value) items.push({ key: "sort", label: `${sort.value.column} : ${sort.value.direction === "asc" ? "croissant" : "décroissant"}` });
  return items;
});

function defaultColumnNames() {
  const preferred = ["title", "organization", "metric.views", "resources_count", "last_modified"];
  const available = preferred.filter(name => allColumnNames.value.includes(name));
  return available.length >= 3 ? available : allColumnNames.value.slice(0, 5);
}

function columnKind(column: DatasetColumn) {
  const type = column.type.toUpperCase();
  if (/DATE|TIME/.test(type)) return "date";
  if (/INT|DECIMAL|NUMERIC|REAL|FLOAT|DOUBLE/.test(type)) return "number";
  if (/BOOL/.test(type)) return "boolean";
  return "category";
}

function typeIcon(column: DatasetColumn) {
  const kind = columnKind(column);
  if (kind === "date") return "ri-calendar-line";
  if (kind === "number") return "ri-hashtag";
  if (kind === "boolean") return "ri-checkbox-circle-line";
  if (/URL|LINK/.test(column.name.toUpperCase())) return "ri-link";
  return "ri-text";
}

function query(offset = 0): ExplorerDatasetQuery {
  return {
    columns: visibleColumns.value,
    search: search.value,
    categoryFilters: categoryFilters.value,
    numberRanges: numberRanges.value,
    dateFilters: dateFilters.value,
    sort: sort.value,
    limit: batchSize,
    offset,
    baseSql: props.baseSql,
  };
}

async function refresh(reset = true) {
  if (!reset && (!hasMore.value || loadingMore.value || loading.value)) return;
  const sequence = reset ? ++requestSequence : requestSequence;
  if (reset) loading.value = true;
  else loadingMore.value = true;
  error.value = undefined;
  try {
    const result = await dataset.queryExplorer(query(reset ? 0 : rows.value.length));
    if (sequence !== requestSequence) return;
    rows.value = reset ? result.rows : [...rows.value, ...result.rows];
    totalRows.value = result.totalRows;
  } catch (reason) {
    if (sequence !== requestSequence) return;
    error.value = reason instanceof Error ? reason.message : "Impossible d’afficher les données.";
  } finally {
    if (sequence === requestSequence) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => refresh(), 250);
}

function onScroll(event: Event) {
  const element = event.currentTarget as HTMLElement;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 120) void refresh(false);
}

function toggleColumn(column: string) {
  const current = new Set(visibleColumns.value);
  if (current.has(column) && current.size > 1) current.delete(column);
  else current.add(column);
  selectedColumns.value = allColumnNames.value.filter(name => current.has(name));
  void refresh();
}

async function toggleFilter(column: DatasetColumn) {
  openFilter.value = openFilter.value === column.name ? undefined : column.name;
  valueSearch.value = "";
  if (openFilter.value && columnKind(column) === "category" && !valueOptions.value[column.name]) {
    valueOptions.value[column.name] = await dataset.getExplorerValueOptions(column.name, "", props.baseSql);
  }
}

async function searchValues(column: string) {
  valueOptions.value[column] = await dataset.getExplorerValueOptions(column, valueSearch.value, props.baseSql);
}

function toggleCategory(column: string, value: string) {
  const current = new Set(categoryFilters.value[column] ?? []);
  current.has(value) ? current.delete(value) : current.add(value);
  categoryFilters.value = { ...categoryFilters.value, [column]: [...current] };
  void refresh();
}

function updateNumber(column: string, key: "min" | "max", value: string) {
  numberRanges.value = { ...numberRanges.value, [column]: { ...numberRanges.value[column], [key]: value } };
  void refresh();
}

function updateDate(column: string, key: "value" | "endValue", value: string) {
  dateFilters.value = { ...dateFilters.value, [column]: { mode: dateFilters.value[column]?.mode ?? "after", value: dateFilters.value[column]?.value ?? "", ...dateFilters.value[column], [key]: value } };
  void refresh();
}

function toggleSort(column: string) {
  if (sort.value?.column !== column) sort.value = { column, direction: "asc" };
  else if (sort.value.direction === "asc") sort.value = { column, direction: "desc" };
  else sort.value = undefined;
  void refresh();
}

function removeFilter(key: string) {
  if (key === "search") search.value = "";
  else if (key === "sort") sort.value = undefined;
  else {
    const [kind, column] = key.split(":");
    if (kind === "category") categoryFilters.value = { ...categoryFilters.value, [column!]: [] };
    if (kind === "number") numberRanges.value = { ...numberRanges.value, [column!]: {} };
    if (kind === "date") dateFilters.value = { ...dateFilters.value, [column!]: { mode: "after", value: "" } };
  }
  void refresh();
}

function resetFilters() {
  search.value = "";
  categoryFilters.value = {};
  numberRanges.value = {};
  dateFilters.value = {};
  sort.value = undefined;
  openFilter.value = undefined;
  void refresh();
}

function startResize(name: string, event: MouseEvent) {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = columnWidths[name] ?? 180;
  const move = (moveEvent: MouseEvent) => { columnWidths[name] = Math.max(90, Math.min(420, startWidth + moveEvent.clientX - startX)); };
  const stop = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", stop); };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);
}

async function download() {
  exporting.value = true;
  try {
    const blob = await dataset.exportExplorerCsv(query());
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "donnees-filtrees.csv";
    anchor.click();
    URL.revokeObjectURL(href);
  } finally { exporting.value = false; }
}

function displayValue(value: unknown, column: DatasetColumn) {
  if (value === null || value === undefined || value === "") return "Valeur manquante";
  if (columnKind(column) === "date") {
    const date = new Date(typeof value === "bigint" ? Number(value) : value as string | number);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
  }
  if (columnKind(column) === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  return String(value);
}

watch(() => props.baseSql, resetFilters);
watch(() => props.columns, () => { selectedColumns.value = defaultColumnNames(); void refresh(); });
onMounted(() => { selectedColumns.value = defaultColumnNames(); void refresh(); });
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer); });
</script>

<template>
  <div class="flex h-full min-w-0 flex-col overflow-hidden bg-white">
    <div v-if="viewTitle" class="flex min-h-10 shrink-0 items-center gap-2 border-b border-[#cacafb] bg-[#ebedff] px-3 py-2 text-[11px]">
      <i class="ri-filter-line text-sm text-[#000091]" />
      <span class="min-w-0 flex-1 truncate"><strong>Vue de l’assistant :</strong> {{ viewTitle }}</span>
      <button class="shrink-0 text-[#000091] underline" type="button" @click="emit('resetView')">Revenir aux données initiales</button>
      <button aria-label="Télécharger les données filtrées" class="grid size-7 place-items-center text-[#000091]" :disabled="exporting" type="button" @click="download"><i class="ri-download-line text-sm" /></button>
    </div>

      <div class="flex min-h-12 shrink-0 items-center gap-2 border-b border-[#e5e5e5] px-2">
        <label class="flex h-8 w-[220px] min-w-0 items-center gap-1 rounded border border-[#e5e5e5] bg-[#f6f6f6] px-2">
          <i class="ri-search-line text-sm text-[#555555]" /><input v-model="search" class="min-w-0 flex-1 bg-transparent text-[12px] outline-none" placeholder="Rechercher dans les données" @input="scheduleSearch">
        </label>
        <div class="relative ml-auto">
          <button class="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11px] hover:bg-[#eeeeee]" type="button" @click="columnsOpen = !columnsOpen; openFilter = undefined"><i class="ri-layout-vertical-line text-sm" />Colonnes {{ visibleColumns.length }} sur {{ columns.length }}<i class="ri-arrow-down-s-line text-sm" /></button>
          <div v-if="columnsOpen" class="absolute right-0 top-9 z-40 w-72 rounded-md border border-[#e5e5e5] bg-white p-2 shadow-lg">
            <div class="flex items-center justify-between px-1 pb-2 text-[10px] text-[#777777]"><span>{{ visibleColumns.length }} colonnes visibles</span><button class="text-[#000091] underline" type="button" @click="selectedColumns = allColumnNames; refresh()">Tout afficher</button></div>
            <label class="mb-1 flex h-7 items-center gap-1 rounded border border-[#e5e5e5] bg-[#f6f6f6] px-2"><i class="ri-search-line text-xs" /><input v-model="columnSearch" class="min-w-0 flex-1 bg-transparent text-[10px] outline-none" placeholder="Rechercher une colonne"></label>
            <div class="max-h-64 overflow-auto"><label v-for="column in filteredDefinitions" :key="column.name" class="flex items-center gap-2 rounded px-2 py-1.5 text-[11px] hover:bg-[#f6f6f6]"><input :checked="visibleColumns.includes(column.name)" class="accent-[#000091]" type="checkbox" @change="toggleColumn(column.name)"><i :class="typeIcon(column)" class="text-sm text-[#555555]" /><span class="min-w-0 flex-1 truncate">{{ column.name }}</span><span class="text-[10px] text-[#777777]">{{ humanizeDuckDbType(column.type) }}</span></label></div>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-[#3a3a3a]"><i class="ri-layout-horizontal-line text-sm" />{{ totalRows.toLocaleString('fr-FR') }} lignes</span>
        <button aria-label="Télécharger" class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] text-[#000091]" :disabled="exporting" type="button" @click="download"><i class="ri-download-line text-sm" /></button>
      </div>

      <div v-if="activeFilters.length" class="flex min-h-9 shrink-0 flex-wrap items-center gap-1.5 border-b border-[#e5e5e5] px-2 py-1.5 text-[10px]">
        <span class="font-medium text-[#555555]">Filtres actifs</span>
        <button v-for="filter in activeFilters" :key="filter.key" class="inline-flex h-6 max-w-64 items-center gap-1 rounded border border-[#cacafb] bg-[#ebedff] px-2 text-[#000091]" type="button" @click="removeFilter(filter.key)"><span class="truncate">{{ filter.label }}</span><i class="ri-close-line text-xs" /></button>
        <button class="ml-auto text-[#000091] underline" type="button" @click="resetFilters">Tout effacer</button>
      </div>

      <div v-if="error" class="flex min-h-0 flex-1 items-center justify-center bg-[#fef4f4] p-6 text-center"><div><i class="ri-error-warning-line text-xl text-[#ce0500]" /><p class="mt-2 text-[12px] font-bold">Impossible de charger les données</p><p class="mt-1 max-w-md text-[11px] text-[#555555]">{{ error }}</p><button class="mt-3 h-8 rounded-md border border-[#ce0500] px-3 text-[11px] text-[#ce0500]" type="button" @click="refresh()">Réessayer</button></div></div>
      <ExplorationDatasetTableSkeleton v-else-if="loading" />
      <div v-else-if="rows.length === 0" class="grid min-h-0 flex-1 place-items-center p-6 text-center"><div><i class="ri-table-line text-xl text-[#929292]" /><p class="mt-2 text-[12px] font-bold">Aucune ligne à afficher</p><p class="mt-1 text-[11px] text-[#555555]">Aucun résultat ne correspond aux filtres actifs.</p><button class="mt-2 text-[11px] text-[#000091] underline" type="button" @click="resetFilters">Réinitialiser la vue</button></div></div>
      <div v-else class="min-h-0 flex-1 overflow-auto" @scroll="onScroll">
        <table class="w-full border-collapse text-[12px]">
          <thead class="text-left"><tr><th v-for="column in visibleDefinitions" :key="column.name" class="sticky top-0 z-20 h-11 border-b border-r border-[#e5e5e5] bg-[#f6f6f6] px-3" :style="{ width: `${columnWidths[column.name] ?? 180}px`, minWidth: `${columnWidths[column.name] ?? 180}px` }">
            <span class="flex items-center gap-1"><i :class="typeIcon(column)" class="shrink-0 text-sm font-normal text-[#555555]" /><button class="min-w-0 flex-1 truncate text-left font-bold" type="button" @click="toggleSort(column.name)">{{ column.name }}</button><i v-if="sort?.column === column.name" :class="sort.direction === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line'" class="text-xs text-[#000091]" /><button class="grid size-5 place-items-center rounded hover:bg-[#eeeeee]" :class="openFilter === column.name ? 'text-[#000091]' : 'text-[#929292]'" :aria-label="`Filtrer ${column.name}`" type="button" @click="toggleFilter(column)"><i class="ri-filter-line text-sm" /></button></span>
            <button class="absolute -right-1 top-0 z-30 h-full w-2 cursor-col-resize" :aria-label="`Redimensionner ${column.name}`" type="button" @mousedown="startResize(column.name, $event)"><span class="mx-auto block h-full w-px bg-transparent hover:bg-[#000091]" /></button>
            <div v-if="openFilter === column.name" class="absolute right-2 top-10 z-50 w-64 rounded-md border border-[#e5e5e5] bg-white p-3 font-normal shadow-lg" @click.stop>
              <div class="mb-2 flex items-center justify-between"><strong class="truncate text-[11px]">Filtrer {{ column.name }}</strong><button type="button" @click="openFilter = undefined"><i class="ri-close-line text-sm" /></button></div>
              <template v-if="columnKind(column) === 'category' || columnKind(column) === 'boolean'"><input v-model="valueSearch" class="mb-2 h-7 w-full rounded border border-[#e5e5e5] px-2 text-[11px]" placeholder="Rechercher une valeur" @input="searchValues(column.name)"><div class="max-h-48 overflow-auto"><label v-for="option in valueOptions[column.name] ?? []" :key="option.label" class="flex gap-2 border-b border-[#eeeeee] py-1.5 text-[11px] last:border-0"><input class="accent-[#000091]" type="checkbox" :checked="categoryFilters[column.name]?.includes(option.label)" @change="toggleCategory(column.name, option.label)"><span class="min-w-0 flex-1 truncate">{{ option.label }}</span><span class="text-[10px] text-[#777777]">{{ option.count.toLocaleString('fr-FR') }}</span></label></div></template>
              <template v-else-if="columnKind(column) === 'number'"><div class="grid grid-cols-2 gap-2"><label class="text-[10px] text-[#555555]">Minimum<input class="mt-1 h-7 w-full rounded border border-[#e5e5e5] px-2 text-[11px]" inputmode="decimal" :value="numberRanges[column.name]?.min" @change="updateNumber(column.name, 'min', ($event.target as HTMLInputElement).value)"></label><label class="text-[10px] text-[#555555]">Maximum<input class="mt-1 h-7 w-full rounded border border-[#e5e5e5] px-2 text-[11px]" inputmode="decimal" :value="numberRanges[column.name]?.max" @change="updateNumber(column.name, 'max', ($event.target as HTMLInputElement).value)"></label></div></template>
              <template v-else><select class="mb-2 h-7 w-full rounded border border-[#e5e5e5] px-2 text-[11px]" :value="dateFilters[column.name]?.mode ?? 'after'" @change="dateFilters[column.name] = { mode: ($event.target as HTMLSelectElement).value as ExplorerDateFilter['mode'], value: dateFilters[column.name]?.value ?? '' }"><option value="after">Après le</option><option value="before">Avant le</option><option value="between">Entre deux dates</option></select><input class="h-7 w-full rounded border border-[#e5e5e5] px-2 text-[11px]" type="date" :value="dateFilters[column.name]?.value" @change="updateDate(column.name, 'value', ($event.target as HTMLInputElement).value)"><input v-if="dateFilters[column.name]?.mode === 'between'" class="mt-2 h-7 w-full rounded border border-[#e5e5e5] px-2 text-[11px]" type="date" :value="dateFilters[column.name]?.endValue" @change="updateDate(column.name, 'endValue', ($event.target as HTMLInputElement).value)"></template>
            </div>
          </th></tr></thead>
          <tbody><tr v-for="(row, rowIndex) in rows" :key="rowIndex" class="h-9 hover:bg-[#f8f8f8]"><td v-for="column in visibleDefinitions" :key="column.name" class="max-w-0 truncate border-b border-r border-[#e5e5e5] px-3" :class="columnKind(column) === 'number' ? 'text-right font-mono tabular-nums' : ''" :style="{ width: `${columnWidths[column.name] ?? 180}px`, minWidth: `${columnWidths[column.name] ?? 180}px`, maxWidth: `${columnWidths[column.name] ?? 180}px` }" :title="String(row[column.name] ?? '')"><span :class="row[column.name] === null || row[column.name] === '' ? 'italic text-[#929292]' : ''">{{ displayValue(row[column.name], column) }}</span></td></tr></tbody>
        </table>
        <div class="sticky bottom-0 flex h-9 items-center justify-center gap-2 border-t border-[#e5e5e5] bg-white/95 text-[11px] text-[#777777] backdrop-blur-sm"><template v-if="loadingMore"><i class="ri-loader-4-line animate-spin text-sm" />Chargement des lignes suivantes…</template><template v-else-if="hasMore">Faites défiler pour charger la suite</template><template v-else><i class="ri-check-line text-sm" />Toutes les lignes disponibles sont affichées</template></div>
      </div>
  </div>
</template>
