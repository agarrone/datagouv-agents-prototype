<script setup lang="ts">
const props = defineProps<{
  disabled: boolean;
  responding: boolean;
  resourceTitle?: string;
  resourceOrganization?: string;
}>();

const model = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: []; stop: [] }>();

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!props.disabled && model.value.trim()) emit("submit");
}
</script>

<template>
  <div class="shrink-0 border-t border-[#e5e5e5] bg-white/85 px-4 pb-3 pt-3 backdrop-blur-sm md:px-5">
    <form
      class="mx-auto max-w-[42rem] overflow-hidden rounded-xl border border-[#c6c6c6] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] focus-within:border-[#000091] focus-within:shadow-[0_2px_10px_rgba(0,0,145,0.10)]"
      @submit.prevent="emit('submit')"
    >
      <ExplorationResourceContext
        v-if="resourceTitle"
        :organization="resourceOrganization"
        :title="resourceTitle"
      />
      <textarea
        v-model="model"
        class="block min-h-20 w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#777]"
        :disabled="disabled"
        :placeholder="disabled ? 'Chargez d’abord une ressource' : 'Posez une question en langage naturel'"
        @keydown.enter="handleEnter"
      />
      <div class="flex min-h-10 items-center justify-between gap-3 px-4 pb-3">
        <span class="hidden text-[11px] text-[#777] sm:inline">Entrée pour envoyer · Maj + Entrée pour revenir à la ligne</span>
        <span class="text-[11px] text-[#777] sm:hidden">Entrée pour envoyer</span>
        <button
          v-if="responding"
          aria-label="Arrêter la réponse"
          class="h-8 rounded border border-[#000091] px-3 text-xs font-medium text-[#000091] hover:bg-[#f5f5fe]"
          type="button"
          @click="emit('stop')"
        >
          Arrêter
        </button>
        <button
          v-else
          aria-label="Envoyer la question"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#000091] text-white transition-colors hover:bg-[#1212ff] disabled:bg-[#929292]"
          :disabled="disabled || model.trim().length === 0"
          type="submit"
        >
          <svg aria-hidden="true" class="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M12 19V5m0 0-5 5m5-5 5 5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
          </svg>
        </button>
      </div>
    </form>
    <p class="mx-auto mt-2 max-w-[42rem] text-center text-[11px] text-[#666]">
      L’assistant peut faire des erreurs. Vérifiez les résultats importants.
    </p>
  </div>
</template>
