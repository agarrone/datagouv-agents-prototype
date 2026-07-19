<script setup lang="ts">
defineProps<{ ready: boolean }>();

const emit = defineEmits<{
  suggestion: [value: string];
}>();

const suggestions = [
  "Explique-moi ton fonctionnement",
  "Explique-moi le contenu de ce jeu de données",
  "Quelles sont les colonnes de ce jeu de données ?",
];
</script>

<template>
  <div class="flex min-h-full flex-col justify-end px-1 pb-4">
    <ExplorationAssistantMark class="mb-5 h-20 w-20 text-[#666]" />
    <h3 class="text-sm font-semibold">Assistant d’exploration de données</h3>
    <p class="mt-1 text-[13px] leading-5 text-[#666]">
      Posez une question sur cette ressource. L’assistant inspecte son schéma,
      interroge les données et peut produire une vue, un graphique ou une carte.
    </p>
    <div class="mt-4 flex flex-wrap gap-2">
      <ExplorationSuggestion
        v-for="suggestion in suggestions"
        :key="suggestion"
        :disabled="!ready"
        @select="emit('suggestion', suggestion)"
      >
        {{ suggestion }}
      </ExplorationSuggestion>
    </div>
  </div>
</template>
