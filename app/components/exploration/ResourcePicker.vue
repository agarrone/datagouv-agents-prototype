<script setup lang="ts">
import type { ExplorationResource } from "~~/shared/data/exploration-resources";

defineProps<{
  resources: ExplorationResource[];
  selected: ExplorationResource | null;
  loading: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  select: [resource: ExplorationResource];
  load: [];
}>();
</script>

<template>
  <div class="flex min-h-[34rem] items-center justify-center p-6 md:p-10">
    <div class="w-full max-w-3xl">
      <div class="text-center">
        <h2 class="text-2xl font-bold">Choisissez une ressource pour commencer</h2>
        <p class="mt-3 leading-7 text-[#555555]">
          Chargez une ressource data.gouv.fr pour préparer son schéma et rendre
          les données disponibles à l’assistant dans votre navigateur.
        </p>
      </div>
      <div class="mt-6 grid gap-2">
        <button
          v-for="resource in resources"
          :key="resource.id"
          :aria-pressed="selected?.id === resource.id"
          class="flex w-full items-center justify-between gap-3 border bg-white px-3 py-2 text-left transition-colors"
          :class="selected?.id === resource.id ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5] hover:border-[#8585f6]'"
          :disabled="loading"
          type="button"
          @click="emit('select', resource)"
        >
          <span class="min-w-0">
            <strong class="block text-[13px] leading-5">{{ resource.title }}</strong>
            <span class="mt-0.5 block text-[11px] leading-4 text-[#555555]">{{ resource.organization }}</span>
          </span>
          <span class="shrink-0 text-[11px]" :class="selected?.id === resource.id ? 'text-[#000091]' : 'text-[#555555]'">
            {{ selected?.id === resource.id ? "Sélectionnée" : "Choisir" }}
          </span>
        </button>
      </div>
      <p v-if="error" class="mt-4 rounded-md border border-[#ffbdbd] bg-[#fef4f4] p-3 text-left text-[13px] text-[#ce0500]">{{ error }}</p>
      <div class="mt-6 flex justify-end">
        <button
          class="h-8 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:bg-[#777777]"
          :disabled="loading || !selected"
          type="button"
          @click="emit('load')"
        >
          {{ loading ? "Chargement de la ressource…" : "Charger la ressource" }}
        </button>
      </div>
    </div>
  </div>
</template>
