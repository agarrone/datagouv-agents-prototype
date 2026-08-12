<script setup lang="ts">
import type { DatagouvDatasetResource } from "~~/shared/data/exploration-resources";

const props = defineProps<{
  collapsed: boolean;
  loading: boolean;
  resources: DatagouvDatasetResource[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [resource: DatagouvDatasetResource];
  "update:collapsed": [value: boolean];
}>();

const search = ref("");
const filteredResources = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase("fr");
  if (!needle) return props.resources;
  return props.resources.filter(resource =>
    `${resource.title} ${resource.format}`.toLocaleLowerCase("fr").includes(needle),
  );
});
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-[#e5e5e5] bg-white">
    <div class="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-[#f6f6f6]" :class="collapsed ? 'px-2.5' : 'px-4'">
      <div v-if="!collapsed" class="min-w-0 flex-1">
        <strong class="block truncate text-[12px]">Ressources</strong>
        <p class="mt-0.5 truncate text-[11px] text-[#555555]">{{ resources.length }} fichier{{ resources.length > 1 ? "s" : "" }} disponible{{ resources.length > 1 ? "s" : "" }}</p>
      </div>
      <button
        :aria-label="collapsed ? 'Déplier les ressources' : 'Replier les ressources'"
        class="grid size-6 place-items-center rounded hover:bg-[#eeeeee] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#000091]"
        type="button"
        @click="emit('update:collapsed', !collapsed)"
      >
        <i :class="collapsed ? 'ri-sidebar-unfold-line' : 'ri-sidebar-fold-line'" class="text-sm text-[#777777]" />
      </button>
    </div>

    <div v-if="!collapsed" class="min-h-0 flex-1 overflow-auto p-2">
      <label class="flex h-8 items-center gap-1 rounded border border-[#e5e5e5] bg-[#f6f6f6] px-2">
        <i class="ri-search-line text-sm text-[#555555]" />
        <input v-model="search" class="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#777777]" placeholder="Rechercher une ressource">
      </label>
      <p v-if="search" class="px-1 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.04em] text-[#777777]">{{ filteredResources.length }} résultat{{ filteredResources.length > 1 ? "s" : "" }}</p>
      <nav aria-label="Ressources du laboratoire" class="space-y-0.5" :class="search ? 'mt-1' : 'mt-3'">
        <button
          v-for="resource in filteredResources"
          :key="resource.id"
          class="grid min-h-9 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 rounded px-1.5 py-1 text-left"
          :class="selectedId === resource.id ? 'bg-[#eeeeee]' : resource.parquetUrl ? 'hover:bg-[#f6f6f6]' : 'cursor-default opacity-60'"
          :disabled="loading || !resource.parquetUrl"
          type="button"
          @click="emit('select', resource)"
        >
          <span class="grid size-5 place-items-center rounded-sm bg-[#c3fad5] text-[#18753c]"><i class="ri-table-line text-sm" /></span>
          <span class="min-w-0">
            <span class="block truncate text-[11px]" :class="selectedId === resource.id ? 'font-bold' : 'font-medium'">{{ resource.title }}</span>
            <span class="block truncate text-[10px] text-[#777777]">{{ resource.format }}{{ resource.parquetUrl ? " · explorable" : " · non explorable" }}</span>
          </span>
        </button>
      </nav>
      <p v-if="filteredResources.length === 0" class="px-2 py-5 text-center text-[11px] text-[#777777]">Aucune ressource trouvée.</p>
    </div>
  </aside>
</template>
