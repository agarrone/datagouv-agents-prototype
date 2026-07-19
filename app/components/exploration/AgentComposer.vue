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
  <div class="shrink-0 px-4 pb-3 pt-2">
    <form
      class="overflow-hidden rounded-lg border border-[#ddd] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] focus-within:border-[#000091]"
      @submit.prevent="emit('submit')"
    >
      <ExplorationResourceContext
        v-if="resourceTitle"
        :organization="resourceOrganization"
        :title="resourceTitle"
      />
      <textarea
        v-model="model"
        class="block min-h-24 w-full resize-none border-0 bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#777]"
        :disabled="disabled"
        :placeholder="disabled ? 'Chargez d’abord une ressource' : 'Posez une question en langage naturel'"
        @keydown.enter="handleEnter"
      />
      <div class="flex min-h-11 items-center justify-between gap-3 px-3 pb-3">
        <span class="text-[11px] text-[#777]">Entrée pour envoyer · Maj + Entrée pour revenir à la ligne</span>
        <button
          v-if="responding"
          aria-label="Arrêter la réponse"
          class="h-8 border border-[#000091] px-3 text-xs font-medium text-[#000091]"
          type="button"
          @click="emit('stop')"
        >
          Arrêter
        </button>
        <button
          v-else
          aria-label="Envoyer la question"
          class="flex h-8 w-8 shrink-0 items-center justify-center bg-[#000091] text-white disabled:bg-[#929292]"
          :disabled="disabled || model.trim().length === 0"
          type="submit"
        >
          <span aria-hidden="true">↑</span>
        </button>
      </div>
    </form>
    <p class="mt-2 text-center text-[11px] text-[#666]">
      L’assistant peut faire des erreurs. Vérifiez les résultats importants.
    </p>
  </div>
</template>
