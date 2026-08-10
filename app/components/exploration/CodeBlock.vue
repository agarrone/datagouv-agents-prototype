<script setup lang="ts">
import { highlightCode, normalizeCodeLanguage } from "~~/shared/highlight/code";

const props = withDefaults(defineProps<{
  code: string;
  collapsible?: boolean;
  open?: boolean;
  language?: string;
}>(), {
  language: "SQL",
});

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const highlightedCode = computed(() => highlightCode(props.code, props.language));
const languageClass = computed(() => `language-${normalizeCodeLanguage(props.language)}`);

async function copyCode() {
  await navigator.clipboard.writeText(props.code);
  copied.value = true;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
  }, 1800);
}

onBeforeUnmount(() => clearTimeout(copyTimer));
</script>

<template>
  <details v-if="collapsible" class="group mt-1" :open="open">
    <summary class="cursor-pointer list-none text-[11px] text-[#555555] hover:text-[#000091]">
      <span class="group-open:hidden">Afficher la requête SQL</span>
      <span class="hidden group-open:inline">Masquer la requête SQL</span>
    </summary>
    <div class="agent-inset-surface mt-2 overflow-hidden">
      <div class="flex min-h-8 items-center justify-between border-b border-[#e5e5e5] px-2.5 text-[11px] text-[#555555]">
        <span class="font-mono uppercase">{{ language }}</span>
        <button class="inline-flex items-center gap-1 hover:text-[#000091]" type="button" @click="copyCode">
          <i aria-hidden="true" :class="copied ? 'ri-check-line' : 'ri-file-copy-line'" class="text-sm leading-none" />
          {{ copied ? "Copié" : "Copier" }}
        </button>
      </div>
      <!-- highlight.js escapes source code before returning token spans. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <pre class="max-h-44 overflow-auto px-3 py-2.5 font-mono text-[12px] leading-5"><code class="hljs" :class="languageClass" v-html="highlightedCode" /></pre>
    </div>
  </details>
  <div v-else class="agent-inset-surface overflow-hidden">
    <div class="flex min-h-8 items-center justify-between border-b border-[#e5e5e5] px-2.5 text-[11px] text-[#555555]">
      <span class="font-mono uppercase">{{ language }}</span>
      <button class="inline-flex items-center gap-1 hover:text-[#000091]" type="button" @click="copyCode">
        <i aria-hidden="true" :class="copied ? 'ri-check-line' : 'ri-file-copy-line'" class="text-sm leading-none" />
        {{ copied ? "Copié" : "Copier" }}
      </button>
    </div>
    <!-- highlight.js escapes source code before returning token spans. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <pre class="max-h-44 overflow-auto px-3 py-2.5 font-mono text-[12px] leading-5"><code class="hljs" :class="languageClass" v-html="highlightedCode" /></pre>
  </div>
</template>
