<script setup lang="ts">
defineProps<{
  ready: boolean;
  loading?: boolean;
  resourceTitle?: string;
}>();

const emit = defineEmits<{
  load: [];
  suggestion: [value: string];
}>();

const suggestions = [
  "Explique-moi ton fonctionnement",
  "Explique-moi le contenu de ce jeu de données",
  "Quelles sont les colonnes de ce jeu de données ?",
];
</script>

<template>
  <div class="flex min-h-full flex-col justify-end pb-2 max-sm:justify-start max-sm:py-4">
    <div class="mb-3 h-20 w-20 overflow-hidden max-sm:h-16 max-sm:w-16" aria-hidden="true">
      <img
        alt=""
        class="h-full w-full object-contain grayscale contrast-[2.8] mix-blend-multiply motion-reduce:hidden"
        src="/assets/assistant-signature.gif"
      >
      <img
        alt=""
        class="hidden h-full w-full object-contain grayscale contrast-[2.8] mix-blend-multiply motion-reduce:block"
        src="/assets/assistant-logo.svg"
      >
    </div>

    <h3 class="px-1 text-balance text-[15px] font-semibold leading-[1.4] text-[#161616]">
      Assistant d’exploration de données
    </h3>

    <template v-if="!ready">
      <p class="mt-1 max-w-[31rem] px-1 text-pretty text-[13px] leading-5 text-[#5d5d5d]">
        Chargez une ressource pour permettre à l’assistant de comprendre sa structure.
      </p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <button
          v-if="resourceTitle"
          class="agent-focusable agent-pressable flex min-h-6 max-w-full items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-white px-2 py-0.5 text-left text-[11px] leading-4 text-[#3a3a3a] hover:border-[#000091] hover:bg-[#e8edff] hover:text-[#000091] disabled:cursor-wait disabled:text-[#666] max-sm:min-h-10 max-sm:w-full max-sm:px-3 max-sm:py-2 max-sm:text-[12px]"
          :disabled="loading"
          type="button"
          @click="emit('load')"
        >
          <ExplorationUnicodeSpinner v-if="loading" class="text-[9px]" name="dna" />
          <i v-else aria-hidden="true" class="ri-table-line shrink-0 text-sm leading-none" />
          <span class="max-w-72 truncate max-sm:max-w-56">
            {{ loading ? `Chargement de ${resourceTitle}…` : resourceTitle }}
          </span>
        </button>
      </div>
    </template>

    <template v-else>
      <p class="mt-1 px-1 text-[13px] leading-5 text-[#5d5d5d]">
        Posez une question sur ces données.
      </p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <ExplorationSuggestion
          v-for="suggestion in suggestions"
          :key="suggestion"
          compact
          @select="emit('suggestion', suggestion)"
        >
          {{ suggestion }}
        </ExplorationSuggestion>
      </div>
    </template>
  </div>
</template>
