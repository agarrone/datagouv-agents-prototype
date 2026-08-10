<script setup lang="ts">
import ExplorationAgentChart from "./AgentChart.client.vue";
import ExplorationAgentMap from "./AgentMap.client.vue";
import type { AgentProgressStep } from "./AgentProgress.vue";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const props = defineProps<{
  message: ExplorationMessage;
  responding?: boolean;
  canEdit?: boolean;
  source?: string;
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
  clarify: [toolCallId: string, choice: string];
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
const chartTypeLabel = (type: string | undefined) => ({
  bar: "un graphique à barres",
  line: "un graphique en courbes",
  area: "un graphique en aires",
  pie: "un graphique en secteurs",
  scatter: "un nuage de points",
}[type ?? ""] ?? "un graphique");
const progressSteps = computed<AgentProgressStep[]>(() => {
  const steps = displayedToolParts.value.map((part) => {
    const recoveredError = part.state === "output-error" && props.responding;
    return {
      label: recoveredError
        ? part.type === "tool-execute_sql"
          ? "Ajustement de la requête SQL"
          : `Ajustement : ${toolLabel(part.type).toLocaleLowerCase("fr-FR")}`
        : toolLabel(part.type),
      status: part.state === "output-available" || recoveredError
        ? "complete" as const
        : part.state === "output-error"
          ? "error" as const
          : part.state === "input-streaming" || part.state === "input-available"
            ? "active" as const
            : "pending" as const,
    };
  });

  if (props.responding && !toolsActive.value) {
    steps.push({
      label: assistantText.value ? "Finalisation de la réponse" : "Poursuite de l’analyse",
      status: "active",
    });
  }

  return steps;
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
  code?: string;
  codeLanguage?: "SQL" | "JSON";
  error?: boolean;
  details?: ToolDetail[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "Non renseigné") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function clarificationChoices(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((choice): choice is string => typeof choice === "string" && Boolean(choice.trim()))
    : [];
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
    code: part.type === "tool-execute_sql" || part.type === "tool-propose_explorer_view"
      ? "input" in part ? part.input?.sql : undefined
      : part.type === "tool-create_chart" || part.type === "tool-create_map"
        ? "input" in part && part.input ? JSON.stringify(part.input, null, 2) : undefined
        : undefined,
    codeLanguage: part.type === "tool-create_chart" || part.type === "tool-create_map"
      ? "JSON" as const
      : "SQL" as const,
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

const observableReasoning = computed(() => {
  const sentences: string[] = [];
  const schema = displayedToolParts.value.find(part =>
    part.type === "tool-inspect_schema" && part.state === "output-available",
  );
  const metadata = displayedToolParts.value.find(part =>
    part.type === "tool-get_dataset_metadata" && part.state === "output-available",
  );
  const sqlQueries = displayedToolParts.value.filter(part =>
    part.type === "tool-execute_sql" && part.state === "output-available",
  );
  const lastSql = sqlQueries.at(-1);
  const chart = displayedToolParts.value.find(part =>
    part.type === "tool-create_chart" && part.state === "output-available",
  );
  const map = displayedToolParts.value.find(part =>
    part.type === "tool-create_map" && part.state === "output-available",
  );
  const proposal = displayedToolParts.value.find(part =>
    part.type === "tool-propose_explorer_view",
  );

  if (schema?.type === "tool-inspect_schema") {
    sentences.push(`Le schéma a été vérifié : ${schema.output.columns.length} colonnes pour ${schema.output.rowCount.toLocaleString("fr-FR")} lignes.`);
  }
  if (metadata) {
    sentences.push("Les métadonnées publiques du jeu de données ont été consultées.");
  }
  if (lastSql?.type === "tool-execute_sql") {
    const purpose = lastSql.input?.purpose?.trim();
    const queryCount = sqlQueries.length;
    sentences.push(`${queryCount > 1 ? `${queryCount} requêtes ont été exécutées` : "Une requête a été exécutée"}${purpose ? ` pour ${purpose.charAt(0).toLocaleLowerCase("fr-FR")}${purpose.slice(1)}` : " sur les données"}. Le résultat contient ${lastSql.output.rowCount.toLocaleString("fr-FR")} ligne${lastSql.output.rowCount > 1 ? "s" : ""}.`);
  }
  if (chart?.type === "tool-create_chart") {
    sentences.push(`Ces résultats ont été transformés en ${chartTypeLabel(chart.input?.type)}.`);
  }
  if (map?.type === "tool-create_map") {
    sentences.push(`Ces résultats ont été cartographiés sous forme de ${map.input?.type === "choropleth" ? "carte par territoires" : "carte de points"}.`);
  }
  if (proposal) {
    sentences.push("Une vue distincte a été préparée pour l’explorateur et reste soumise à votre confirmation.");
  }
  return sentences.join(" ");
});

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
      <p class="max-w-full whitespace-pre-wrap rounded-md bg-[#f6f6f6] px-3 py-2 leading-5 text-[#161616]">
        {{ userText }}
      </p>
      <div class="user-prompt-actions flex h-6 items-center justify-end gap-0.5" aria-label="Actions sur la question">
        <time
          v-if="messageTime"
          :datetime="message.metadata?.createdAt"
          class="mr-1 text-[11px] tabular-nums text-[#777777]"
        >{{ messageTime }}</time>
        <button
          :aria-label="copiedUserMessage ? 'Question copiée' : 'Copier la question'"
          class="agent-focusable agent-pressable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-[#e5e5e5] hover:text-[#161616]"
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
          class="agent-focusable agent-pressable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-[#e5e5e5] hover:text-[#161616]"
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
      <Transition name="agent-analysis-state">
      <ExplorationAgentProgress
        v-if="responding && displayedToolParts.length"
        key="progress"
        :steps="progressSteps"
      />
      <div v-else-if="displayedToolParts.length" key="summary" class="mb-2">
        <ExplorationAgentDisclosure
          icon="ri-brain-line"
          :title="`Analyse terminée · ${toolTraceEntries.length} ${toolTraceEntries.length > 1 ? 'étapes' : 'étape'}`"
        >
          <p v-if="observableReasoning" class="pb-2 text-[11px] leading-5 text-[#555555]">
            {{ observableReasoning }}
          </p>
          <ol class="space-y-1.5 border-t border-[#e5e5e5] pb-1 pt-2">
            <ExplorationAgentToolTrace
              v-for="entry in toolTraceEntries"
              :key="entry.id"
              :description="entry.description"
              :details="entry.details"
              :error="entry.error"
              :code="entry.code"
              :code-language="entry.codeLanguage"
              :label="entry.label"
              :summary="entry.summary"
            />
          </ol>
        </ExplorationAgentDisclosure>
      </div>
      </Transition>
    </template>

    <template v-if="message.role !== 'user'">
      <ExplorationMessageResponse
        v-for="(part, partIndex) in message.parts.filter(item => item.type === 'text')"
        :key="`${message.id}-text-${partIndex}`"
        :content="part.text"
        :streaming="responding"
      />

      <template
        v-for="part in message.parts.filter(item => item.type === 'tool-request_clarification')"
        :key="part.toolCallId"
      >
        <ExplorationAgentClarification
          v-if="'input' in part && part.input?.question && part.input.choices?.length"
          :choices="clarificationChoices(part.input.choices)"
          :disabled="responding && part.state !== 'input-available'"
          :question="part.input.question"
          :selected="part.state === 'output-available' ? part.output.choice : undefined"
          @select="emit('clarify', part.toolCallId, $event)"
        />
      </template>

      <template
        v-for="part in message.parts.filter(item => item.type === 'tool-propose_explorer_view')"
        :key="part.toolCallId"
      >
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

      <div
        v-for="part in message.parts.filter(item => item.type === 'tool-create_chart')"
        :key="part.toolCallId"
        class="mt-3"
      >
        <ExplorationVisualizationStage
          v-if="part.state !== 'output-error'"
          kind="graphique"
          :ready="part.state === 'output-available'"
        >
          <ExplorationAgentChart
            v-if="part.state === 'output-available' && 'input' in part && part.input"
            class="h-full"
            :play-completion-sound="false"
            :spec="part.input"
            :rows="part.output.rows"
            :source="source"
            :truncated="part.output.truncated"
          />
        </ExplorationVisualizationStage>
        <ExplorationStatusMessage
          v-else
          :message="part.errorText"
          title="Le graphique n’a pas pu être créé"
          tone="error"
        />
      </div>

      <div
        v-for="part in message.parts.filter(item => item.type === 'tool-create_map')"
        :key="part.toolCallId"
        class="mt-3"
      >
        <ExplorationVisualizationStage
          v-if="part.state !== 'output-error'"
          kind="carte"
          :ready="part.state === 'output-available'"
        >
          <ExplorationAgentMap
            v-if="part.state === 'output-available' && 'input' in part && part.input"
            class="h-full"
            :play-completion-sound="false"
            :spec="part.input"
            :rows="part.output.rows"
            :source="source"
            :truncated="part.output.truncated"
          />
        </ExplorationVisualizationStage>
        <ExplorationStatusMessage
          v-else
          :message="part.errorText"
          title="La carte n’a pas pu être créée"
          tone="error"
        />
      </div>
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
