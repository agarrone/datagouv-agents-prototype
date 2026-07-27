<script setup lang="ts">
const props = defineProps<{
  title: string;
  state: string;
  sql?: string;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  icon?: string;
  details?: Array<{ label: string; value: string }>;
  fields?: Array<{ name: string; type?: string }>;
}>();

const open = ref(props.state === "output-error");

watch(
  () => props.state,
  (state) => {
    if (state === "output-error") open.value = true;
  },
);

const status = computed(() => {
  if (props.state === "output-available") return "Terminé";
  if (props.state === "output-error") return "Erreur";
  if (props.state === "input-available") return "En cours";
  return "En attente";
});

const statusIcon = computed(() => {
  if (props.state === "output-available") return "ri-checkbox-circle-line";
  if (props.state === "output-error") return "ri-close-circle-line";
  if (props.state === "input-available") return "ri-loader-4-line animate-spin";
  return "ri-time-line";
});

const statusClass = computed(() => {
  if (props.state === "output-available") return "text-[#18753c]";
  if (props.state === "output-error") return "text-[#ce0500]";
  return "text-[#666]";
});
</script>

<template>
  <section
    class="agent-surface agent-surface-interactive tool-card group overflow-hidden text-[12px]"
    :data-open="String(open)"
  >
    <button
      type="button"
      class="agent-focusable agent-pressable flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="flex min-w-0 items-center gap-2">
        <i aria-hidden="true" :class="icon || 'ri-tools-line'" class="shrink-0 text-base leading-none text-[#777]" />
        <span class="min-w-0 truncate text-[12px] font-medium text-[#333]">{{ title }}</span>
      </span>
      <span class="flex shrink-0 items-center gap-2">
        <span class="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#f5f5f5] px-2 text-[10px] leading-4" :class="statusClass">
          <i aria-hidden="true" :class="statusIcon" class="text-sm leading-none" />
          {{ status }}
        </span>
        <i aria-hidden="true" class="tool-card-chevron ri-arrow-down-s-line text-base leading-none text-[#777]" />
      </span>
    </button>

    <div class="tool-card-panel">
      <div class="tool-card-panel-inner min-h-0 overflow-hidden">
        <div class="space-y-4 border-t border-[#e5e5e5] px-3 pb-3 pt-3">
          <div v-if="inputSummary" class="space-y-1.5">
            <p class="text-[10px] font-medium uppercase tracking-[0.04em] text-[#666]">Objectif</p>
            <p v-if="inputSummary" class="text-pretty leading-5 text-[#666]">{{ inputSummary }}</p>
          </div>

          <div v-if="sql" class="space-y-2">
            <p class="text-[10px] font-medium uppercase tracking-[0.04em] text-[#666]">Requête</p>
            <ExplorationCodeBlock v-if="sql" :code="sql" />
          </div>

          <div v-if="outputSummary || error" class="space-y-2">
            <p class="text-[10px] font-medium uppercase tracking-[0.04em] text-[#666]">
              {{ error ? "Erreur" : "Résultat" }}
            </p>
            <div
              class="rounded-sm px-3 py-2 tabular-nums leading-5"
              :class="error ? 'bg-[#fef4f4] text-[#ce0500]' : 'bg-[#f6f6f6] text-[#3a3a3a]'"
            >
              {{ error || outputSummary }}
            </div>
          </div>

          <dl v-if="details?.length" class="divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
            <div
              v-for="detail in details"
              :key="detail.label"
              class="grid grid-cols-[minmax(5.5rem,0.7fr)_minmax(0,1.3fr)] gap-3 py-2 leading-5"
            >
              <dt class="text-[#777]">{{ detail.label }}</dt>
              <dd class="min-w-0 break-words text-[#333] tabular-nums">{{ detail.value }}</dd>
            </div>
          </dl>

          <div v-if="fields?.length" class="space-y-2">
            <p class="text-[10px] font-medium uppercase tracking-[0.04em] text-[#666]">
              {{ title === "Inspection du schéma" ? "Schéma" : "Colonnes utilisées" }}
            </p>
            <ul class="flex max-h-32 flex-wrap gap-1.5 overflow-auto" aria-label="Colonnes utilisées">
              <li
                v-for="field in fields"
                :key="field.name"
                class="inline-flex min-w-0 items-center gap-1 rounded-sm bg-[#f6f6f6] px-2 py-1 font-mono text-[10px] leading-4 text-[#3a3a3a]"
              >
                <span class="max-w-full truncate">{{ field.name }}</span>
                <span v-if="field.type" class="shrink-0 text-[#777]">{{ field.type }}</span>
              </li>
            </ul>
          </div>

          <p v-if="!sql && !inputSummary && !outputSummary && !error && !details?.length && !fields?.length" class="leading-5 text-[#666]">
            {{ state === "output-available" ? "Opération terminée." : "L’opération est en cours d’exécution." }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tool-card-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 150ms cubic-bezier(0.4, 0, 1, 1);
}

.tool-card-panel-inner {
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 150ms cubic-bezier(0.4, 0, 1, 1),
    transform 150ms cubic-bezier(0.4, 0, 1, 1);
}

.tool-card-chevron {
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}

.tool-card[data-open="true"] .tool-card-panel {
  grid-template-rows: 1fr;
  transition: grid-template-rows 250ms cubic-bezier(0.2, 0, 0, 1);
}

.tool-card[data-open="true"] .tool-card-panel-inner {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 250ms cubic-bezier(0.2, 0, 0, 1),
    transform 250ms cubic-bezier(0.2, 0, 0, 1);
}

.tool-card[data-open="true"] .tool-card-chevron {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .tool-card-panel,
  .tool-card-panel-inner,
  .tool-card-chevron {
    transition: none !important;
  }
}
</style>
