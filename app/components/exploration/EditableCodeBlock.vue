<script setup lang="ts">
import { highlightCode, normalizeCodeLanguage } from "~~/shared/highlight/code";

const props = withDefaults(defineProps<{
  modelValue: string;
  language?: "SQL" | "JSON";
  title: string;
}>(), {
  language: "SQL",
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const textarea = ref<HTMLTextAreaElement | null>(null);
const highlighted = ref<HTMLElement | null>(null);
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const highlightedCode = computed(() => highlightCode(props.modelValue, props.language));
const languageClass = computed(() => `language-${normalizeCodeLanguage(props.language)}`);

function syncScroll() {
  if (!textarea.value || !highlighted.value) return;
  highlighted.value.scrollTop = textarea.value.scrollTop;
  highlighted.value.scrollLeft = textarea.value.scrollLeft;
}

async function copyCode() {
  await navigator.clipboard.writeText(props.modelValue);
  copied.value = true;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copied.value = false; }, 1800);
}

onBeforeUnmount(() => clearTimeout(copyTimer));
</script>

<template>
  <details class="group overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
    <summary class="agent-focusable flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-[12px] font-medium hover:bg-[#f6f6f6] [&::-webkit-details-marker]:hidden">
      <i aria-hidden="true" :class="language === 'SQL' ? 'ri-terminal-line' : 'ri-braces-line'" class="text-[15px] text-[#000091]" />
      <span class="min-w-0 flex-1">{{ title }}</span>
      <span class="font-mono text-[10px] font-normal text-[#777777]">{{ language }}</span>
      <i aria-hidden="true" class="ri-arrow-down-s-line text-[14px] text-[#777777] transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div class="border-t border-[#e5e5e5]">
      <div class="flex h-8 items-center justify-end bg-[#f6f6f6] px-3 text-[10px] text-[#666666]">
        <button class="inline-flex items-center gap-1 hover:text-[#000091]" type="button" @click="copyCode"><i aria-hidden="true" :class="copied ? 'ri-check-line' : 'ri-file-copy-line'" class="text-[13px]" />{{ copied ? "Copié" : "Copier" }}</button>
      </div>
      <div class="code-editor relative h-52 overflow-hidden bg-[#f6f6f6]">
        <!-- highlight.js échappe le code avant de produire les spans. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <pre ref="highlighted" aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-auto p-3 font-mono text-[11px] leading-5"><code class="hljs" :class="languageClass" v-html="highlightedCode" /></pre>
        <textarea
          ref="textarea"
          :aria-label="title"
          autocomplete="off"
          class="absolute inset-0 h-full w-full resize-none overflow-auto border-0 bg-transparent p-3 font-mono text-[11px] leading-5 outline-none"
          :value="modelValue"
          wrap="off"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @scroll="syncScroll"
        />
      </div>
    </div>
  </details>
</template>

<style scoped>
.code-editor textarea {
  color: transparent;
  caret-color: #161616;
  -webkit-text-fill-color: transparent;
}

.code-editor textarea::selection {
  background: rgb(0 0 145 / 18%);
}
</style>
