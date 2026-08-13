<script setup lang="ts">
const mode = ref<"data" | "structure">("data");
const filterOpen = ref(false);
const columnsOpen = ref(false);
const filteredView = ref(false);
const search = ref("");
const activeResourceId = ref("catalogue");
const filterColumn = ref("organization");
const categoryFilter = ref<string[]>(["Ministère de la Culture"]);
const numberMin = ref("40000");
const numberMax = ref("");
const dateMode = ref<"before" | "after" | "between">("after");
const dateStart = ref("2026-07-01");
const dateEnd = ref("");
const sort = ref<{ column: string; direction: "asc" | "desc" }>();
const columnSearch = ref("");
const selectedColumns = ref(["title", "organization", "metric.views", "resources_count", "last_modified"]);
const columnWidths = reactive<Record<string, number>>({ title: 250, organization: 190, "metric.views": 145, resources_count: 150, last_modified: 150 });
const activeCell = ref<{ column: string; value: string; x: number; y: number }>();
const previewState = ref<"ready" | "loading" | "empty" | "error">("ready");
const loadedCopies = ref(2);
const fullscreen = ref(false);
const sidebarCollapsed = ref(false);

const resources = [
  { id: "catalogue", name: "catalogue-data-gouv.parquet", size: "186 Mo", format: "PARQUET", type: "table" },
  { id: "schema", name: "schema-catalogue.json", size: "24 Ko", format: "JSON", type: "code" },
  { id: "documentation", name: "Documentation des champs", size: "", format: "PDF", type: "documentation" },
];
const activeResource = computed(() => resources.find(resource => resource.id === activeResourceId.value) ?? resources[0]!);

const columns = [
  { name: "title", type: "texte", visible: true, examples: ["Catalogue des données", "Répertoire national des élus"] },
  { name: "organization", type: "texte", visible: true, examples: ["data.gouv.fr", "Ministère de l’Intérieur"] },
  { name: "metric.views", type: "nombre entier", visible: true, examples: ["182 430", "96 240"] },
  { name: "resources_count", type: "nombre entier", visible: true, examples: ["42", "12"] },
  { name: "last_modified", type: "date et heure", visible: true, examples: ["10 août 2026", "3 août 2026"] },
  { name: "url", type: "lien", visible: false, examples: ["https://www.data.gouv.fr/datasets/…"] },
  { name: "featured", type: "oui / non", visible: false, examples: ["oui", "non"] },
];

const rows = [
  { title: "Catalogue des données de data.gouv.fr", organization: "data.gouv.fr", views: "182 430", resources: "42", modified: "10 août 2026", url: "https://www.data.gouv.fr/datasets/catalogue", featured: true },
  { title: "Répertoire national des élus", organization: "Ministère de l’Intérieur", views: "96 240", resources: "12", modified: "3 août 2026", url: "https://www.data.gouv.fr/datasets/rne", featured: true },
  { title: "Liste des festivals en France", organization: "Ministère de la Culture", views: "74 810", resources: "6", modified: "28 juillet 2026", url: "https://www.data.gouv.fr/datasets/festivals", featured: false },
  { title: "Demandes de valeurs foncières", organization: "Ministère de l’Économie", views: "68 340", resources: "18", modified: "24 juillet 2026", url: "https://www.data.gouv.fr/datasets/dvf", featured: true },
  { title: "Le calendrier scolaire", organization: "Ministère de l’Éducation", views: "54 120", resources: "4", modified: "19 juillet 2026", url: "https://www.data.gouv.fr/datasets/calendrier", featured: false },
  { title: "Monuments historiques classés", organization: "Ministère de la Culture", views: "42 760", resources: "9", modified: "8 juillet 2026", url: "https://www.data.gouv.fr/datasets/monuments", featured: false },
];
const visibleColumns = computed(() => columns.filter(column => selectedColumns.value.includes(column.name)));
const filteredColumns = computed(() => columns.filter(column => column.name.toLowerCase().includes(columnSearch.value.toLowerCase())));
const repeatedRows = computed(() => Array.from({ length: loadedCopies.value }, () => rows).flat());
const activeFilterCount = computed(() => (filteredView.value ? 1 : 0) + (sort.value ? 1 : 0) + (search.value ? 1 : 0));
const filterKind = computed<"category" | "number" | "date">(() => {
  if (["metric.views", "resources_count"].includes(filterColumn.value)) return "number";
  if (filterColumn.value === "last_modified") return "date";
  return "category";
});
const categoryOptions = computed(() => {
  const values = rows.map(row => String(cellValue(row, filterColumn.value) ?? "Valeur manquante"));
  return [...new Set(values)].slice(0, 5).map((value, index) => ({ value, count: Math.max(1, Math.round(12840 / (index + 1))) }));
});

const filterLabel = computed(() => {
  if (filterKind.value === "category") return categoryFilter.value.length ? `${filterColumn.value} : ${categoryFilter.value.join(", ")}` : filterColumn.value;
  if (filterKind.value === "number") return `${filterColumn.value} : ${numberMin.value || "−∞"} à ${numberMax.value || "+∞"}`;
  return `${filterColumn.value} : ${dateMode.value === "before" ? "avant" : dateMode.value === "after" ? "après" : "entre"} ${dateStart.value}`;
});

function toggleColumn(name: string) {
  if (selectedColumns.value.includes(name)) {
    if (selectedColumns.value.length === 1) return;
    selectedColumns.value = selectedColumns.value.filter(column => column !== name);
  } else selectedColumns.value = [...selectedColumns.value, name];
}

function startResize(name: string, event: MouseEvent) {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = columnWidths[name] ?? 150;
  const move = (moveEvent: MouseEvent) => {
    columnWidths[name] = Math.max(90, Math.min(360, startWidth + moveEvent.clientX - startX));
  };
  const stop = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", stop);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);
}

function openCellMenu(column: string, value: string, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  activeCell.value = { column, value, x: Math.min(rect.left, window.innerWidth - 230), y: Math.min(rect.bottom + 4, window.innerHeight - 150) };
}

function applyCellFilter() {
  if (!activeCell.value) return;
  filterColumn.value = activeCell.value.column;
  if (!["metric.views", "resources_count", "last_modified"].includes(filterColumn.value)) categoryFilter.value = [activeCell.value.value];
  filteredView.value = true;
  activeCell.value = undefined;
}

function clearAllFilters() {
  search.value = "";
  filteredView.value = false;
  sort.value = undefined;
}

function retryPreview() {
  previewState.value = "loading";
  setTimeout(() => { previewState.value = "ready"; }, 350);
}

async function copyActiveCell() {
  if (!activeCell.value) return;
  await navigator.clipboard?.writeText(activeCell.value.value);
  activeCell.value = undefined;
}

function onTableScroll(event: Event) {
  const element = event.currentTarget as HTMLElement;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 48 && loadedCopies.value < 5) {
    loadedCopies.value += 1;
  }
}

watch(activeResourceId, () => {
  mode.value = "data";
  previewState.value = "loading";
  setTimeout(() => { previewState.value = "ready"; }, 350);
});

function typeIcon(type: string) {
  if (type.includes("nombre")) return "ri-hashtag";
  if (type.includes("date")) return "ri-calendar-line";
  if (type.includes("lien")) return "ri-link";
  if (type.includes("oui")) return "ri-checkbox-circle-line";
  return "ri-text";
}

function cellValue(row: typeof rows[number], column: string) {
  const mapping: Record<string, keyof typeof row> = { title: "title", organization: "organization", "metric.views": "views", resources_count: "resources", last_modified: "modified", url: "url", featured: "featured" };
  return row[mapping[column]!] ?? null;
}

function resourceIcon(type: string) {
  if (type === "code") return "ri-code-s-slash-line";
  if (type === "documentation") return "ri-file-text-line";
  return "ri-table-line";
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white" :class="fullscreen ? 'fixed inset-0 z-[100] flex flex-col rounded-none border-0 shadow-none' : ''">
    <div class="flex min-h-14 items-center gap-2 border-b border-[#e5e5e5] bg-[#f6f6f6] px-4 max-sm:px-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 text-[12px] font-bold">
          <i aria-hidden="true" :class="resourceIcon(activeResource.type)" class="text-sm leading-none text-[#555555]" />
          <span class="truncate">{{ activeResource.name }}</span>
          <span class="rounded bg-[#e5e5e5] px-1.5 py-0.5 text-[10px] font-medium text-[#555555]">{{ activeResource.format }}</span>
        </div>
        <p class="mt-0.5 truncate text-[11px] text-[#777777]">Catalogue des données de data.gouv.fr · data.gouv.fr</p>
      </div>
      <button aria-label="Télécharger les données affichées" class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] bg-white text-[#000091]" title="Télécharger les données affichées" type="button">
        <i aria-hidden="true" class="ri-download-line text-sm" />
      </button>
      <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#000091] bg-[#ebedff] px-2.5 text-[12px] font-medium text-[#000091] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091]" type="button">
        <i aria-hidden="true" class="ri-message-ai-3-line text-sm leading-none" />
        <span class="max-sm:hidden">Poser une question</span>
      </button>
      <label class="hidden items-center gap-1 text-[10px] text-[#777777] xl:flex">État
        <select v-model="previewState" class="h-7 rounded border border-[#e5e5e5] bg-white px-1.5 text-[10px] text-[#3a3a3a]"><option value="ready">Prêt</option><option value="loading">Chargement</option><option value="empty">Vide</option><option value="error">Erreur</option></select>
      </label>
      <button :aria-label="fullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'" class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] text-[#555555] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091]" type="button" @click="fullscreen = !fullscreen">
        <i aria-hidden="true" :class="fullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'" class="text-base leading-none" />
      </button>
    </div>

    <div class="grid min-h-[35rem] flex-1" :class="sidebarCollapsed ? 'grid-cols-[2.75rem_minmax(0,1fr)] max-lg:grid-cols-1' : 'grid-cols-[13.5rem_minmax(0,1fr)] max-lg:grid-cols-1'">
      <aside class="border-r border-[#e5e5e5] bg-white max-lg:border-b max-lg:border-r-0" :class="sidebarCollapsed ? '' : 'max-lg:max-h-44'">
        <div class="flex h-11 items-center justify-between border-b border-[#e5e5e5] px-3">
          <strong v-if="!sidebarCollapsed" class="text-[12px]">Ressources</strong>
          <button :aria-label="sidebarCollapsed ? 'Déplier les ressources' : 'Replier les ressources'" class="grid size-6 place-items-center rounded hover:bg-[#eeeeee]" type="button" @click="sidebarCollapsed = !sidebarCollapsed"><i aria-hidden="true" :class="sidebarCollapsed ? 'ri-sidebar-unfold-line' : 'ri-sidebar-fold-line'" class="text-sm text-[#777777]" /></button>
        </div>
        <div v-if="!sidebarCollapsed" class="p-2">
          <label class="explorer-search-field w-full">
            <i aria-hidden="true" class="ri-search-line" />
            <input placeholder="Rechercher une ressource">
          </label>
          <p class="px-1 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.04em] text-[#777777]">3 fichiers disponibles</p>
          <nav aria-label="Ressources du jeu de données" class="space-y-0.5">
            <button
              v-for="resource in resources"
              :key="resource.id"
              class="group grid h-8 w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1 rounded px-1 text-left"
              :class="activeResourceId === resource.id ? 'bg-[#eeeeee]' : 'hover:bg-[#f6f6f6]'"
              type="button"
              @click="activeResourceId = resource.id"
            >
              <span class="grid size-5 place-items-center rounded-sm" :class="resource.type === 'table' ? 'bg-[#c3fad5] text-[#18753c]' : resource.type === 'code' ? 'bg-[#fce164] text-[#716043]' : 'bg-[#fee7fc] text-[#6e445a]'">
                <i aria-hidden="true" :class="resourceIcon(resource.type)" class="text-sm leading-none" />
              </span>
              <span class="truncate text-[12px]" :class="activeResourceId === resource.id ? 'font-bold text-[#161616]' : 'font-medium text-[#3a3a3a]'">{{ resource.name }}</span>
              <span v-if="resource.size" class="whitespace-nowrap text-[10px] text-[#555555]">{{ resource.size }}</span>
              <span class="rounded bg-[#eeeeee] px-1.5 py-0.5 text-[10px] text-[#3a3a3a]">{{ resource.format }}</span>
            </button>
          </nav>
        </div>
      </aside>

      <section class="min-w-0">
        <div v-if="filteredView" class="flex min-h-9 items-center gap-2 border-b border-[#cacafb] bg-[#ebedff] px-3 text-[11px]">
          <i aria-hidden="true" class="ri-filter-line text-sm text-[#000091]" />
          <span class="min-w-0 flex-1 truncate"><strong>Vue de l’assistant :</strong> organisations contenant « Ministère »</span>
          <button class="inline-flex h-7 shrink-0 items-center gap-1 rounded-[6px] px-2 text-[#000091] hover:bg-white/60" type="button">
            <i aria-hidden="true" class="ri-download-line text-sm" />
            Télécharger les données filtrées
          </button>
          <button class="text-[#000091] underline" type="button" @click="filteredView = false">Revenir aux données initiales</button>
        </div>

        <template v-if="activeResource.type !== 'table'">
          <div class="grid min-h-[30rem] place-items-center bg-[#fafafa] p-8">
            <div class="max-w-md rounded-md border border-[#e5e5e5] bg-white p-5 text-center">
              <i aria-hidden="true" :class="resourceIcon(activeResource.type)" class="text-2xl text-[#777777]" />
              <h3 class="mt-3 text-[14px] font-bold">Aperçu de {{ activeResource.name }}</h3>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">L’aperçu s’adapte au format sélectionné. Les outils tabulaires restent réservés aux ressources Parquet.</p>
              <div v-if="activeResource.type === 'code'" class="mt-4 rounded-sm bg-[#f6f6f6] p-3 text-left font-mono text-[10px] leading-5 text-[#3a3a3a]">{<br>&nbsp;&nbsp;"title": "Catalogue des données",<br>&nbsp;&nbsp;"type": "object"<br>}</div>
              <button v-else class="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e5] px-3 text-[11px] text-[#000091]" type="button"><i class="ri-external-link-line text-sm" />Ouvrir le document</button>
            </div>
          </div>
        </template>

        <template v-else-if="mode === 'data'">
          <div class="flex min-h-12 flex-wrap items-center gap-2 border-b border-[#e5e5e5] px-2 py-2 xl:flex-nowrap xl:py-0">
            <label class="explorer-search-field w-[220px] max-md:w-full">
              <i aria-hidden="true" class="ri-search-line" />
              <input v-model="search" placeholder="Rechercher dans les données">
            </label>
            <span class="hidden text-[11px] text-[#555555] xl:inline">Recherche et filtres exécutés localement</span>
            <div class="relative">
              <button class="inline-flex h-6 items-center gap-1 rounded px-1 text-[11px] hover:bg-[#eeeeee]" type="button" @click="columnsOpen = !columnsOpen; filterOpen = false">
                <i aria-hidden="true" class="ri-layout-vertical-line text-sm text-[#3a3a3a]" /> Colonnes {{ visibleColumns.length }} sur 47 <i aria-hidden="true" class="ri-arrow-down-s-line text-sm" />
              </button>
              <div v-if="columnsOpen" class="absolute right-0 top-9 z-30 w-72 rounded-md border border-[#e5e5e5] bg-white p-2 shadow-lg">
                <div class="flex items-center justify-between px-2 pb-2"><p class="text-[10px] font-medium uppercase text-[#777777]">{{ visibleColumns.length }} sur 47 visibles</p><div class="flex gap-2"><button class="text-[10px] text-[#000091] underline" type="button" @click="selectedColumns = columns.map(column => column.name)">Tout</button><button class="text-[10px] text-[#000091] underline" type="button" @click="selectedColumns = [columns[0]!.name]">Aucune</button></div></div>
                <label class="mb-1 flex h-7 items-center gap-1 rounded border border-[#e5e5e5] bg-[#f6f6f6] px-2"><i class="ri-search-line text-xs text-[#777777]" /><input v-model="columnSearch" class="min-w-0 flex-1 bg-transparent text-[10px] outline-none" placeholder="Rechercher une colonne"></label>
                <label v-for="column in filteredColumns" :key="column.name" class="flex items-center gap-2 rounded px-2 py-1.5 text-[11px] hover:bg-[#f6f6f6]"><input :checked="selectedColumns.includes(column.name)" class="accent-[#000091]" type="checkbox" @change="toggleColumn(column.name)"><i :class="typeIcon(column.type)" class="text-sm text-[#555555]" /><span class="min-w-0 flex-1 truncate">{{ column.name }}</span><span class="text-[10px] text-[#777777]">{{ column.type }}</span></label>
              </div>
            </div>
            <div class="relative">
              <button class="inline-flex h-6 items-center gap-1 rounded px-1 text-[11px] hover:bg-[#eeeeee]" :class="filteredView ? 'bg-[#ebedff] text-[#000091]' : 'text-[#3a3a3a]'" type="button" @click="filterOpen = !filterOpen; columnsOpen = false">
                <i aria-hidden="true" class="ri-filter-line text-sm" /> Filtres <span v-if="filteredView" class="rounded-full bg-[#000091] px-1.5 text-[10px] text-white">1</span>
              </button>
              <div v-if="filterOpen" class="absolute right-0 top-9 z-30 w-72 rounded-md border border-[#e5e5e5] bg-white p-3 shadow-lg">
                <div class="flex items-center justify-between"><strong class="text-[12px]">Filtrer les données</strong><button type="button" @click="filterOpen = false"><i class="ri-close-line text-sm" /></button></div>
                <label class="mt-3 block text-[10px] font-medium uppercase text-[#777777]">Colonne<select v-model="filterColumn" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option v-for="column in columns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label>
                <template v-if="filterKind === 'category'">
                  <p class="mt-3 text-[10px] font-medium uppercase text-[#777777]">Valeurs</p>
                  <label v-for="option in categoryOptions" :key="option.value" class="mt-1.5 flex items-center gap-2 text-[11px]"><input v-model="categoryFilter" :value="option.value" class="accent-[#000091]" type="checkbox"><span class="min-w-0 flex-1 truncate">{{ option.value }}</span><span class="text-[10px] text-[#777777]">{{ option.count.toLocaleString('fr-FR') }}</span></label>
                </template>
                <template v-else-if="filterKind === 'number'">
                  <div class="mt-3 grid grid-cols-2 gap-2"><label class="text-[10px] font-medium uppercase text-[#777777]">Minimum<input v-model="numberMin" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[11px]" inputmode="numeric"></label><label class="text-[10px] font-medium uppercase text-[#777777]">Maximum<input v-model="numberMax" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[11px]" inputmode="numeric"></label></div>
                </template>
                <template v-else>
                  <select v-model="dateMode" class="mt-3 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="after">Après le</option><option value="before">Avant le</option><option value="between">Entre deux dates</option></select>
                  <input v-model="dateStart" class="mt-2 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[11px]" type="date">
                  <input v-if="dateMode === 'between'" v-model="dateEnd" class="mt-2 h-8 w-full rounded-md border border-[#e5e5e5] px-2 text-[11px]" type="date">
                </template>
                <div class="mt-3 border-t border-[#e5e5e5] pt-2"><p class="mb-1 text-[10px] font-medium uppercase text-[#777777]">Trier</p><div class="grid grid-cols-2 gap-1"><button class="h-7 rounded px-2 text-[11px]" :class="sort?.column === filterColumn && sort.direction === 'asc' ? 'bg-[#ebedff] text-[#000091]' : 'hover:bg-[#f6f6f6]'" type="button" @click="sort = { column: filterColumn, direction: 'asc' }"><i class="ri-arrow-up-line mr-1" />Croissant</button><button class="h-7 rounded px-2 text-[11px]" :class="sort?.column === filterColumn && sort.direction === 'desc' ? 'bg-[#ebedff] text-[#000091]' : 'hover:bg-[#f6f6f6]'" type="button" @click="sort = { column: filterColumn, direction: 'desc' }"><i class="ri-arrow-down-line mr-1" />Décroissant</button></div></div>
                <button class="mt-3 h-8 w-full rounded-md bg-[#000091] px-3 text-[11px] font-medium text-white" type="button" @click="filteredView = true; filterOpen = false">Appliquer le filtre</button>
              </div>
            </div>
            <span class="ml-auto inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-[#3a3a3a]"><i aria-hidden="true" class="ri-layout-horizontal-line text-sm" />{{ filteredView ? '42 318 lignes sur 130 412' : '130 412 lignes' }}</span>
          </div>

          <div v-if="activeFilterCount" class="flex min-h-9 flex-wrap items-center gap-1.5 border-b border-[#e5e5e5] px-2 py-1.5 text-[10px]">
            <span class="mr-1 font-medium text-[#555555]">Filtres actifs</span>
            <button v-if="search" class="inline-flex h-6 items-center gap-1 rounded border border-[#cacafb] bg-[#ebedff] px-2 text-[#000091]" type="button" @click="search = ''"><i class="ri-search-line text-xs" />« {{ search }} »<i class="ri-close-line text-xs" /></button>
            <button v-if="filteredView" class="inline-flex h-6 items-center gap-1 rounded border border-[#cacafb] bg-[#ebedff] px-2 text-[#000091]" type="button" @click="filteredView = false"><i class="ri-filter-line text-xs" />{{ filterLabel }}<i class="ri-close-line text-xs" /></button>
            <button v-if="sort" class="inline-flex h-6 items-center gap-1 rounded border border-[#cacafb] bg-[#ebedff] px-2 text-[#000091]" type="button" @click="sort = undefined"><i :class="sort.direction === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line'" class="text-xs" />{{ sort.column }}<i class="ri-close-line text-xs" /></button>
            <button class="ml-auto text-[10px] text-[#000091] underline" type="button" @click="clearAllFilters">Tout effacer</button>
          </div>

          <div v-if="previewState === 'loading'" class="min-h-[25rem] bg-white p-3" aria-label="Chargement de l’aperçu">
            <div class="animate-pulse space-y-2"><div class="grid h-12 grid-cols-5 gap-px overflow-hidden rounded border border-[#e5e5e5] bg-[#e5e5e5]"><span v-for="index in 5" :key="index" class="bg-[#f6f6f6]" /></div><div v-for="index in 8" :key="index" class="grid h-9 grid-cols-5 gap-px bg-[#eeeeee]"><span v-for="cell in 5" :key="cell" class="bg-white p-3"><span class="block h-2.5 rounded bg-[#eeeeee]" /></span></div></div>
          </div>
          <div v-else-if="previewState === 'empty'" class="grid min-h-[25rem] place-items-center bg-white p-6 text-center"><div><i class="ri-table-line text-2xl text-[#929292]" /><h3 class="mt-2 text-[13px] font-bold">Aucune ligne à afficher</h3><p class="mt-1 text-[11px] text-[#555555]">Cette ressource est vide ou aucun résultat ne correspond aux filtres.</p><button class="mt-3 text-[11px] text-[#000091] underline" type="button" @click="previewState = 'ready'; clearAllFilters()">Réinitialiser la vue</button></div></div>
          <div v-else-if="previewState === 'error'" class="grid min-h-[25rem] place-items-center bg-[#fef4f4] p-6 text-center"><div><i class="ri-error-warning-line text-2xl text-[#ce0500]" /><h3 class="mt-2 text-[13px] font-bold">Impossible de charger l’aperçu</h3><p class="mt-1 text-[11px] text-[#555555]">DuckDB n’a pas pu lire cette ressource Parquet.</p><button class="mt-3 h-8 rounded-md border border-[#ce0500] px-3 text-[11px] text-[#ce0500]" type="button" @click="retryPreview">Réessayer</button></div></div>
          <div v-else class="max-h-[25rem] overflow-auto" @scroll="onTableScroll">
            <table class="w-full min-w-[52rem] border-collapse text-[12px]">
              <thead class="bg-[#f6f6f6] text-left">
                <tr>
                  <th v-for="column in visibleColumns" :key="column.name" class="sticky top-0 z-10 h-12 border-b border-r border-[#e5e5e5] bg-[#f6f6f6] px-3 last:border-r-0" :style="{ width: `${columnWidths[column.name]}px`, minWidth: `${columnWidths[column.name]}px` }">
                    <span class="flex items-center justify-between gap-2">
                      <span class="flex min-w-0 items-center gap-1"><i aria-hidden="true" :class="typeIcon(column.type)" class="shrink-0 text-base font-normal text-[#3a3a3a]" /><strong class="truncate text-[12px]">{{ column.name }}</strong></span>
                      <button class="grid size-5 place-items-center rounded text-[#cecece] hover:bg-[#eeeeee] hover:text-[#3a3a3a]" type="button" :aria-label="`Filtrer ${column.name}`" @click="filterColumn = column.name; filterOpen = true"><i class="ri-filter-line text-base" /></button>
                    </span>
                    <button class="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize" type="button" :aria-label="`Redimensionner ${column.name}`" @mousedown="startResize(column.name, $event)"><span class="mx-auto block h-full w-px bg-transparent hover:bg-[#000091]" /></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in repeatedRows" :key="`${row.title}-${index}`" class="h-9 hover:bg-[#f8f8f8]">
                  <td v-for="column in visibleColumns" :key="column.name" class="border-b border-r border-[#e5e5e5] px-3 last:border-r-0" :class="column.type.includes('nombre') ? 'text-right font-mono tabular-nums' : ''" :style="{ width: `${columnWidths[column.name] ?? 150}px`, minWidth: `${columnWidths[column.name] ?? 150}px`, maxWidth: `${columnWidths[column.name] ?? 150}px` }">
                    <button class="block w-full truncate text-left" :class="column.type.includes('nombre') ? 'text-right' : ''" type="button" :title="String(cellValue(row, column.name) ?? '')" @click="openCellMenu(column.name, String(cellValue(row, column.name) ?? ''), $event)">
                      <a v-if="column.type === 'lien'" class="text-[#000091] underline" :href="String(cellValue(row, column.name))" @click.stop>{{ cellValue(row, column.name) }}</a>
                      <span v-else-if="column.type === 'oui / non'" class="inline-flex items-center gap-1"><i :class="cellValue(row, column.name) ? 'ri-checkbox-circle-line text-[#18753c]' : 'ri-close-circle-line text-[#777777]'" />{{ cellValue(row, column.name) ? 'Oui' : 'Non' }}</span>
                      <span v-else-if="cellValue(row, column.name) === null" class="italic text-[#929292]">Valeur manquante</span>
                      <span v-else>{{ cellValue(row, column.name) }}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="sticky bottom-0 flex h-9 items-center justify-center gap-2 border-t border-[#e5e5e5] bg-white/95 text-[11px] text-[#777777] backdrop-blur-sm">
              <template v-if="loadedCopies < 5"><span class="inline-flex w-8 overflow-hidden font-mono tracking-[-0.16em] text-[#777777]">⠋⠙⠹⠸</span>Chargement des lignes suivantes…</template>
              <template v-else><i class="ri-check-line text-sm" />Toutes les lignes disponibles sont affichées</template>
            </div>
          </div>

          <Teleport to="body">
            <div v-if="activeCell" class="fixed z-[120] w-56 rounded-md border border-[#e5e5e5] bg-white p-1 shadow-lg" :style="{ left: `${activeCell.x}px`, top: `${activeCell.y}px` }">
              <p class="truncate border-b border-[#e5e5e5] px-2 py-1.5 text-[10px] text-[#777777]">{{ activeCell.column }} : {{ activeCell.value }}</p>
              <button class="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[11px] hover:bg-[#f6f6f6]" type="button" @click="copyActiveCell"><i class="ri-file-copy-line text-sm" />Copier la valeur</button>
              <button class="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[11px] hover:bg-[#f6f6f6]" type="button" @click="applyCellFilter"><i class="ri-filter-line text-sm" />Filtrer avec cette valeur</button>
              <button class="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[11px] hover:bg-[#f6f6f6]" type="button" @click="activeCell = undefined"><i class="ri-filter-off-line text-sm" />Exclure cette valeur</button>
            </div>
          </Teleport>
        </template>

        <template v-else>
          <div class="grid grid-cols-[minmax(0,1fr)_13rem]">
            <div>
              <div class="border-b border-[#e5e5e5] px-4 py-3"><strong class="text-[12px]">Structure de la ressource</strong><p class="mt-0.5 text-[11px] text-[#777777]">Types détectés et exemples calculés localement.</p></div>
              <div v-for="column in columns" :key="column.name" class="grid grid-cols-[minmax(0,1fr)_8rem_12rem] items-center border-b border-[#e5e5e5] px-4 py-2 text-[11px]">
                <strong class="truncate">{{ column.name }}</strong><span class="text-[#555555]">{{ column.type }}</span><span class="truncate font-mono text-[10px] text-[#777777]">{{ column.examples.join(' · ') }}</span>
              </div>
            </div>
            <aside class="border-l border-[#e5e5e5] bg-[#fafafa] p-3">
              <p class="text-[10px] font-medium uppercase text-[#777777]">Résumé</p>
              <dl class="mt-2 space-y-2 text-[11px]"><div><dt class="text-[#777777]">Lignes</dt><dd class="font-bold">130 412</dd></div><div><dt class="text-[#777777]">Colonnes</dt><dd class="font-bold">47</dd></div><div><dt class="text-[#777777]">Poids estimé</dt><dd class="font-bold">186 Mo</dd></div></dl>
            </aside>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
