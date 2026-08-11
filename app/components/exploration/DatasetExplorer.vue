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
const pageSize = ref(30);
const page = ref(0);
const search = ref("");
const selectedColumns = ref<string[]>([]);
const sort = ref<ExplorerSort>();
const categoryFilters = ref<Record<string, string[]>>({});
const numberRanges = ref<Record<string, { min?: string; max?: string }>>({});
const dateFilters = ref<Record<string, ExplorerDateFilter>>({});
const rows = ref<Record<string, string | number | boolean | null>[]>([]);
const totalRows = ref(props.rowCount);
const loading = ref(false);
const error = ref<string>();
const exporting = ref(false);
const openFilter = ref<string>();
const valueOptions = ref<Record<string, ExplorerValueOption[]>>({});
const valueSearch = ref("");
let requestSequence = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const allColumnNames = computed(() => props.columns.map(column => column.name));
const visibleColumns = computed(() => selectedColumns.value.length
  ? selectedColumns.value
  : allColumnNames.value);
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));
const activeFilterCount = computed(() =>
  Object.values(categoryFilters.value).filter(values => values.length).length
  + Object.values(numberRanges.value).filter(range => range.min || range.max).length
  + Object.values(dateFilters.value).filter(filter => filter.value || filter.endValue).length,
);

function columnKind(column: DatasetColumn) {
  const type = column.type.toUpperCase();
  if (/DATE|TIME/.test(type)) return "date";
  if (/INT|DECIMAL|NUMERIC|REAL|FLOAT|DOUBLE/.test(type)) return "number";
  return "category";
}

function query(): ExplorerDatasetQuery {
  return {
    columns: visibleColumns.value,
    search: search.value,
    categoryFilters: categoryFilters.value,
    numberRanges: numberRanges.value,
    dateFilters: dateFilters.value,
    sort: sort.value,
    limit: pageSize.value,
    offset: page.value * pageSize.value,
    baseSql: props.baseSql,
  };
}

async function refresh() {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = undefined;
  try {
    const result = await dataset.queryExplorer(query());
    if (sequence !== requestSequence) return;
    rows.value = result.rows;
    totalRows.value = result.totalRows;
  } catch (reason) {
    if (sequence !== requestSequence) return;
    error.value = reason instanceof Error ? reason.message : "Impossible d’afficher les données.";
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

function refreshFromFirstPage() {
  page.value = 0;
  void refresh();
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(refreshFromFirstPage, 250);
}

function toggleColumn(column: string) {
  const current = new Set(visibleColumns.value);
  if (current.has(column) && current.size > 1) current.delete(column);
  else current.add(column);
  selectedColumns.value = allColumnNames.value.filter(name => current.has(name));
  refreshFromFirstPage();
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
  if (current.has(value)) current.delete(value);
  else current.add(value);
  categoryFilters.value = { ...categoryFilters.value, [column]: [...current] };
  refreshFromFirstPage();
}

function updateNumber(column: string, key: "min" | "max", value: string) {
  numberRanges.value = {
    ...numberRanges.value,
    [column]: { ...numberRanges.value[column], [key]: value },
  };
}

function updateDate(column: string, key: "value" | "endValue", value: string) {
  dateFilters.value = {
    ...dateFilters.value,
    [column]: {
      mode: dateFilters.value[column]?.mode ?? "after",
      value: dateFilters.value[column]?.value ?? "",
      ...dateFilters.value[column],
      [key]: value,
    },
  };
}

function resetFilters() {
  search.value = "";
  categoryFilters.value = {};
  numberRanges.value = {};
  dateFilters.value = {};
  sort.value = undefined;
  openFilter.value = undefined;
  refreshFromFirstPage();
}

function toggleSort(column: string) {
  if (sort.value?.column !== column) sort.value = { column, direction: "asc" };
  else if (sort.value.direction === "asc") sort.value = { column, direction: "desc" };
  else sort.value = undefined;
  refreshFromFirstPage();
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
  } finally {
    exporting.value = false;
  }
}

watch(() => props.baseSql, () => {
  resetFilters();
});
watch(pageSize, refreshFromFirstPage);
onMounted(refresh);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="min-w-0 bg-white">
    <div v-if="viewTitle" class="flex min-h-10 items-center gap-3 border-b border-[#e5e5e5] bg-[#ebedff] px-4 py-2 text-[12px]">
      <i aria-hidden="true" class="ri-table-line text-sm leading-none text-[#000091]" />
      <span class="min-w-0 flex-1 truncate"><strong>Vue de l’assistant :</strong> {{ viewTitle }}</span>
      <button class="shrink-0 text-[#000091] underline" type="button" @click="emit('resetView')">Revenir aux données initiales</button>
      <button class="inline-flex shrink-0 items-center gap-1.5 text-[#000091]" type="button" :disabled="exporting" @click="download">
        <i aria-hidden="true" class="ri-download-line text-sm leading-none" />
        Télécharger
      </button>
    </div>

    <div class="flex min-h-12 flex-wrap items-center gap-2 border-b border-[#e5e5e5] px-3 py-2">
      <label class="relative min-w-52 flex-1 lg:max-w-sm">
        <i aria-hidden="true" class="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#777777]" />
        <input v-model="search" class="h-8 w-full rounded-md border border-[#e5e5e5] bg-white pl-8 pr-3 text-[12px] outline-none focus:border-[#000091]" placeholder="Rechercher dans les données" type="search" @input="scheduleSearch">
      </label>

      <details class="relative">
        <summary class="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-[#e5e5e5] px-2.5 text-[12px]">
          <i aria-hidden="true" class="ri-layout-column-line text-sm text-[#555555]" />
          {{ visibleColumns.length }} colonnes
        </summary>
        <div class="absolute right-0 z-30 mt-1 max-h-72 w-72 overflow-auto rounded-md border border-[#e5e5e5] bg-white p-2 shadow-lg">
          <label v-for="column in columns" :key="column.name" class="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-[#f6f6f6]">
            <input class="mt-0.5 accent-[#000091]" type="checkbox" :checked="visibleColumns.includes(column.name)" @change="toggleColumn(column.name)">
            <span class="min-w-0"><span class="block truncate">{{ column.name }}</span><span class="text-[11px] text-[#777777]">{{ humanizeDuckDbType(column.type) }}</span></span>
          </label>
        </div>
      </details>

      <button v-if="activeFilterCount || search || sort" class="h-8 px-2 text-[12px] text-[#000091] underline" type="button" @click="resetFilters">Effacer les filtres</button>
      <button v-if="!viewTitle" class="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e5] px-2.5 text-[12px] text-[#000091]" type="button" :disabled="exporting" @click="download">
        <i aria-hidden="true" class="ri-download-line text-sm leading-none" />
        Télécharger
      </button>
    </div>

    <div class="flex min-h-10 items-center gap-4 border-b border-[#e5e5e5] px-4 text-[12px] text-[#555555]">
      <span><strong class="text-[#161616]">{{ totalRows.toLocaleString('fr-FR') }}</strong> lignes</span>
      <span>{{ visibleColumns.length }} colonnes affichées</span>
      <span v-if="activeFilterCount" class="text-[#000091]">{{ activeFilterCount }} filtre{{ activeFilterCount > 1 ? 's' : '' }}</span>
      <span v-if="loading" class="ml-auto">Actualisation…</span>
    </div>

    <div v-if="error" class="border-b border-[#f1b3b3] bg-[#fef4f4] px-4 py-3 text-[12px] text-[#ce0500]">{{ error }}</div>

    <div class="relative overflow-auto">
      <div v-if="loading" class="pointer-events-none absolute inset-0 z-10 bg-white/60" />
      <table class="w-full min-w-[58rem] border-collapse text-[12px]">
        <thead class="sticky top-0 z-20 bg-[#f6f6f6] text-left">
          <tr>
            <th v-for="column in columns.filter(item => visibleColumns.includes(item.name))" :key="column.name" class="relative min-w-40 border-b border-r border-[#e5e5e5] px-3 py-2 align-top">
              <div class="flex items-start gap-2">
                <button class="min-w-0 flex-1 text-left" type="button" @click="toggleSort(column.name)">
                  <span class="block truncate font-bold">{{ column.name }}</span>
                  <span class="block text-[11px] font-normal text-[#777777]">{{ humanizeDuckDbType(column.type) }}</span>
                </button>
                <button class="relative mt-0.5 grid size-6 shrink-0 place-items-center rounded hover:bg-[#e5e5e5]" :class="(categoryFilters[column.name]?.length || numberRanges[column.name]?.min || numberRanges[column.name]?.max || dateFilters[column.name]?.value) ? 'text-[#000091]' : 'text-[#777777]'" type="button" :aria-label="`Filtrer ${column.name}`" @click="toggleFilter(column)">
                  <i aria-hidden="true" class="ri-filter-3-line text-sm leading-none" />
                </button>
              </div>

              <div v-if="openFilter === column.name" class="absolute right-2 top-11 z-40 w-64 rounded-md border border-[#e5e5e5] bg-white p-3 font-normal shadow-lg">
                <div class="mb-2 flex items-center justify-between"><strong class="truncate text-[12px]">Filtrer {{ column.name }}</strong><button type="button" @click="openFilter = undefined"><i class="ri-close-line text-sm" /></button></div>
                <template v-if="columnKind(column) === 'category'">
                  <input v-model="valueSearch" class="mb-2 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[12px]" placeholder="Rechercher une valeur" @input="searchValues(column.name)">
                  <div class="max-h-52 overflow-auto">
                    <label v-for="option in valueOptions[column.name] ?? []" :key="option.label" class="flex cursor-pointer gap-2 border-b border-[#eeeeee] py-1.5 last:border-0">
                      <input class="accent-[#000091]" type="checkbox" :checked="categoryFilters[column.name]?.includes(option.label)" @change="toggleCategory(column.name, option.label)">
                      <span class="min-w-0 flex-1 truncate">{{ option.label }}</span><span class="text-[11px] text-[#777777]">{{ option.count }}</span>
                    </label>
                  </div>
                </template>
                <template v-else-if="columnKind(column) === 'number'">
                  <div class="grid grid-cols-2 gap-2">
                    <label class="text-[11px] text-[#555555]">Minimum<input class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[12px]" inputmode="decimal" :value="numberRanges[column.name]?.min" @change="updateNumber(column.name, 'min', ($event.target as HTMLInputElement).value); refreshFromFirstPage()"></label>
                    <label class="text-[11px] text-[#555555]">Maximum<input class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[12px]" inputmode="decimal" :value="numberRanges[column.name]?.max" @change="updateNumber(column.name, 'max', ($event.target as HTMLInputElement).value); refreshFromFirstPage()"></label>
                  </div>
                </template>
                <template v-else>
                  <select class="mb-2 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[12px]" :value="dateFilters[column.name]?.mode ?? 'after'" @change="dateFilters[column.name] = { mode: ($event.target as HTMLSelectElement).value as ExplorerDateFilter['mode'], value: dateFilters[column.name]?.value ?? '' }">
                    <option value="after">Après le</option><option value="before">Avant le</option><option value="between">Entre</option>
                  </select>
                  <input class="h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[12px]" type="date" :value="dateFilters[column.name]?.value" @change="updateDate(column.name, 'value', ($event.target as HTMLInputElement).value); refreshFromFirstPage()">
                  <input v-if="dateFilters[column.name]?.mode === 'between'" class="mt-2 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[12px]" type="date" :value="dateFilters[column.name]?.endValue" @change="updateDate(column.name, 'endValue', ($event.target as HTMLInputElement).value); refreshFromFirstPage()">
                </template>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="rowIndex" class="hover:bg-[#f8f8f8]">
            <td v-for="column in visibleColumns" :key="column" class="h-9 max-w-72 truncate border-b border-r border-[#e5e5e5] px-3 py-2" :title="String(row[column] ?? '')">{{ row[column] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex min-h-12 items-center justify-between border-t border-[#e5e5e5] px-3 text-[12px]">
      <label class="flex items-center gap-2 text-[#555555]">Lignes par page
        <select v-model="pageSize" class="h-8 rounded-md border border-[#e5e5e5] bg-white px-2 text-[#161616]"><option :value="20">20</option><option :value="30">30</option><option :value="50">50</option><option :value="100">100</option></select>
      </label>
      <div class="flex items-center gap-2">
        <span>{{ page + 1 }} / {{ totalPages }}</span>
        <button class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] disabled:opacity-40" type="button" :disabled="page === 0 || loading" @click="page -= 1; refresh()"><i class="ri-arrow-left-s-line text-base" /></button>
        <button class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] disabled:opacity-40" type="button" :disabled="page + 1 >= totalPages || loading" @click="page += 1; refresh()"><i class="ri-arrow-right-s-line text-base" /></button>
      </div>
    </div>
  </div>
</template>
