<script setup lang="ts">
import { renderAssistantMarkdown } from "~~/shared/markdown/assistant";

const props = defineProps<{ description: string }>();
const expanded = ref(false);
const rendered = computed(() => renderAssistantMarkdown(
  props.description.trim() || "Aucune description disponible.",
));
</script>

<template>
  <section aria-labelledby="dataset-description-title">
    <h2 id="dataset-description-title" class="text-[13px] font-bold leading-5">Description</h2>
    <div
      class="dataset-description relative mt-1 overflow-hidden text-[13px] leading-6 text-[#3a3a3a]"
      :class="expanded ? 'max-h-none' : 'max-h-64'"
    >
      <!-- markdown-it désactive le HTML brut et filtre les protocoles dangereux. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="rendered" />
      <div v-if="!expanded" class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-b from-white/0 via-white/95 to-white pb-1 pt-14">
        <button class="agent-focusable pointer-events-auto text-[12px] font-medium text-[#000091] underline underline-offset-2" type="button" @click="expanded = true">Lire plus</button>
      </div>
    </div>
    <button v-if="expanded" class="agent-focusable mt-2 text-[12px] font-medium text-[#000091] underline underline-offset-2" type="button" @click="expanded = false">Lire moins</button>
  </section>
</template>

<style scoped>
.dataset-description :deep(p + p),
.dataset-description :deep(p + ul),
.dataset-description :deep(ul + p) { margin-top: 12px; }
.dataset-description :deep(ul),
.dataset-description :deep(ol) { margin-top: 8px; padding-left: 20px; }
.dataset-description :deep(ul) { list-style: disc; }
.dataset-description :deep(ol) { list-style: decimal; }
.dataset-description :deep(a) { color: #000091; text-decoration: underline; text-underline-offset: 2px; }
.dataset-description :deep(strong) { font-weight: 600; }
</style>
