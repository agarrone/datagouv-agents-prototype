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
        <p class="mt-3 leading-7 text-[#666]">
          Chargez une ressource data.gouv.fr pour préparer son schéma et rendre
          les données disponibles à l’assistant dans votre navigateur.
        </p>
      </div>
      <div class="mt-6 grid gap-2">
        <button
          v-for="resource in resources"
          :key="resource.id"
          :aria-pressed="selected?.id === resource.id"
          class="flex w-full items-center justify-between gap-4 border bg-white px-4 py-3 text-left transition-colors"
          :class="selected?.id === resource.id ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#ddd] hover:border-[#8585f6]'"
          :disabled="loading"
          type="button"
          @click="emit('select', resource)"
        >
          <span class="min-w-0">
            <strong class="block text-sm">{{ resource.title }}</strong>
            <span class="mt-1 block text-xs text-[#666]">{{ resource.organization }}</span>
          </span>
          <span class="shrink-0 text-sm" :class="selected?.id === resource.id ? 'text-[#000091]' : 'text-[#666]'">
            {{ selected?.id === resource.id ? "Sélectionnée" : "Choisir" }}
          </span>
        </button>
      </div>
      <p v-if="error" class="mt-4 border-l-4 border-[#e1000f] bg-[#fef4f4] p-3 text-left text-sm">{{ error }}</p>
      <div class="mt-6 flex justify-end">
        <button
          class="bg-[#000091] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-[#929292]"
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
