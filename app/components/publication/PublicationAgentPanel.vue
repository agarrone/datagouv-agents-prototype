<script setup lang="ts">
import type {
  PublicationAgentTool,
  PublicationAssistantMessage,
  PublicationPromptSuggestion,
  PublicationRecommendation,
} from "~~/shared/types/publication";
import { classifyExplorationError } from "~~/shared/errors/exploration";
import { DEFAULT_AGENT_MODEL_ID, type AgentModelId } from "~~/shared/agents/models";

const props = defineProps<{
  stepLabel: string;
  context: string;
  recommendations: PublicationRecommendation[];
  suggestions: PublicationPromptSuggestion[];
  messages: PublicationAssistantMessage[];
  tool: PublicationAgentTool;
  resourceOrganization?: string;
  resourceTitle?: string;
  busy?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  applySuggestion: [tool: string, suggestion: Record<string, unknown>];
  ask: [question: string];
  selectSuggestion: [suggestion: PublicationPromptSuggestion];
  clarify: [toolCallId: string, choice: string];
  retry: [];
  stop: [];
}>();

const question = ref("");
const modelId = defineModel<AgentModelId>("modelId", { default: DEFAULT_AGENT_MODEL_ID });

function submitQuestion() {
  const value = question.value.trim();
  if (!value || props.busy) return;
  emit("ask", value);
  question.value = "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function messageText(message: PublicationAssistantMessage) {
  return message.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("\n\n")
    .trim();
}

function visibleMessage(message: PublicationAssistantMessage) {
  return !(message.role === "user" && messageText(message).startsWith("__AUTO__"));
}

function suggestionParts(message: PublicationAssistantMessage) {
  const parts = message.parts.filter(part =>
    part.type === "tool-suggest_identity"
    || part.type === "tool-suggest_descriptions"
    || part.type === "tool-suggest_keywords"
    || part.type === "tool-suggest_license"
    || part.type === "tool-suggest_temporal_metadata"
    || part.type === "tool-suggest_spatial_metadata"
    || part.type === "tool-consult_publication_guide",
  );
  return parts.filter((part, index) =>
    part.state === "output-available"
    || !parts.slice(index + 1).some(next => next.type === part.type && next.state === "output-available"),
  );
}

function toolTitle(type: string) {
  return ({
    "tool-suggest_identity": "Titre et acronyme proposés",
    "tool-suggest_descriptions": "Descriptions proposées",
    "tool-suggest_keywords": "Mots-clés proposés",
    "tool-suggest_license": "Licence proposée",
    "tool-suggest_temporal_metadata": "Informations temporelles proposées",
    "tool-suggest_spatial_metadata": "Informations spatiales proposées",
    "tool-consult_publication_guide": "Guide officiel consulté",
  } as Record<string, string>)[type] ?? "Suggestion";
}

function hasMetadataSuggestion(message: PublicationAssistantMessage) {
  return message.parts.some(part =>
    part.type === "tool-suggest_identity"
    || part.type === "tool-suggest_descriptions"
    || part.type === "tool-suggest_keywords"
    || part.type === "tool-suggest_license"
    || part.type === "tool-suggest_temporal_metadata"
    || part.type === "tool-suggest_spatial_metadata",
  );
}

function toolName(type: string) {
  return type.replace(/^tool-/, "");
}

function suggestionSummary(output: unknown) {
  if (!isRecord(output)) return "La proposition est prête à être examinée.";
  if (typeof output.description === "string") return output.description;
  if (Array.isArray(output.tags)) return output.tags.filter(item => typeof item === "string").join(" · ");
  const values = [output.license, output.frequency, output.spatialCoverage, output.spatialGranularity]
    .filter(value => typeof value === "string" && value)
    .join(" · ");
  return values || "La proposition est prête à être examinée.";
}

type SuggestionGroup = {
  title: string;
  items: Array<{ key: string; label: string; value: string }>;
};

function textItem(output: Record<string, unknown>, key: string, label: string) {
  const value = output[key];
  return typeof value === "string" && value.trim() ? { key, label, value } : null;
}

function suggestionGroups(type: string, output: unknown): SuggestionGroup[] {
  if (!isRecord(output)) return [];
  if (type === "tool-suggest_identity") {
    return [{
      title: "Identification",
      items: [
        textItem(output, "title", "Titre"),
        { key: "acronym", label: "Acronyme", value: typeof output.acronym === "string" && output.acronym.trim() ? output.acronym : "Aucun acronyme proposé" },
      ].filter(Boolean) as SuggestionGroup["items"],
    }];
  }
  if (type === "tool-suggest_descriptions") {
    return [{
      title: "Descriptions",
      items: [textItem(output, "description", "Description"), textItem(output, "shortDescription", "Description courte")].filter(Boolean) as SuggestionGroup["items"],
    }];
  }
  if (type === "tool-suggest_keywords") {
    const tags = Array.isArray(output.tags)
      ? output.tags.filter((tag): tag is string => typeof tag === "string").join(" · ")
      : "";
    return tags ? [{ title: "Mots-clés", items: [{ key: "tags", label: "Mots-clés", value: tags }] }] : [];
  }
  if (type === "tool-suggest_license") {
    return [{ title: "Licence", items: [textItem(output, "license", "Licence")].filter(Boolean) as SuggestionGroup["items"] }];
  }
  if (type === "tool-suggest_temporal_metadata") {
    return [{ title: "Temps", items: [
      textItem(output, "frequency", "Fréquence de mise à jour"),
      textItem(output, "temporalStart", "Début de couverture"),
      textItem(output, "temporalEnd", "Fin de couverture"),
    ].filter(Boolean) as SuggestionGroup["items"] }];
  }
  if (type === "tool-suggest_spatial_metadata") {
    return [{ title: "Espace", items: [
      textItem(output, "spatialCoverage", "Couverture spatiale"),
      textItem(output, "spatialGranularity", "Granularité spatiale"),
    ].filter(Boolean) as SuggestionGroup["items"] }];
  }
  return [];
}

function isApplicableSuggestion(type: string) {
  return type !== "tool-consult_publication_guide";
}

const errorPresentation = computed(() => props.errorMessage
  ? classifyExplorationError(props.errorMessage)
  : undefined);

function clarificationParts(message: PublicationAssistantMessage) {
  return message.parts.filter(part => part.type === "tool-request_publication_clarification");
}

function selectClarification(toolCallId: string, choice: unknown) {
  if (typeof choice === "string" && choice.trim()) emit("clarify", toolCallId, choice);
}

const suggestionSelections = reactive<Record<string, Record<string, boolean>>>({});

function fieldSelected(toolCallId: string, key: string) {
  return suggestionSelections[toolCallId]?.[key] ?? true;
}

function setFieldSelected(toolCallId: string, key: string, selected: boolean) {
  suggestionSelections[toolCallId] ??= {};
  suggestionSelections[toolCallId]![key] = selected;
}

function applySelectedSuggestion(part: ReturnType<typeof suggestionParts>[number]) {
  if (part.state !== "output-available" || !isRecord(part.output)) return;
  const selected: Record<string, unknown> = {};
  for (const group of suggestionGroups(part.type, part.output)) {
    for (const item of group.items) {
      if (fieldSelected(part.toolCallId, item.key)) selected[item.key] = part.output[item.key];
    }
  }
  if (Object.keys(selected).length) emit("applySuggestion", toolName(part.type), selected);
}
</script>

<template>
  <aside class="flex min-h-[32rem] flex-col overflow-hidden rounded-md border border-[#777777] bg-[linear-gradient(to_bottom,rgb(249,249,255)_0%,rgb(255,255,255)_100%)] shadow-[-4px_0_12px_rgba(0,0,0,0.05)] xl:sticky xl:top-4 xl:max-h-[calc(100dvh-32px)]">
    <ExplorationAgentPanelHeader
      :show-sql="false"
      :subtitle="stepLabel"
      title="Assistant de publication"
    />

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <section>
        <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Contexte compris</p>
        <p class="mt-1 text-[13px] leading-5">{{ context }}</p>
      </section>

      <ul v-if="tool.status !== 'available'">
        <ExplorationAgentToolTrace
          :description="tool.description"
          :label="tool.label"
          open
          :summary="tool.status === 'running' ? 'En cours' : tool.status === 'completed' ? 'Utilisé' : 'Disponible'"
        />
      </ul>

      <PublicationPromptSuggestions
        v-if="suggestions.length"
        :disabled="Boolean(busy)"
        label="Que souhaitez-vous demander ?"
        :suggestions="suggestions"
        @select="emit('selectSuggestion', $event)"
      />

      <div v-if="busy" class="flex items-start gap-2.5 py-2 text-[12px] text-[#555555]" role="status">
        <span class="mt-0.5 text-[#777777]"><ExplorationUnicodeSpinner name="dna" /></span>
        <span>Analyse du fichier et préparation des recommandations…</span>
      </div>

      <ExplorationStatusMessage
        v-else-if="errorPresentation"
        :action-label="errorPresentation.action === 'retry' ? errorPresentation.actionLabel : undefined"
        :code="errorPresentation.code"
        :details="errorPresentation.technicalDetails"
        :message="errorPresentation.message"
        :request-id="errorPresentation.requestId"
        :retry-after-seconds="errorPresentation.retryAfterSeconds"
        :source-label="errorPresentation.sourceLabel"
        :title="errorPresentation.title"
        tone="error"
        @action="emit('retry')"
      />

      <section v-else-if="recommendations.length" class="space-y-2">
        <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Recommandations</p>
        <article v-for="recommendation in recommendations" :key="recommendation.id" class="rounded-md border border-[#cacafb] bg-white p-3">
          <div class="flex items-start gap-2">
            <i aria-hidden="true" class="ri-lightbulb-line mt-0.5 shrink-0 text-[14px] text-[#000091]" />
            <div class="min-w-0 flex-1">
              <h3 class="text-[12px] font-medium leading-4">{{ recommendation.title }}</h3>
              <p class="mt-1 text-[11px] leading-4 text-[#555555]">{{ recommendation.description }}</p>
              <button
                v-if="recommendation.actionLabel"
                class="agent-focusable mt-2 h-7 rounded-md border border-[#000091] px-2.5 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]"
                type="button"
                @click="emit('applySuggestion', recommendation.id, {})"
              >{{ recommendation.actionLabel }}</button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="messages.length" class="space-y-3 border-t border-[#e5e5e5] pt-4" aria-label="Échange avec l’assistant">
        <template v-for="message in messages" :key="message.id">
          <div
            v-if="visibleMessage(message) && messageText(message) && !hasMetadataSuggestion(message)"
            :class="message.role === 'user' ? 'ml-auto rounded-md bg-[#eeeeee] px-3 py-2' : 'mr-auto px-0 py-1'"
            class="max-w-[90%] whitespace-pre-wrap text-[12px] leading-5"
          >{{ messageText(message) }}</div>

          <details
            v-for="part in suggestionParts(message)"
            :key="part.toolCallId"
            class="group/tool overflow-hidden rounded-md border border-[#e5e5e5] bg-white"
            open
          >
            <summary class="agent-focusable flex min-h-10 cursor-pointer list-none items-center gap-2 px-2.5 py-2 hover:bg-[#f6f6f6] [&::-webkit-details-marker]:hidden">
              <i aria-hidden="true" class="ri-wrench-line text-[14px] text-[#555555]" />
              <h3 class="min-w-0 flex-1 truncate text-[11px] font-semibold">{{ toolTitle(part.type) }}</h3>
              <span class="ml-auto text-[11px] text-[#666666]">{{ part.state === 'output-available' ? 'Prête' : 'Préparation…' }}</span>
              <i aria-hidden="true" class="ri-arrow-down-s-line text-[14px] text-[#777777] transition-transform duration-200 group-open/tool:rotate-180" />
            </summary>
            <div v-if="part.state === 'output-available'" class="border-t border-[#e5e5e5] p-3">
              <div v-if="suggestionGroups(part.type, part.output).length" class="space-y-3">
                <section v-for="group in suggestionGroups(part.type, part.output)" :key="group.title" class="border-b border-[#e5e5e5] pb-3 last:border-0 last:pb-0">
                  <h4 class="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#777777]">{{ group.title }}</h4>
                  <dl class="mt-1.5 space-y-2">
                    <div v-for="item in group.items" :key="item.key" class="grid grid-cols-[auto_1fr] items-start gap-2">
                      <input
                        :checked="fieldSelected(part.toolCallId, item.key)"
                        class="agent-focusable mt-0.5 size-3.5 accent-[#000091]"
                        :aria-label="`Appliquer ${item.label}`"
                        type="checkbox"
                        @change="setFieldSelected(part.toolCallId, item.key, ($event.target as HTMLInputElement).checked)"
                      >
                      <div>
                        <dt class="text-[10px] text-[#777777]">{{ item.label }}</dt>
                        <dd class="mt-0.5 whitespace-pre-wrap text-[11px] leading-4 text-[#3a3a3a]">{{ item.value }}</dd>
                      </div>
                    </div>
                  </dl>
                </section>
              </div>
              <p v-else class="text-[11px] leading-4 text-[#555555]">{{ suggestionSummary(part.output) }}</p>
              <p v-if="isRecord(part.output) && typeof part.output.rationale === 'string'" class="mt-2 text-[11px] leading-4 text-[#777777]">{{ part.output.rationale }}</p>
              <button
                v-if="isApplicableSuggestion(part.type)"
                class="agent-focusable mt-2 h-7 rounded-md border border-[#000091] px-2.5 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]"
                type="button"
                @click="applySelectedSuggestion(part)"
              >Appliquer la sélection</button>
            </div>
          </details>

          <section
            v-for="part in clarificationParts(message)"
            :key="part.toolCallId"
            class="rounded-md border border-[#cacafb] bg-white p-3"
          >
            <div class="flex items-start gap-2">
              <i aria-hidden="true" class="ri-question-answer-line mt-0.5 text-[14px] text-[#000091]" />
              <div class="min-w-0 flex-1">
                <p class="text-[12px] font-medium leading-5">{{ part.input?.question || 'Une précision est nécessaire.' }}</p>
                <div v-if="part.state !== 'output-available'" class="mt-2 flex flex-wrap gap-1.5">
                  <button
                    v-for="choice in part.input?.choices || []"
                    :key="choice"
                    class="agent-focusable rounded-md border border-[#e5e5e5] bg-white px-2 py-1 text-[11px] text-[#3a3a3a] hover:border-[#000091] hover:text-[#000091]"
                    type="button"
                    @click="selectClarification(part.toolCallId, choice)"
                  >{{ choice }}</button>
                </div>
                <p v-else class="mt-1 text-[11px] text-[#555555]">Réponse retenue : {{ part.output.choice }}</p>
              </div>
            </div>
          </section>
        </template>
      </section>
    </div>

    <ExplorationAgentComposer
      v-model="question"
      v-model:selected-model-id="modelId"
      :disabled="Boolean(busy)"
      disabled-placeholder="Analyse du fichier en cours…"
      :resource-organization="resourceOrganization"
      :resource-title="resourceTitle"
      :responding="Boolean(busy)"
      @submit="submitQuestion"
      @stop="emit('stop')"
    />
  </aside>
</template>
