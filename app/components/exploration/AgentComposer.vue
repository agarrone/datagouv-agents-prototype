<script setup lang="ts">
import type { LanguageModelUsage } from "ai";
import { agentModels, agentModelLabel, DEFAULT_AGENT_MODEL_ID, type AgentModelId } from "~~/shared/agents/models";

const props = defineProps<{
  disabled: boolean;
  responding: boolean;
  resourceTitle?: string;
  resourceOrganization?: string;
  editing?: boolean;
  usage?: LanguageModelUsage;
  disabledPlaceholder?: string;
}>();

const model = defineModel<string>({ required: true });
const selectedModelId = defineModel<AgentModelId>("selectedModelId", { default: DEFAULT_AGENT_MODEL_ID });
const emit = defineEmits<{ cancelEdit: []; submit: []; stop: [] }>();
const textarea = ref<HTMLTextAreaElement | null>(null);
const modelDetails = ref<HTMLDetailsElement | null>(null);
const selectedModelLabel = computed(() => agentModelLabel(selectedModelId.value));

function selectModel(id: AgentModelId) {
  selectedModelId.value = id;
  if (modelDetails.value) modelDetails.value.open = false;
}

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

function closeModelDetails(event: PointerEvent) {
  if (modelDetails.value?.open && !modelDetails.value.contains(event.target as Node)) {
    modelDetails.value.open = false;
  }
}

onMounted(() => {
  resizeTextarea();
  document.addEventListener("pointerdown", closeModelDetails);
});

onBeforeUnmount(() => document.removeEventListener("pointerdown", closeModelDetails));

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
          class="mb-1 flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e5e5] pb-1 text-[11px] leading-4 text-[#555555]"
        >
          <span class="flex min-w-0 items-center gap-1.5">
            <i aria-hidden="true" class="ri-edit-line shrink-0 text-sm leading-none text-[#000091]" />
            <span class="truncate">Modification de la question</span>
          </span>
          <button
            aria-label="Annuler la modification"
            class="agent-focusable agent-pressable flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[#555555] hover:bg-[#f6f6f6] hover:text-[#000091]"
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
          class="prompt-input-textarea min-h-0 flex-1 resize-none border-0 bg-transparent text-[12px] leading-[1.45] text-[#161616] outline-none placeholder:text-[#777777]"
          :disabled="disabled"
          :placeholder="disabled ? (disabledPlaceholder ?? 'Chargez d’abord une ressource') : 'Posez une question en langage naturel'"
          @keydown.enter="handleEnter"
        />
        <footer class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-1">
            <ExplorationTokenUsage :usage="usage" />
            <details ref="modelDetails" class="group/model relative h-6" :class="responding ? 'pointer-events-none opacity-60' : ''">
              <summary
                :aria-label="`Choisir le modèle. Modèle actif : ${selectedModelLabel}`"
                class="agent-focusable flex h-6 max-w-[150px] cursor-pointer list-none items-center rounded-full border border-[#e5e5e5] px-1.5 text-[11px] leading-4 text-[#555555] transition-[background-color,color] duration-150 hover:bg-[#f6f6f6] hover:text-[#161616] [&::-webkit-details-marker]:hidden"
                title="Informations sur le modèle"
              >
                <span class="truncate">{{ selectedModelLabel }}</span>
                <i aria-hidden="true" class="ri-arrow-down-s-line ml-1 text-[13px] leading-none" />
              </summary>
              <div class="absolute bottom-7 left-0 z-30 w-[230px] overflow-hidden rounded-md border border-[#e5e5e5] bg-white p-1 text-[11px] leading-4 text-[#555555] shadow-[0_2px_4px_rgba(0,0,0,0.04),2px_4px_16px_rgba(0,0,0,0.12)]">
                <p class="px-2 py-1 text-[10px] uppercase tracking-[0.04em] text-[#777777]">Modèle via Albert API</p>
                <button
                  v-for="availableModel in agentModels"
                  :key="availableModel.id"
                  :disabled="responding"
                  class="agent-focusable flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#f6f6f6]"
                  :class="availableModel.id === selectedModelId ? 'text-[#000091]' : 'text-[#3a3a3a]'"
                  type="button"
                  @click="selectModel(availableModel.id)"
                >
                  <i aria-hidden="true" class="ri-check-line text-[14px]" :class="availableModel.id === selectedModelId ? 'opacity-100' : 'opacity-0'" />
                  <span>{{ availableModel.label }}</span>
                </button>
              </div>
            </details>
          </div>
          <button
            v-if="responding"
            aria-label="Arrêter la réponse"
            class="agent-focusable agent-pressable flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#161616] px-2 text-[11px] font-medium text-[#161616] hover:bg-[#f6f6f6]"
            type="button"
            @click="emit('stop')"
          >
            <i aria-hidden="true" class="ri-stop-mini-line text-base leading-none" />
            Arrêter
          </button>
          <button
            v-else
            aria-label="Envoyer la question"
            class="agent-focusable agent-pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#000091] text-white hover:bg-[#1212ff] disabled:cursor-not-allowed disabled:bg-[#777777]"
            :disabled="disabled || model.trim().length === 0"
            type="submit"
          >
            <i aria-hidden="true" class="ri-arrow-up-line -translate-y-px text-base leading-none" />
          </button>
        </footer>
      </div>
    </form>
    <p class="mx-auto mt-1 min-h-6 max-w-[42rem] bg-transparent pb-1 text-right text-[11px] leading-6 text-[#555555]">
      L’assistant peut faire des erreurs.
      <a
        class="agent-focusable ml-1 underline underline-offset-2 hover:text-[#000091]"
        href="/documentation"
        rel="noopener noreferrer"
        target="_blank"
      >En savoir plus <i aria-hidden="true" class="ri-external-link-line align-[-1px] text-sm leading-none" /></a>
    </p>
  </div>
</template>

<style scoped>
.prompt-input-textarea {
  scrollbar-width: thin;
}
</style>
