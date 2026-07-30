<script setup lang="ts">
import ExplorationAgentChart from "./AgentChart.client.vue";
import ExplorationAgentMap from "./AgentMap.client.vue";
import type { AgentProgressStep } from "./AgentProgress.vue";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const props = defineProps<{
  message: ExplorationMessage;
  responding?: boolean;
  canEdit?: boolean;
  feedbackContext?: {
    question: string;
    resource: string;
    dataset: string;
    resourceName: string;
    model: string;
  };
}>();

const emit = defineEmits<{
  applyProposal: [toolCallId: string, sql: string, title: string];
  edit: [messageId: string, content: string];
}>();

const copiedUserMessage = ref(false);
let copiedUserMessageTimer: ReturnType<typeof setTimeout> | undefined;

const userText = computed(() => props.message.parts
  .filter(part => part.type === "text")
  .map(part => part.text)
  .join("\n")
  .trim());
const messageTime = computed(() => {
  if (!props.message.metadata?.createdAt) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(props.message.metadata.createdAt));
});

async function copyUserMessage() {
  await navigator.clipboard.writeText(userText.value);
  copiedUserMessage.value = true;
  if (copiedUserMessageTimer) clearTimeout(copiedUserMessageTimer);
  copiedUserMessageTimer = setTimeout(() => {
    copiedUserMessage.value = false;
  }, 1600);
}

onBeforeUnmount(() => {
  if (copiedUserMessageTimer) clearTimeout(copiedUserMessageTimer);
});

const toolParts = computed(() => props.message.parts.filter(part =>
  part.type === "tool-inspect_schema"
  || part.type === "tool-get_dataset_metadata"
  || part.type === "tool-execute_sql"
  || part.type === "tool-propose_explorer_view"
  || part.type === "tool-create_chart"
  || part.type === "tool-create_map",
));
const displayedToolParts = computed(() => toolParts.value.filter((part, index, parts) => {
  if (part.type !== "tool-execute_sql" || part.state !== "output-error") return true;

  return !parts.slice(index + 1).some(nextPart =>
    nextPart.type === "tool-execute_sql"
    && nextPart.state === "output-available",
  );
}));
const toolsActive = computed(() => toolParts.value.some(part =>
  "state" in part
  && part.state !== "output-available"
  && part.state !== "output-error",
));
const toolLabel = (type: string) => ({
  "tool-inspect_schema": "Inspection du schéma",
  "tool-get_dataset_metadata": "Lecture des métadonnées",
  "tool-execute_sql": "Exécution de la requête SQL",
  "tool-propose_explorer_view": "Préparation de la vue",
  "tool-create_chart": "Création du graphique",
  "tool-create_map": "Création de la carte",
}[type] ?? "Opération");
const progressSteps = computed<AgentProgressStep[]>(() => toolParts.value.map(part => ({
  label: toolLabel(part.type),
  status: part.state === "output-available"
    ? "complete"
    : part.state === "output-error"
      ? "error"
      : part.state === "input-streaming" || part.state === "input-available"
        ? "active"
        : "pending",
})));
const observableReasoning = computed(() => {
  const labels: string[] = [];
  if (toolParts.value.some(part => part.type === "tool-inspect_schema")) {
    labels.push("la structure et les colonnes disponibles");
  }
  if (toolParts.value.some(part => part.type === "tool-get_dataset_metadata")) {
    labels.push("les métadonnées de la ressource");
  }
  if (toolParts.value.some(part => part.type === "tool-execute_sql")) {
    labels.push("les résultats d’une requête exécutée sur les données");
  }
  if (toolParts.value.some(part => part.type === "tool-create_chart")) {
    labels.push("la représentation graphique demandée");
  }
  if (toolParts.value.some(part => part.type === "tool-create_map")) {
    labels.push("les informations géographiques nécessaires à la carte");
  }
  if (toolParts.value.some(part => part.type === "tool-propose_explorer_view")) {
    labels.push("une vue applicable à l’explorateur");
  }
  if (!labels.length) return "";
  const last = labels.pop();
  const inspected = labels.length ? `${labels.join(", ")} et ${last}` : last;
  return `Pour construire cette réponse, l’assistant a vérifié ${inspected}. Ce résumé décrit uniquement les opérations observables.`;
});
const assistantText = computed(() => props.message.parts
  .filter(part => part.type === "text")
  .map(part => part.text)
  .join("\n\n")
  .trim());

type ToolDetail = { label: string; value: string };
type ToolTraceEntry = {
  id: string;
  label: string;
  description?: string;
  summary: string;
  sql?: string;
  error?: boolean;
  details?: ToolDetail[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "Non renseigné") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function chartToolDetails(input: unknown): ToolDetail[] | undefined {
  if (!isRecord(input)) return undefined;
  const series = Array.isArray(input.series)
    ? input.series
        .filter(isRecord)
        .map(item => `${stringValue(item.label)} · ${stringValue(item.field)}`)
        .join(", ")
    : "Non renseignées";
  return [
    { label: "Type", value: stringValue(input.type) },
    { label: "Axe", value: `${stringValue(input.xLabel)} · ${stringValue(input.xField)}` },
    { label: "Séries", value: series },
  ];
}

function mapToolDetails(input: unknown): ToolDetail[] | undefined {
  if (!isRecord(input)) return undefined;
  const details: ToolDetail[] = [
    { label: "Type", value: stringValue(input.type) },
    { label: "Libellé", value: stringValue(input.labelField) },
  ];
  if ("latitudeField" in input || "longitudeField" in input) {
    details.push({
      label: "Coordonnées",
      value: `${stringValue(input.latitudeField)} · ${stringValue(input.longitudeField)}`,
    });
  } else if ("geojsonField" in input) {
    details.push({ label: "Géométrie", value: stringValue(input.geojsonField) });
  } else if ("boundary" in input) {
    details.push({
      label: "Territoires",
      value: input.boundary === "france-regions" ? "Régions de France" : "Départements de France",
    });
  }
  return details;
}

const toolTraceEntries = computed<ToolTraceEntry[]>(() => displayedToolParts.value.map((part, index) => {
  const base = {
    id: `${part.type}-${"toolCallId" in part ? part.toolCallId : index}`,
    label: toolLabel(part.type),
  };
  if (part.state === "output-error") {
    return { ...base, summary: part.errorText, error: true };
  }
  if (part.type === "tool-inspect_schema") {
    return {
      ...base,
      description: "Lecture de la structure de la table chargée.",
      summary: part.state === "output-available"
        ? `${part.output.rowCount.toLocaleString("fr-FR")} lignes · ${part.output.columns.length} colonnes`
        : "Inspection en cours",
    };
  }
  if (part.type === "tool-get_dataset_metadata") {
    return {
      ...base,
      description: "Lecture des informations publiques du jeu de données.",
      summary: part.state === "output-available" ? "Métadonnées récupérées" : "Lecture en cours",
      details: part.state === "output-available"
        ? [
            { label: "Producteur", value: part.output.organization || "Non renseigné" },
            { label: "Licence", value: part.output.license || "Non renseignée" },
            { label: "Ressources", value: part.output.resources.length.toLocaleString("fr-FR") },
          ]
        : undefined,
    };
  }
  if (part.type === "tool-execute_sql") {
    return {
      ...base,
      description: "input" in part ? part.input?.purpose : undefined,
      sql: "input" in part ? part.input?.sql : undefined,
      summary: part.state === "output-available"
        ? `${part.output.rowCount.toLocaleString("fr-FR")} ligne${part.output.rowCount > 1 ? "s" : ""} · ${part.output.elapsedMs} ms${part.output.truncated ? " · résultat limité" : ""}`
        : "Exécution en cours",
      details: part.state === "output-available"
        ? [{ label: "Colonnes", value: part.output.columns.join(", ") }]
        : undefined,
    };
  }
  if (part.type === "tool-propose_explorer_view") {
    return {
      ...base,
      description: "input" in part ? part.input?.reason : undefined,
      sql: "input" in part ? part.input?.sql : undefined,
      summary: part.state === "output-available"
        ? `Vue prête · ${part.output.rowCount.toLocaleString("fr-FR")} lignes`
        : "Préparation en cours",
    };
  }
  if (part.type === "tool-create_chart") {
    return {
      ...base,
      description: "input" in part ? part.input?.description : undefined,
      summary: part.state === "output-available"
        ? `${part.output.rows.length.toLocaleString("fr-FR")} lignes représentées`
        : "Création en cours",
      details: chartToolDetails("input" in part ? part.input : undefined),
    };
  }
  return {
    ...base,
    description: "input" in part ? part.input?.description : undefined,
    summary: part.state === "output-available"
      ? `${part.output.rows.length.toLocaleString("fr-FR")} lignes cartographiées`
      : "Création en cours",
    details: mapToolDetails("input" in part ? part.input : undefined),
  };
}));

</script>

<template>
  <article
    :class="message.role === 'user'
      ? 'ml-auto flex max-w-[88%] flex-col items-end'
      : 'w-full'"
    class="agent-message-enter text-[13px]"
    :data-message-role="message.role"
  >
    <template v-if="message.role === 'user'">
      <p class="max-w-full whitespace-pre-wrap rounded bg-[#eee] px-3 py-2 leading-5 text-[#161616]">
        {{ userText }}
      </p>
      <div class="user-prompt-actions flex h-8 items-center justify-end gap-0.5" aria-label="Actions sur la question">
        <time
          v-if="messageTime"
          :datetime="message.metadata?.createdAt"
          class="mr-1 text-[10px] tabular-nums text-[#777]"
        >{{ messageTime }}</time>
        <button
          :aria-label="copiedUserMessage ? 'Question copiée' : 'Copier la question'"
          class="agent-focusable agent-pressable flex h-8 w-8 items-center justify-center rounded text-[#666] hover:bg-[#ddd] hover:text-[#161616]"
          :title="copiedUserMessage ? 'Copié' : 'Copier'"
          type="button"
          @click="copyUserMessage"
        >
          <i
            aria-hidden="true"
            :class="copiedUserMessage ? 'ri-check-line' : 'ri-file-copy-line'"
            class="text-sm leading-none"
          />
        </button>
        <button
          v-if="canEdit"
          aria-label="Modifier la dernière question"
          class="agent-focusable agent-pressable flex h-8 w-8 items-center justify-center rounded text-[#666] hover:bg-[#ddd] hover:text-[#161616]"
          title="Modifier"
          type="button"
          @click="emit('edit', message.id, userText)"
        >
          <i aria-hidden="true" class="ri-edit-line text-sm leading-none" />
        </button>
        <span class="sr-only" aria-live="polite">{{ copiedUserMessage ? "Question copiée" : "" }}</span>
      </div>
    </template>

    <template v-else>
      <Transition name="agent-analysis-state" mode="out-in">
      <ExplorationAgentProgress
        v-if="toolsActive"
        key="progress"
        :steps="progressSteps"
      />
      <div v-else-if="displayedToolParts.length" key="summary" class="mb-2">
        <ExplorationReasoning
          v-if="observableReasoning"
          :content="observableReasoning"
        />
        <ExplorationAgentDisclosure
          class="mt-1"
          icon="ri-tools-line"
          :title="`${toolTraceEntries.length} ${toolTraceEntries.length > 1 ? 'outils utilisés' : 'outil utilisé'}`"
        >
          <ol class="space-y-2 pb-1 pl-[22px] pt-1 text-[11px] leading-5 text-[#666]">
            <li
              v-for="(entry, index) in toolTraceEntries"
              :key="entry.id"
              class="grid grid-cols-[14px_minmax(0,1fr)] gap-1"
            >
              <span class="tabular-nums text-[#555]">{{ index + 1 }}.</span>
              <div class="min-w-0">
                <p>
                  <strong class="font-semibold text-[#333]">{{ entry.label }}</strong>
                  <span v-if="entry.description"> : {{ entry.description }}</span>
                </p>
                <p class="text-[#666]" :class="entry.error ? 'text-[#ce0500]' : ''">{{ entry.summary }}</p>
                <dl v-if="entry.details?.length" class="mt-1 space-y-0.5">
                  <div v-for="detail in entry.details" :key="detail.label" class="flex gap-1">
                    <dt class="shrink-0 text-[#777]">{{ detail.label }} :</dt>
                    <dd class="min-w-0 break-words text-[#555]">{{ detail.value }}</dd>
                  </div>
                </dl>
                <ExplorationCodeBlock v-if="entry.sql" class="mt-1" :code="entry.sql" collapsible />
              </div>
            </li>
          </ol>
        </ExplorationAgentDisclosure>
      </div>
      </Transition>
    </template>

    <template v-if="message.role !== 'user'">
      <template
        v-for="(part, partIndex) in message.parts"
        :key="`${message.id}-${partIndex}`"
      >
      <ExplorationMessageResponse
        v-if="part.type === 'text'"
        :content="part.text"
        :streaming="responding"
      />

      <template v-else-if="part.type === 'tool-propose_explorer_view'">
        <ExplorationExplorerProposal
          v-if="'input' in part && part.input && part.input.title && part.input.reason && part.input.sql"
          :title="part.input.title"
          :reason="part.input.reason"
          :sql="part.input.sql"
          :state="part.state"
          :error="part.state === 'output-error' ? part.errorText : undefined"
          @apply="emit(
            'applyProposal',
            part.toolCallId,
            part.input.sql!,
            part.input.title!,
          )"
        />
      </template>

      <div v-else-if="part.type === 'tool-create_chart'" class="mt-3">
        <ExplorationVisualizationLoading
          v-if="part.state === 'input-streaming' || part.state === 'input-available'"
          kind="graphique"
        />
        <ExplorationAgentChart
          v-else-if="part.state === 'output-available' && 'input' in part && part.input"
          :spec="part.input"
          :rows="part.output.rows"
          :truncated="part.output.truncated"
        />
        <ExplorationStatusMessage
          v-else-if="part.state === 'output-error'"
          :message="part.errorText"
          title="Le graphique n’a pas pu être créé"
          tone="error"
        />
      </div>

      <div v-else-if="part.type === 'tool-create_map'" class="mt-3">
        <ExplorationVisualizationLoading
          v-if="part.state === 'input-streaming' || part.state === 'input-available'"
          kind="carte"
        />
        <ExplorationAgentMap
          v-else-if="part.state === 'output-available' && 'input' in part && part.input"
          :spec="part.input"
          :rows="part.output.rows"
          :truncated="part.output.truncated"
        />
        <ExplorationStatusMessage
          v-else-if="part.state === 'output-error'"
          :message="part.errorText"
          title="La carte n’a pas pu être créée"
          tone="error"
        />
      </div>
      </template>
      <ExplorationMessageActions
        v-if="assistantText && !toolsActive && !responding"
        :content="assistantText"
        :feedback-context="feedbackContext"
      />
    </template>
  </article>
</template>

<style scoped>
@keyframes message-enter {
  from {
    opacity: 0;
    transform: translateY(var(--distance-base));
    filter: blur(var(--blur-small));
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.agent-message-enter {
  animation: message-enter var(--duration-fast) var(--ease-smooth-out) both;
  will-change: opacity, transform, filter;
}

.agent-analysis-state-enter-active {
  transition:
    opacity var(--duration-quick) var(--ease-in-out),
    transform var(--duration-quick) var(--ease-in-out),
    filter var(--duration-quick) var(--ease-in-out);
}

.agent-analysis-state-leave-active {
  transition:
    opacity var(--duration-quick) var(--ease-in-out),
    transform var(--duration-quick) var(--ease-in-out);
}

.agent-analysis-state-enter-from {
  opacity: 0;
  transform: translateY(var(--distance-base));
  filter: blur(var(--blur-small));
}

.agent-analysis-state-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--distance-base) * -0.5));
}

.user-prompt-actions {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

article:hover .user-prompt-actions,
article:focus-within .user-prompt-actions {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .user-prompt-actions {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-message-enter { animation: none; }
  .agent-analysis-state-enter-active,
  .agent-analysis-state-leave-active {
    transition: none;
  }
}
</style>
