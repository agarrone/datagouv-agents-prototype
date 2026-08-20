<script setup lang="ts">
import ExplorationAgentChart from "./AgentChart.client.vue";
import ExplorationAgentMap from "./AgentMap.client.vue";
import type { AgentProgressStep } from "./AgentProgress.vue";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import type { FeedbackContext } from "~~/shared/types/feedback";
import {
  classifyExplorationError,
  finishReasonError,
  type ExplorationRecoveryAction,
} from "~~/shared/errors/exploration";

const props = defineProps<{
  message: ExplorationMessage;
  responding?: boolean;
  canEdit?: boolean;
  question?: string;
  source?: string;
  feedbackContext?: FeedbackContext;
  showFeedbackPrompt?: boolean;
}>();

const emit = defineEmits<{
  applyProposal: [toolCallId: string, sql: string, title: string];
  declineProposal: [toolCallId: string, title: string];
  clarify: [toolCallId: string, choice: string];
  edit: [messageId: string, content: string];
  dismissFeedbackPrompt: [];
  recover: [action: ExplorationRecoveryAction, messageId: string];
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
const finishErrorPresentation = computed(() => {
  if (props.message.metadata?.prototypeStepLimitReached) {
    return classifyExplorationError({
      code: "prototype_step_limit",
      source: "prototype",
      technicalDetails: "stopWhen=isStepCount(5) · finishReason=tool-calls",
      retryable: false,
    });
  }
  const error = finishReasonError(props.message.metadata?.finishReason);
  return error ? classifyExplorationError(error) : undefined;
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
  if (part.state !== "output-error") return true;

  return !parts.slice(index + 1).some(nextPart =>
    nextPart.type === part.type
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
const activeToolLabel = (type: string) => ({
  "tool-inspect_schema": "Je vérifie les colonnes et les types disponibles",
  "tool-get_dataset_metadata": "Je consulte la fiche du jeu de données",
  "tool-execute_sql": "Je calcule la réponse à partir des données",
  "tool-propose_explorer_view": "Je prépare la vue à afficher dans le tableau",
  "tool-create_chart": "Je prépare le graphique à partir des résultats",
  "tool-create_map": "Je prépare la carte à partir des résultats",
}[type] ?? "Je poursuis l’analyse");
const completedReasoningLabel = (type: string) => ({
  "tool-inspect_schema": "Structure des données vérifiée",
  "tool-get_dataset_metadata": "Contexte du jeu de données vérifié",
  "tool-execute_sql": "Calcul effectué sur les données",
  "tool-propose_explorer_view": "Vue du tableau préparée",
  "tool-create_chart": "Graphique préparé",
  "tool-create_map": "Carte préparée",
}[type] ?? "Étape terminée");
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
          ? "Le premier calcul doit être corrigé avant de poursuivre"
          : "Une étape doit être ajustée avant de poursuivre"
        : part.state === "output-available"
          ? completedReasoningLabel(part.type)
          : activeToolLabel(part.type),
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
      label: assistantText.value ? "Je rédige la réponse" : "J’interprète les résultats obtenus",
      status: "active",
    });
  }

  return steps;
});
const progressTitle = computed(() => toolsActive.value
  ? "Analyse en cours"
  : assistantText.value
    ? "Réponse en cours"
    : "Analyse des résultats");
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

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function frenchReasoningDetail(value: unknown, question: string) {
  if (typeof value !== "string") return undefined;
  const detail = value.trim().replace(/[.!?]+$/, "");
  if (!detail) return undefined;
  const normalizedDetail = normalizedText(detail);
  if (!normalizedDetail || normalizedDetail === normalizedText(question)) return undefined;
  const englishMarkers = normalizedDetail.match(/\b(the|this|that|with|from|into|using|count|find|show|display|filter|group|order|dataset|rows?)\b/g)?.length ?? 0;
  return englishMarkers >= 2 ? undefined : detail;
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
  const effectiveInput = part.type === "tool-create_map" && part.state === "output-available"
    ? part.output.resolvedSpec
    : "input" in part ? part.input : undefined;
  const base = {
    id: `${part.type}-${"toolCallId" in part ? part.toolCallId : index}`,
    label: toolLabel(part.type),
    code: part.type === "tool-execute_sql" || part.type === "tool-propose_explorer_view"
      ? "input" in part ? part.input?.sql : undefined
      : part.type === "tool-create_chart" || part.type === "tool-create_map"
        ? effectiveInput ? JSON.stringify(effectiveInput, null, 2) : undefined
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
      ? `${part.output.rows.length.toLocaleString("fr-FR")} lignes préparées${part.output.fieldCorrections.length > 0 ? ` · ${part.output.fieldCorrections.length} champ${part.output.fieldCorrections.length > 1 ? "s" : ""} ajusté${part.output.fieldCorrections.length > 1 ? "s" : ""}` : ""}`
      : "Création en cours",
    details: [
      ...(mapToolDetails(effectiveInput) ?? []),
      ...(part.state === "output-available" && part.output.fieldCorrections.length > 0
        ? [{
            label: "Ajustements",
            value: part.output.fieldCorrections
              .map(item => `${item.from} → ${item.to}`)
              .join(", "),
          }]
        : []),
      ...(part.state === "output-available"
        ? part.output.warnings.map(warning => ({ label: "Attention", value: warning }))
        : []),
    ],
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

  const question = props.question?.trim();
  if (question) {
    const normalizedQuestion = normalizedText(question);
    const preciseIntent = frenchReasoningDetail(
      proposal && "input" in proposal ? proposal.input?.reason
        : map?.type === "tool-create_map" ? map.input?.description
          : chart?.type === "tool-create_chart" ? chart.input?.description
            : lastSql?.type === "tool-execute_sql" ? lastSql.input?.purpose
              : undefined,
      question,
    );
    const understoodAction = proposal
      ? "modifier la vue du tableau"
      : map || /\b(carte|cartograph|geograph|localis)/.test(normalizedQuestion)
        ? "analyser les données et les représenter sur une carte"
        : chart || /\b(graph|diagramme|courbe|histogramme)/.test(normalizedQuestion)
          ? "analyser les données et les représenter dans un graphique"
          : /\b(filtr|tri(?:e|er|ez)|garde uniquement|tableau|explorateur)/.test(normalizedQuestion)
            ? "modifier la vue du tableau"
          : sqlQueries.length
            ? "analyser les valeurs de la ressource"
            : metadata || /\b(producteur|licence|description|mise a jour|metadonnee|organisation)/.test(normalizedQuestion)
              ? "retrouver les informations publiques du jeu de données"
              : schema || /\b(colonne|champ|schema|structure|type)s?\b/.test(normalizedQuestion)
                ? "examiner la structure de la ressource"
                : "répondre à votre question à partir de la ressource";
    sentences.push(preciseIntent
      ? `J’ai compris votre demande ainsi : ${preciseIntent}.`
      : `J’ai compris que vous souhaitiez ${understoodAction}.`);
  }

  if (schema?.type === "tool-inspect_schema") {
    sentences.push(`J’ai d’abord vérifié la structure de la ressource : ${schema.output.columns.length} colonnes et ${schema.output.rowCount.toLocaleString("fr-FR")} lignes.`);
  }
  if (metadata) {
    sentences.push("J’ai consulté la fiche du jeu de données pour replacer la réponse dans son contexte.");
  }
  if (lastSql?.type === "tool-execute_sql") {
    const queryCount = sqlQueries.length;
    const columns = lastSql.output.columns.slice(0, 4);
    const columnSummary = columns.length
      ? ` Les champs retenus sont ${columns.map(column => `« ${column} »`).join(", ")}${lastSql.output.columns.length > columns.length ? " et d’autres champs utiles" : ""}.`
      : "";
    sentences.push(`${queryCount > 1 ? `J’ai effectué ${queryCount} calculs pour vérifier ou corriger le résultat` : "J’ai interrogé les données nécessaires à la réponse"}. Le résultat retenu contient ${lastSql.output.rowCount.toLocaleString("fr-FR")} ligne${lastSql.output.rowCount > 1 ? "s" : ""}.${columnSummary}`);
  }
  if (chart?.type === "tool-create_chart") {
    sentences.push(`J’ai choisi ${chartTypeLabel(chart.input?.type)} pour rendre ces résultats plus faciles à comparer.`);
  }
  if (map?.type === "tool-create_map") {
    sentences.push(`J’ai représenté les résultats sous forme de ${map.input?.type === "choropleth" ? "carte par territoires" : "carte de points"} pour montrer leur répartition géographique.`);
  }
  if (proposal) {
    sentences.push("J’ai préparé une vue du tableau correspondant à la demande ; elle ne sera appliquée qu’après votre confirmation.");
  }
  return sentences;
});

function errorPresentation(
  error: string,
  context?: "sql" | "duckdb" | "visualization" | "provider",
) {
  return classifyExplorationError(error, context);
}

const terminalDataErrors = computed(() => displayedToolParts.value.filter(part =>
  part.state === "output-error"
  && part.type !== "tool-create_chart"
  && part.type !== "tool-create_map"
  && part.type !== "tool-propose_explorer_view",
));

function toolErrorContext(type: string) {
  if (type === "tool-execute_sql") return "sql" as const;
  if (type === "tool-inspect_schema") return "duckdb" as const;
  if (type === "tool-get_dataset_metadata") return undefined;
  return undefined;
}

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
        <div v-if="responding" class="mb-2">
          <ExplorationAgentProgress
            :steps="progressSteps"
            :title="progressTitle"
          />
          <ExplorationAgentDisclosure
            v-if="toolTraceEntries.length"
            class="mt-1"
            icon="ri-wrench-line"
            :title="`Outils en cours · ${toolTraceEntries.length}`"
          >
            <ol class="space-y-1.5 pb-1">
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
        <div v-else-if="observableReasoning.length || displayedToolParts.length" class="mb-2 space-y-0.5">
          <ExplorationAgentDisclosure
            v-if="observableReasoning.length"
            icon="ri-brain-line"
            title="Raisonnement"
          >
            <ol class="space-y-1.5 pb-1 text-[11px] leading-5 text-[#555555]">
              <li
                v-for="(sentence, index) in observableReasoning"
                :key="sentence"
                :class="observableReasoning.length > 1 ? 'grid grid-cols-[1rem_minmax(0,1fr)] gap-1.5' : ''"
              >
                <span v-if="observableReasoning.length > 1" class="tabular-nums text-[#929292]">{{ index + 1 }}.</span>
                <span>{{ sentence }}</span>
              </li>
            </ol>
          </ExplorationAgentDisclosure>
          <ExplorationAgentDisclosure
            v-if="toolTraceEntries.length"
            icon="ri-wrench-line"
            :title="`Outils utilisés · ${toolTraceEntries.length}`"
          >
            <ol class="space-y-1.5 pb-1">
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
    </template>

    <template v-if="message.role !== 'user'">
      <template
        v-for="part in message.parts.filter(item => item.type === 'tool-request_clarification' && item.state === 'output-available')"
        :key="`resolved-${part.toolCallId}`"
      >
        <ExplorationAgentClarification
          v-if="'input' in part && part.input?.question && part.input.choices?.length"
          :choices="clarificationChoices(part.input.choices)"
          disabled
          :question="part.input.question"
          :selected="part.output.choice"
          @select="emit('clarify', part.toolCallId, $event)"
        />
      </template>

      <ExplorationMessageResponse
        v-for="(part, partIndex) in message.parts.filter(item => item.type === 'text')"
        :key="`${message.id}-text-${partIndex}`"
        :content="part.text"
        :streaming="responding"
      />

      <template
        v-for="part in message.parts.filter(item => item.type === 'tool-request_clarification' && item.state !== 'output-available')"
        :key="part.toolCallId"
      >
        <ExplorationAgentClarification
          v-if="'input' in part && part.input?.question && part.input.choices?.length"
          :choices="clarificationChoices(part.input.choices)"
          :disabled="responding && part.state !== 'input-available'"
          :question="part.input.question"
          :selected="undefined"
          @select="emit('clarify', part.toolCallId, $event)"
        />
      </template>

      <template
        v-for="part in displayedToolParts.filter(item => item.type === 'tool-propose_explorer_view')"
        :key="part.toolCallId"
      >
        <ExplorationExplorerProposal
          v-if="'input' in part && part.input && part.input.title && part.input.reason && part.input.sql"
          :title="part.input.title"
          :reason="part.input.reason"
          :recovering="responding"
          :sql="part.input.sql"
          :state="part.state"
          :applied="part.state === 'output-available' ? part.output.applied : undefined"
          :result-row-count="part.state === 'output-available' ? part.output.rowCount : undefined"
          :error="part.state === 'output-error' ? part.errorText : undefined"
          @apply="emit(
            'applyProposal',
            part.toolCallId,
            part.input.sql!,
            part.input.title!,
          )"
          @decline="emit('declineProposal', part.toolCallId, part.input.title!)"
        />
      </template>

      <div
        v-for="part in displayedToolParts.filter(item => item.type === 'tool-create_chart')"
        v-show="part.state !== 'output-error' || !responding"
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
          :action-label="errorPresentation(part.errorText, 'visualization').actionLabel"
          :code="errorPresentation(part.errorText, 'visualization').code"
          :details="errorPresentation(part.errorText, 'visualization').technicalDetails"
          :message="errorPresentation(part.errorText, 'visualization').message"
          :request-id="errorPresentation(part.errorText, 'visualization').requestId"
          :retry-after-seconds="errorPresentation(part.errorText, 'visualization').retryAfterSeconds"
          :source-label="errorPresentation(part.errorText, 'visualization').sourceLabel"
          :title="errorPresentation(part.errorText, 'visualization').title"
          tone="error"
          @action="errorPresentation(part.errorText, 'visualization').action && emit('recover', errorPresentation(part.errorText, 'visualization').action!, message.id)"
        />
      </div>

      <div
        v-for="part in displayedToolParts.filter(item => item.type === 'tool-create_map')"
        v-show="part.state !== 'output-error' || !responding"
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
            :spec="part.output.resolvedSpec"
            :rows="part.output.rows"
            :source="source"
            :truncated="part.output.truncated"
          />
        </ExplorationVisualizationStage>
        <ExplorationStatusMessage
          v-else
          :action-label="errorPresentation(part.errorText, 'visualization').actionLabel"
          :code="errorPresentation(part.errorText, 'visualization').code"
          :details="errorPresentation(part.errorText, 'visualization').technicalDetails"
          :message="errorPresentation(part.errorText, 'visualization').message"
          :request-id="errorPresentation(part.errorText, 'visualization').requestId"
          :retry-after-seconds="errorPresentation(part.errorText, 'visualization').retryAfterSeconds"
          :source-label="errorPresentation(part.errorText, 'visualization').sourceLabel"
          :title="errorPresentation(part.errorText, 'visualization').title"
          tone="error"
          @action="errorPresentation(part.errorText, 'visualization').action && emit('recover', errorPresentation(part.errorText, 'visualization').action!, message.id)"
        />
      </div>
      <ExplorationStatusMessage
        v-for="part in terminalDataErrors"
        v-show="!responding"
        :key="`terminal-error-${part.toolCallId}`"
        class="mt-3"
        :action-label="errorPresentation(part.errorText, toolErrorContext(part.type)).actionLabel"
        :code="errorPresentation(part.errorText, toolErrorContext(part.type)).code"
        :details="errorPresentation(part.errorText, toolErrorContext(part.type)).technicalDetails"
        :message="errorPresentation(part.errorText, toolErrorContext(part.type)).message"
        :request-id="errorPresentation(part.errorText, toolErrorContext(part.type)).requestId"
        :retry-after-seconds="errorPresentation(part.errorText, toolErrorContext(part.type)).retryAfterSeconds"
        :source-label="errorPresentation(part.errorText, toolErrorContext(part.type)).sourceLabel"
        :title="errorPresentation(part.errorText, toolErrorContext(part.type)).title"
        tone="error"
        @action="errorPresentation(part.errorText, toolErrorContext(part.type)).action && emit('recover', errorPresentation(part.errorText, toolErrorContext(part.type)).action!, message.id)"
      />
      <ExplorationStatusMessage
        v-if="finishErrorPresentation && !responding"
        class="mt-3"
        :action-label="finishErrorPresentation.actionLabel"
        :code="finishErrorPresentation.code"
        :details="finishErrorPresentation.technicalDetails"
        :message="finishErrorPresentation.message"
        :source-label="finishErrorPresentation.sourceLabel"
        :title="finishErrorPresentation.title"
        tone="warning"
        @action="finishErrorPresentation.action && emit('recover', finishErrorPresentation.action, message.id)"
      />
      <ExplorationMessageActions
        v-if="assistantText && !toolsActive && !responding"
        :content="assistantText"
        :feedback-context="feedbackContext"
      />
      <ExplorationConversationFeedbackPrompt
        v-if="showFeedbackPrompt && feedbackContext && assistantText && !responding"
        :answer="assistantText"
        :context="feedbackContext"
        @dismiss="emit('dismissFeedbackPrompt')"
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
}
</style>
