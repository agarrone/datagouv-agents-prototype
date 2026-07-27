<script setup lang="ts">
import type { LanguageModelUsage } from "ai";

const props = defineProps<{
  disabled: boolean;
  responding: boolean;
  resourceTitle?: string;
  resourceOrganization?: string;
  editing?: boolean;
  usage?: LanguageModelUsage;
}>();

const model = defineModel<string>({ required: true });
const emit = defineEmits<{ cancelEdit: []; submit: []; stop: [] }>();
const textarea = ref<HTMLTextAreaElement | null>(null);

function resizeTextarea() {
  const element = textarea.value;
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 68)}px`;
}

watch(model, async () => {
  await nextTick();
  resizeTextarea();
});

onMounted(resizeTextarea);

function focus() {
  textarea.value?.focus();
}

defineExpose({ focus });

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!props.disabled && model.value.trim()) emit("submit");
}
</script>

<template>
  <div class="shrink-0 bg-transparent px-3 pb-2">
    <form
      aria-label="Poser une question à l’assistant"
      class="agent-surface prompt-input mx-auto max-w-[42rem] overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#000091] focus-within:shadow-[0_0_0_1px_#000091]"
      @submit.prevent="emit('submit')"
    >
      <ExplorationResourceContext
        v-if="resourceTitle"
        :organization="resourceOrganization"
        :title="resourceTitle"
      />
      <div class="prompt-input-body flex h-28 flex-col justify-between bg-black/[0.02] px-2 py-2">
        <div
          v-if="editing"
          class="mb-1 flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e5e5] pb-1 text-[11px] leading-4 text-[#555]"
        >
          <span class="flex min-w-0 items-center gap-1.5">
            <i aria-hidden="true" class="ri-edit-line shrink-0 text-sm leading-none text-[#000091]" />
            <span class="truncate">Modification de la question</span>
          </span>
          <button
            aria-label="Annuler la modification"
            class="agent-focusable agent-pressable flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#666] hover:bg-[#eee] hover:text-[#161616]"
            title="Annuler la modification"
            type="button"
            @click="emit('cancelEdit')"
          >
            <i aria-hidden="true" class="ri-close-line text-sm leading-none" />
          </button>
        </div>
        <textarea
          id="agent-prompt"
          ref="textarea"
          v-model="model"
          rows="3"
          aria-label="Question sur les données"
          class="prompt-input-textarea min-h-0 flex-1 resize-none border-0 bg-transparent text-[13px] leading-[1.4] text-[#161616] outline-none placeholder:text-[#6a6a6a]"
          :disabled="disabled"
          :placeholder="disabled ? 'Chargez d’abord une ressource' : 'Posez une question en langage naturel'"
          @keydown.enter="handleEnter"
        />
        <footer class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-1">
            <ExplorationTokenUsage :usage="usage" />
            <span class="flex h-6 max-w-[150px] items-center rounded-full border border-[#cecece] px-2 text-[12px] leading-4 text-[#3a3a3a]">
              <span class="truncate">gpt-oss-120b</span>
            </span>
          </div>
          <button
            v-if="responding"
            aria-label="Arrêter la réponse"
            class="agent-focusable agent-pressable flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-[#161616] px-2 text-[11px] font-medium text-[#161616] hover:bg-[#eee]"
            type="button"
            @click="emit('stop')"
          >
            <i aria-hidden="true" class="ri-stop-mini-fill text-base leading-none" />
            Arrêter
          </button>
          <button
            v-else
            aria-label="Envoyer la question"
            class="agent-focusable agent-pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#000091] text-white hover:bg-[#1212ff] disabled:cursor-not-allowed disabled:bg-[#929292]"
            :disabled="disabled || model.trim().length === 0"
            type="submit"
          >
            <i aria-hidden="true" class="ri-arrow-up-line -translate-y-px text-base leading-none" />
          </button>
        </footer>
      </div>
    </form>
    <p class="mx-auto mt-1 min-h-6 max-w-[42rem] bg-transparent pb-1 text-right text-[11px] leading-6 text-[#5d5d5d]">
      L’assistant peut faire des erreurs. Vérifiez les résultats importants.
    </p>
  </div>
</template>

<style scoped>
.prompt-input-textarea {
  scrollbar-width: thin;
}
</style>
