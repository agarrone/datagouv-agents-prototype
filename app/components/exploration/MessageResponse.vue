<script setup lang="ts">
import MarkdownIt from "markdown-it";

const props = defineProps<{ content: string }>();

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});

const defaultLinkOpen = markdown.renderer.rules.link_open
  ?? ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  tokens[index]?.attrSet("target", "_blank");
  tokens[index]?.attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

const rendered = computed(() => markdown.render(props.content));
</script>

<template>
  <!-- markdown-it has raw HTML disabled and validates unsafe link protocols. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="agent-message-response" v-html="rendered" />
</template>

<style scoped>
.agent-message-response {
  color: #161616;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.agent-message-response :deep(p + p),
.agent-message-response :deep(p + ul),
.agent-message-response :deep(p + ol),
.agent-message-response :deep(ul + p),
.agent-message-response :deep(ol + p),
.agent-message-response :deep(table + p) {
  margin-top: 10px;
}

.agent-message-response :deep(ul),
.agent-message-response :deep(ol) {
  margin: 8px 0 0;
  padding-left: 20px;
}

.agent-message-response :deep(li + li) { margin-top: 4px; }
.agent-message-response :deep(strong) { font-weight: 600; }
.agent-message-response :deep(code) {
  background: #f6f6f6;
  border-radius: 3px;
  font-family: Inconsolata, ui-monospace, monospace;
  font-size: 0.92em;
  padding: 1px 4px;
}

.agent-message-response :deep(pre) {
  background: white;
  border: 1px solid #ddd;
  margin-top: 10px;
  max-height: 240px;
  overflow: auto;
  padding: 10px 12px;
}

.agent-message-response :deep(pre code) { background: transparent; padding: 0; }
.agent-message-response :deep(a) { color: #000091; text-decoration: underline; }
.agent-message-response :deep(blockquote) {
  border-left: 2px solid #929292;
  color: #666;
  margin: 10px 0 0;
  padding-left: 12px;
}

.agent-message-response :deep(table) {
  border-collapse: collapse;
  display: block;
  margin-top: 10px;
  max-width: 100%;
  overflow-x: auto;
  width: max-content;
}

.agent-message-response :deep(th),
.agent-message-response :deep(td) {
  border: 1px solid #ddd;
  padding: 7px 9px;
  text-align: left;
  vertical-align: top;
}

.agent-message-response :deep(th) { background: #f6f6f6; font-weight: 600; }
</style>
