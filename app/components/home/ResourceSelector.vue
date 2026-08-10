<script setup lang="ts">
import type { ExplorationResource } from "~~/shared/data/exploration-resources";

const props = defineProps<{
  resources: ExplorationResource[];
}>();

const selectedId = ref(props.resources[0]?.id ?? "");
const selectedResource = computed(() =>
  props.resources.find(resource => resource.id === selectedId.value),
);
</script>

<template>
  <section aria-labelledby="choose-dataset" class="border-t border-[#ddd] pt-8">
    <div class="mb-6 max-w-2xl">
      <h2 id="choose-dataset" class="text-[22px] font-bold leading-8 text-[#161616]">
        Choisissez un jeu de données
      </h2>
      <p class="mt-2 text-[14px] leading-6 text-[#3a3a3a]">
        Ces ressources disposent d’une version Parquet exploitable directement dans votre navigateur.
      </p>
    </div>

    <div class="grid gap-2">
      <button
        v-for="resource in resources"
        :key="resource.id"
        :aria-pressed="selectedId === resource.id"
        class="agent-focusable agent-pressable group flex w-full items-center gap-3 rounded-sm border bg-white px-3 py-2.5 text-left"
        :class="selectedId === resource.id
          ? 'border-[#000091] bg-[#f5f5fe]'
          : 'border-[#ddd] hover:border-[#929292]'"
        type="button"
        @click="selectedId = resource.id"
      >
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-[13px]"
          :class="selectedId === resource.id
            ? 'border-[#000091] bg-[#000091] text-white'
            : 'border-[#ddd] bg-[#f6f6f6] text-[#666]'"
          aria-hidden="true"
        >
          <i :class="selectedId === resource.id ? 'ri-check-line' : 'ri-table-line'" />
        </span>
        <span class="min-w-0 flex-1">
          <strong class="block truncate text-[13px] font-semibold leading-5 text-[#161616]">
            {{ resource.title }}
          </strong>
          <span class="block truncate text-[11px] leading-4 text-[#666]">
            {{ resource.organization }}
          </span>
        </span>
        <span class="shrink-0 text-[11px] text-[#666]">
          {{ selectedId === resource.id ? "Sélectionné" : "Choisir" }}
        </span>
      </button>
    </div>

    <div class="mt-5 flex justify-end border-t border-[#ddd] pt-5">
      <NuxtLink
        v-if="selectedResource"
        class="agent-focusable agent-pressable inline-flex h-9 items-center gap-2 rounded-sm bg-[#000091] px-3 text-[12px] font-medium text-white hover:bg-[#1212ff]"
        :to="{ path: '/laboratoire/exploration', query: { resource: selectedResource.id } }"
      >
        Explorer ce jeu de données
        <i aria-hidden="true" class="ri-arrow-right-line text-sm leading-none" />
      </NuxtLink>
    </div>
  </section>
</template>
