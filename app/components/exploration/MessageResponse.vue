<script setup lang="ts">
import { renderAssistantMarkdown } from "~~/shared/markdown/assistant";

const props = withDefaults(defineProps<{
  content: string;
  streaming?: boolean;
}>(), {
  streaming: false,
});

const rendered = computed(() => renderAssistantMarkdown(props.content, props.streaming));
</script>

<template>
  <!-- markdown-it has raw HTML disabled and validates unsafe link protocols. -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="agent-message-response"
    :class="{ 'agent-message-response--streaming': streaming }"
    v-html="rendered"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
.agent-message-response {
  color: #161616;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.agent-message-response :deep(p + p),
.agent-message-response :deep(h1 + p),
.agent-message-response :deep(h2 + p),
.agent-message-response :deep(h3 + p),
.agent-message-response :deep(h4 + p),
.agent-message-response :deep(p + ul),
.agent-message-response :deep(p + ol),
.agent-message-response :deep(ul + p),
.agent-message-response :deep(ol + p),
.agent-message-response :deep(table + p) {
  margin-top: 10px;
}

.agent-message-response :deep(h1 + p),
.agent-message-response :deep(h2 + p),
.agent-message-response :deep(h3 + p),
.agent-message-response :deep(h4 + p) {
  margin-top: 4px;
}

.agent-message-response :deep(h1),
.agent-message-response :deep(h2),
.agent-message-response :deep(h3),
.agent-message-response :deep(h4) {
  font-weight: 600;
  line-height: 20px;
  margin-top: 14px;
  text-wrap: balance;
}

.agent-message-response :deep(h1) {
  font-size: 17px;
  line-height: 24px;
}

.agent-message-response :deep(h2) { font-size: 15px; }

.agent-message-response :deep(h3),
.agent-message-response :deep(h4) { font-size: 13px; }

.agent-message-response :deep(h1:first-child),
.agent-message-response :deep(h2:first-child),
.agent-message-response :deep(h3:first-child),
.agent-message-response :deep(h4:first-child) {
  margin-top: 0;
}

.agent-message-response :deep(p),
.agent-message-response :deep(li),
.agent-message-response :deep(blockquote) {
  text-wrap: pretty;
}

.agent-message-response :deep(ul),
.agent-message-response :deep(ol) {
  margin: 8px 0 0;
  padding-left: 20px;
}

.agent-message-response :deep(ul) {
  list-style-type: disc;
}

.agent-message-response :deep(ol) {
  list-style-type: decimal;
}

.agent-message-response :deep(ul ul) {
  list-style-type: circle;
}

.agent-message-response :deep(ul ul ul) {
  list-style-type: square;
}

.agent-message-response :deep(li) {
  display: list-item;
  padding-left: 2px;
}

.agent-message-response :deep(li::marker) {
  color: #777777;
  font-variant-numeric: tabular-nums;
}

.agent-message-response :deep(li + li) { margin-top: 4px; }
.agent-message-response :deep(li > ul),
.agent-message-response :deep(li > ol) { margin-top: 4px; }
.agent-message-response :deep(li > p) { margin: 0; }
.agent-message-response :deep(strong) { font-weight: 600; }
.agent-message-response :deep(code) {
  background: #f6f6f6;
  border-radius: 2px;
  font-family: "Geist Mono Variable", "Geist Mono", ui-monospace, SFMono-Regular, monospace;
  color: #161616;
  font-size: 12px;
  padding: 1px 4px;
}

.agent-message-response :deep(pre) {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 2px;
  margin-top: 10px;
  max-height: 240px;
  overflow: auto;
  padding: 10px 12px;
}

.agent-message-response :deep(pre code) { background: transparent; padding: 0; }
.agent-message-response :deep(a) { color: #000091; text-decoration: underline; }
.agent-message-response :deep(hr) {
  border: 0;
  border-top: 1px solid #e5e5e5;
  margin: 14px 0;
}
.agent-message-response :deep(blockquote) {
  border-left: 2px solid #777777;
  color: #555555;
  margin: 10px 0 0;
  padding-left: 12px;
}

.agent-message-response :deep(.agent-markdown-table) {
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  margin-top: 10px;
  max-width: 100%;
  overflow-x: auto;
}

.agent-message-response :deep(table) {
  border-collapse: collapse;
  min-width: 100%;
  width: max-content;
  font-size: 12px;
  line-height: 18px;
}

.agent-message-response :deep(th),
.agent-message-response :deep(td) {
  border-bottom: 1px solid #e5e5e5;
  border-right: 1px solid #e5e5e5;
  padding: 7px 9px;
  text-align: left;
  vertical-align: top;
  white-space: normal;
}

.agent-message-response :deep(th) { background: #f6f6f6; font-weight: 600; }
.agent-message-response :deep(th:last-child),
.agent-message-response :deep(td:last-child) { border-right: 0; }
.agent-message-response :deep(tbody tr:last-child td) { border-bottom: 0; }

.agent-message-response--streaming :deep(p:last-child)::after {
  background: #000091;
  content: "";
  display: inline-block;
  height: 1em;
  margin-left: 3px;
  vertical-align: -0.12em;
  width: 2px;
  animation: response-caret 900ms steps(1) infinite;
}

@keyframes response-caret {
  0%, 45% { opacity: 1; }
  46%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .agent-message-response--streaming :deep(p:last-child)::after { animation: none; }
}
</style>
