<script setup lang="ts">
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { lintGutter, linter } from "@codemirror/lint";
import { Compartment, EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { validateReadOnlySql } from "~~/shared/sql/read-only";

const props = defineProps<{
  modelValue: string;
  columns: string[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const host = ref<HTMLDivElement | null>(null);
const language = new Compartment();
const editable = new Compartment();
let view: EditorView | undefined;

function focus() {
  view?.focus();
}

defineExpose({ focus });

const syntaxTheme = HighlightStyle.define([
  { tag: [tags.keyword, tags.bool, tags.null], color: "#000091", fontWeight: "600" },
  { tag: [tags.string, tags.special(tags.string)], color: "#18753c" },
  { tag: [tags.number, tags.integer, tags.float], color: "#a55800" },
  { tag: [tags.name, tags.variableName], color: "#555555" },
  { tag: [tags.typeName, tags.className, tags.standard(tags.name)], color: "#6e445a" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#777777", fontStyle: "italic" },
  { tag: tags.operator, color: "#555555" },
]);

function sqlLanguage() {
  return sql({
    dialect: PostgreSQL,
    schema: {
      data: props.columns.map(name => ({ label: name, type: "property" })),
    },
    defaultTable: "data",
    upperCaseKeywords: true,
  });
}

onMounted(() => {
  if (!host.value) return;
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        closeBrackets(),
        autocompletion(),
        syntaxHighlighting(syntaxTheme),
        lintGutter(),
        linter((editor) => {
          const query = editor.state.doc.toString().trim();
          if (!query) return [];
          try {
            validateReadOnlySql(query);
            return [];
          } catch (reason) {
            return [{
              from: 0,
              to: Math.max(1, editor.state.doc.length),
              severity: "error",
              source: "Console SQL",
              message: reason instanceof Error ? reason.message : "Requête SQL invalide.",
            }];
          }
        }, { delay: 600 }),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        language.of(sqlLanguage()),
        editable.of(EditorView.editable.of(!props.disabled)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit("update:modelValue", update.state.doc.toString());
        }),
        EditorView.theme({
          "&": {
            height: "176px",
            backgroundColor: "#fff",
            color: "#161616",
            fontFamily: '"Geist Mono Variable", "Geist Mono", ui-monospace, SFMono-Regular, monospace',
            fontSize: "13px",
          },
          "&.cm-focused": { outline: "none" },
          ".cm-content": { padding: "10px 0", caretColor: "#000091" },
          ".cm-line": { padding: "0 10px" },
          ".cm-gutters": {
            backgroundColor: "#f6f6f6",
            borderRight: "1px solid #e5e5e5",
            color: "#777777",
          },
          ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#f5f5fe" },
          ".cm-tooltip": { border: "1px solid #e5e5e5", borderRadius: "2px" },
          ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
            backgroundColor: "#ececfe",
            color: "#000091",
          },
        }),
      ],
    }),
  });
});

watch(() => props.modelValue, (value) => {
  if (!view || value === view.state.doc.toString()) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
});

watch(() => props.columns, () => {
  view?.dispatch({ effects: language.reconfigure(sqlLanguage()) });
}, { deep: true });

watch(() => props.disabled, (disabled) => {
  view?.dispatch({ effects: editable.reconfigure(EditorView.editable.of(!disabled)) });
});

onBeforeUnmount(() => view?.destroy());
</script>

<template>
  <div ref="host" class="sql-code-editor w-full bg-white" />
</template>

<style scoped>
.sql-code-editor {
  position: relative;
}

.sql-code-editor:focus-within::after {
  border: 2px solid #000091;
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 10;
}
</style>
