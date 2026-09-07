<script setup lang="ts">
import type { PublicationPromptSuggestion } from "~~/shared/types/publication";

withDefaults(defineProps<{
  suggestions: PublicationPromptSuggestion[];
  disabled?: boolean;
  label?: string;
}>(), {
  disabled: false,
  label: "Demander à l’assistant",
});

const emit = defineEmits<{
  select: [suggestion: PublicationPromptSuggestion];
}>();
</script>

<template>
  <div v-if="suggestions.length" class="space-y-1.5">
    <p class="text-[11px] leading-4 text-[#777777]">{{ label }}</p>
    <div class="flex flex-wrap gap-1.5">
      <ExplorationSuggestion
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        compact
        :disabled="disabled || suggestion.disabled"
        :title="suggestion.hint"
        @select="emit('select', suggestion)"
      >
        {{ suggestion.label }}
      </ExplorationSuggestion>
    </div>
    <p
      v-for="suggestion in suggestions.filter(item => item.disabled && item.hint)"
      :key="`${suggestion.id}-hint`"
      class="text-[10px] leading-4 text-[#777777]"
    >
      {{ suggestion.hint }}
    </p>
  </div>
</template>
