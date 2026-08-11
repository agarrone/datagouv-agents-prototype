<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { ChatAddToolOutputFunction, LanguageModelUsage } from "ai";
import {
  explorationResources,
  type ExplorationResource,
} from "~~/shared/data/exploration-resources";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const input = ref("");
const route = useRoute();
const panelMode = ref<"assistant" | "sql">("assistant");
const assistantOpen = ref(true);
const assistantWidth = ref(576);
const resourcesCollapsed = ref(false);
const editingMessageId = ref<string | null>(null);
const composer = ref<{ focus: () => void } | null>(null);
const dataset = useDatasetEngine();
const { playUiSound } = useUiSound();
function queryValue(name: string) {
  const value = route.query[name];
  return typeof value === "string" ? value : "";
}
const requestedResourceId = typeof route.query.resource === "string"
  ? route.query.resource
  : "";
const resourceFromQuery = queryValue("dataset") && queryValue("parquet")
  ? {
      id: requestedResourceId || queryValue("dataset"),
      datasetReference: queryValue("dataset"),
      title: queryValue("title") || "Jeu de données data.gouv.fr",
      organization: queryValue("organization") || "Producteur non renseigné",
      parquetUrl: queryValue("parquet"),
      resourceName: queryValue("resourceName") || "Version Parquet du jeu de données",
    } satisfies ExplorationResource
  : null;
const selectedResource = ref<ExplorationResource | null>(
  resourceFromQuery
  ?? explorationResources.find(resource => resource.id === requestedResourceId)
  ?? explorationResources[0]
  ?? null,
);
const readySoundPlayed = ref(false);
const latestResponseUsage = ref<LanguageModelUsage>();
const conversationFeedbackMessageId = ref<string | null>(null);
const conversationFeedbackPrompted = ref(false);
const announcedToolErrorCount = ref(0);
let settledErrorSoundTimer: ReturnType<typeof setTimeout> | undefined;
const runtimeBridge: {
  addToolOutput?: ChatAddToolOutputFunction<ExplorationMessage>;
} = {};
const toolRuntime = useExplorationToolRuntime(dataset, (output) => {
  if (!runtimeBridge.addToolOutput) {
    throw new Error("Le runtime des tools n’est pas encore initialisé.");
  }
  return runtimeBridge.addToolOutput(output);
});

const {
  addToolOutput,
  clearError,
  error: chatError,
  messages,
  sendMessage,
  status: chatStatus,
  stop,
} = useChat<ExplorationMessage>({
  transport: new DefaultChatTransport({
    api: "/nuxt-api/agents/exploration",
    prepareSendMessagesRequest({ id, messages, trigger, messageId }) {
      const resource = dataset.activeResource.value;
      if (!resource) throw new Error("Aucune ressource n’est chargée.");

      return {
        body: {
          id,
          messages,
          trigger,
          messageId,
          resource: {
            datasetId: resource.datasetReference,
            resourceId: resource.id,
            title: resource.title,
            organization: resource.organization,
            resourceName: resource.resourceName ?? "Version Parquet du jeu de données",
            url: resource.parquetUrl,
            schema: dataset.schema.value
              ? {
                  rowCount: dataset.schema.value.rowCount,
                  columns: dataset.schema.value.columns,
                }
              : undefined,
          },
        },
      };
    },
  }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  onToolCall: toolRuntime.handleToolCall,
  onFinish({ message }) {
    const questionCount = messages.value.filter(item => item.role === "user").length;
    if (questionCount >= 6 && !conversationFeedbackPrompted.value) {
      conversationFeedbackPrompted.value = true;
      conversationFeedbackMessageId.value = message.id;
    }
    const usage = message.metadata?.totalUsage;
    if (!usage) return;
    const current = latestResponseUsage.value;
    latestResponseUsage.value = {
      inputTokens: (current?.inputTokens ?? 0) + (usage.inputTokens ?? 0),
      inputTokenDetails: {
        noCacheTokens: (current?.inputTokenDetails.noCacheTokens ?? 0) + (usage.inputTokenDetails.noCacheTokens ?? 0),
        cacheReadTokens: (current?.inputTokenDetails.cacheReadTokens ?? 0) + (usage.inputTokenDetails.cacheReadTokens ?? 0),
        cacheWriteTokens: (current?.inputTokenDetails.cacheWriteTokens ?? 0) + (usage.inputTokenDetails.cacheWriteTokens ?? 0),
      },
      outputTokens: (current?.outputTokens ?? 0) + (usage.outputTokens ?? 0),
      outputTokenDetails: {
        textTokens: (current?.outputTokenDetails.textTokens ?? 0) + (usage.outputTokenDetails.textTokens ?? 0),
        reasoningTokens: (current?.outputTokenDetails.reasoningTokens ?? 0) + (usage.outputTokenDetails.reasoningTokens ?? 0),
      },
      totalTokens: (current?.totalTokens ?? 0) + (usage.totalTokens ?? 0),
    };
  },
});
runtimeBridge.addToolOutput = addToolOutput;

const isResponding = computed(
  () => chatStatus.value === "submitted" || chatStatus.value === "streaming",
);
const tableColumns = computed(() =>
  dataset.activeView.value?.columns
  ?? dataset.schema.value?.columns.map(item => item.name)
  ?? [],
);
const explorerColumns = computed(() => tableColumns.value.map(name => ({
  name,
  type: dataset.schema.value?.columns.find(column => column.name === name)?.type ?? "VARCHAR",
})));
const unresolvedToolErrorCount = computed(() => messages.value.reduce((total, message) => {
  return total + message.parts.filter((part, index) => {
    if (!("state" in part) || part.state !== "output-error") return false;
    return !message.parts.slice(index + 1).some(nextPart =>
      "state" in nextPart
      && nextPart.type === part.type
      && nextPart.state === "output-available",
    );
  }).length;
}, 0));
const showInitialThinking = computed(() => {
  if (!isResponding.value) return false;
  const lastMessage = messages.value.at(-1);
  return !lastMessage
    || lastMessage.role === "user"
    || lastMessage.parts.length === 0;
});
const lastMessageId = computed(() => messages.value.at(-1)?.id);
const lastUserMessageId = computed(() => [...messages.value]
  .reverse()
  .find(message => message.role === "user")?.id);

function previousUserQuestion(messageIndex: number) {
  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    const message = messages.value[index];
    if (message?.role !== "user") continue;
    return message.parts
      .filter(part => part.type === "text")
      .map(part => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

watch(
  () => dataset.status.value,
  (status) => {
    if (status === "ready" && messages.value.length === 0 && !readySoundPlayed.value) {
      readySoundPlayed.value = true;
      playUiSound("ready");
    }
  },
);

watch(() => dataset.error.value, (error, previousError) => {
  if (error && error !== previousError) playUiSound("error");
});

watch(chatStatus, (status) => {
  if (settledErrorSoundTimer) clearTimeout(settledErrorSoundTimer);
  if (status === "submitted" || status === "streaming") return;

  settledErrorSoundTimer = setTimeout(() => {
    if (isResponding.value) return;
    const hasNewToolError = unresolvedToolErrorCount.value > announcedToolErrorCount.value;
    if (chatError.value || hasNewToolError) playUiSound("error");
    announcedToolErrorCount.value = unresolvedToolErrorCount.value;
  }, 400);
});

onBeforeUnmount(() => {
  if (settledErrorSoundTimer) clearTimeout(settledErrorSoundTimer);
});

onMounted(() => {
  if ((requestedResourceId || resourceFromQuery) && selectedResource.value) {
    void loadSelectedResource();
  }
});

async function submit() {
  const text = input.value.trim();
  if (!text || dataset.status.value !== "ready" || isResponding.value) return;
  clearError();
  const messageId = editingMessageId.value;
  latestResponseUsage.value = undefined;
  input.value = "";
  editingMessageId.value = null;
  await sendMessage({
    text,
    messageId: messageId ?? undefined,
    metadata: { createdAt: new Date().toISOString() },
  });
}

async function editQuestion(messageId: string, content: string) {
  if (isResponding.value) return;
  editingMessageId.value = messageId;
  input.value = content;
  await nextTick();
  composer.value?.focus();
}

async function cancelQuestionEditing() {
  editingMessageId.value = null;
  input.value = "";
  await nextTick();
  composer.value?.focus();
}

async function loadSelectedResource() {
  if (!selectedResource.value || dataset.status.value === "loading") return;
  try {
    await dataset.load(selectedResource.value);
  } catch {
    // L’erreur est déjà exposée par le moteur de données et le sélecteur.
  }
}

async function selectResource(resource: ExplorationResource) {
  const changesResource = dataset.activeResource.value?.id !== resource.id;
  if (changesResource && isResponding.value) stop();
  selectedResource.value = resource;
  try {
    await dataset.load(resource);
    if (changesResource) {
      messages.value = [];
      input.value = "";
      editingMessageId.value = null;
      latestResponseUsage.value = undefined;
      conversationFeedbackMessageId.value = null;
      conversationFeedbackPrompted.value = false;
    }
  } catch {
    // Le moteur expose directement l’erreur dans l’interface.
  }
}

function startAssistantResize(event: MouseEvent) {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = assistantWidth.value;
  const move = (moveEvent: MouseEvent) => {
    assistantWidth.value = Math.max(420, Math.min(820, startWidth + startX - moveEvent.clientX));
  };
  const stop = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", stop);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);
}

async function applyExplorerProposal(
  toolCallId: string,
  sql: string,
  title: string,
) {
  try {
    const view = await dataset.applyExplorerView(sql, title);
    if (/\bwhere\b/i.test(sql)) playUiSound("whisper");
    await addToolOutput({
      tool: "propose_explorer_view",
      toolCallId,
      output: {
        applied: true,
        title: view.title,
        rowCount: view.rowCount,
        columns: view.columns,
        truncated: view.truncated,
      },
    });
  } catch (reason) {
    await addToolOutput({
      state: "output-error",
      tool: "propose_explorer_view",
      toolCallId,
      errorText: reason instanceof Error
        ? reason.message
        : "La vue proposée n’a pas pu être appliquée.",
    });
  }
}

async function resolveClarification(toolCallId: string, choice: string) {
  clearError();
  await addToolOutput({
    tool: "request_clarification",
    toolCallId,
    output: { choice },
  });
}
</script>

<template>
  <main class="flex h-dvh min-w-[64rem] flex-col overflow-hidden bg-white">
    <header class="border-b border-[#e5e5e5] px-5 py-4">
      <div class="mx-auto flex w-full max-w-[90rem] items-center justify-between">
        <div>
          <p class="text-[13px] text-[#555555]">Prototype autonome · Spike technique</p>
          <h1 class="text-2xl font-bold">Agent d’exploration</h1>
        </div>
        <NuxtLink class="text-[13px] text-[#000091] underline" to="/">Retour</NuxtLink>
      </div>
    </header>

    <div class="grid min-h-0 w-full flex-1" :style="{ gridTemplateColumns: `${resourcesCollapsed ? 44 : 216}px minmax(0, 1fr)${assistantOpen ? ` ${assistantWidth}px` : ''}` }">
      <ExplorationResourceSidebar
        v-model:collapsed="resourcesCollapsed"
        :loading="dataset.status.value === 'loading'"
        :resources="explorationResources"
        :selected-id="selectedResource?.id"
        @select="selectResource"
      />

      <section class="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div class="flex min-h-14 shrink-0 items-center gap-2 border-b border-[#e5e5e5] bg-[#f6f6f6] px-4">
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-bold">{{ dataset.activeResource.value?.title ?? "Ressources de test" }}</p>
            <p class="mt-0.5 truncate text-[11px] text-[#555555]">{{ dataset.activeResource.value ? `${dataset.activeResource.value.organization} · Parquet` : "Sélectionnez une ressource issue de data.gouv.fr" }}</p>
          </div>
          <button v-if="!assistantOpen" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#000091] bg-[#ebedff] px-2.5 text-[12px] font-medium text-[#000091]" type="button" @click="assistantOpen = true; panelMode = 'assistant'">
            <i class="ri-message-ai-3-line text-sm" />Poser une question
          </button>
        </div>

        <div v-if="dataset.status.value !== 'ready'" class="grid min-h-0 flex-1 place-items-center bg-[#fafafa] p-8 text-center">
          <div class="max-w-md">
            <i :class="dataset.status.value === 'loading' ? 'ri-loader-4-line animate-spin' : dataset.status.value === 'error' ? 'ri-error-warning-line text-[#ce0500]' : 'ri-table-line text-[#777777]'" class="text-2xl" />
            <h2 class="mt-3 text-[14px] font-bold">{{ dataset.status.value === 'loading' ? 'Chargement de la ressource' : dataset.status.value === 'error' ? 'Impossible de charger la ressource' : 'Choisissez une ressource' }}</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#555555]">{{ dataset.status.value === 'loading' ? 'DuckDB prépare les données et inspecte leur structure dans votre navigateur.' : dataset.error.value || 'Sélectionnez une ressource dans le panneau de gauche pour afficher ses données et préparer le contexte de l’assistant.' }}</p>
            <button v-if="dataset.status.value === 'error' && selectedResource" class="mt-3 h-8 rounded-md border border-[#ce0500] px-3 text-[11px] text-[#ce0500]" type="button" @click="selectResource(selectedResource)">Réessayer</button>
          </div>
        </div>

        <div v-else class="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ExplorationDatasetExplorer
            :base-sql="dataset.activeView.value?.sql"
            :columns="explorerColumns"
            :row-count="dataset.activeView.value?.rowCount ?? dataset.schema.value?.rowCount ?? 0"
            :view-title="dataset.activeView.value?.title"
            @reset-view="dataset.resetExplorerView"
          />
        </div>
      </section>

      <aside v-if="assistantOpen" class="chat-sidebar relative flex min-h-0 flex-col border-l border-[#777777] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30)_0%,rgba(235,237,255,0.01)_100%)] shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
        <button aria-label="Redimensionner le panneau assistant" class="absolute inset-y-0 -left-1 z-30 w-2 cursor-col-resize" type="button" @mousedown="startAssistantResize"><span class="mx-auto block h-full w-px bg-transparent hover:bg-[#000091]" /></button>
        <ExplorationAgentPanelHeader v-model="panelMode" closable @close="assistantOpen = false" />
        <ExplorationConversationScroller
          v-show="panelMode === 'assistant'"
          :message-count="messages.length"
          :responding="isResponding"
        >
          <ExplorationAgentEmptyState
            v-if="messages.length === 0"
            class="min-h-full"
            :loading="dataset.status.value === 'loading'"
            :ready="dataset.status.value === 'ready'"
            :resource-title="selectedResource?.title"
            :schema-columns="dataset.schema.value?.columns ?? []"
            @load="loadSelectedResource"
            @suggestion="input = $event"
          />
          <ExplorationAgentMessage
            v-for="(message, messageIndex) in messages"
            :key="message.id"
            :can-edit="message.role === 'user' && message.id === lastUserMessageId && !isResponding"
            :message="message"
            :source="dataset.activeResource.value ? `${dataset.activeResource.value.title} · ${dataset.activeResource.value.organization}` : undefined"
            :responding="isResponding && message.id === lastMessageId && message.role === 'assistant'"
            :show-feedback-prompt="message.role === 'assistant' && message.id === conversationFeedbackMessageId"
            :feedback-context="message.role === 'assistant' && dataset.activeResource.value ? {
              question: previousUserQuestion(messageIndex),
              resource: dataset.activeResource.value.parquetUrl,
              dataset: dataset.activeResource.value.title,
              resourceName: dataset.activeResource.value.resourceName ?? 'Version Parquet du jeu de données',
              model: 'agent-exploration',
            } : undefined"
            @apply-proposal="applyExplorerProposal"
            @clarify="resolveClarification"
            @edit="editQuestion"
            @dismiss-feedback-prompt="conversationFeedbackMessageId = null"
          />
          <ExplorationAgentThinking v-if="showInitialThinking" />
          <ExplorationStatusMessage
            v-if="chatError && !isResponding"
            :message="chatError.message"
            title="La réponse a été interrompue"
            tone="error"
          />
        </ExplorationConversationScroller>
        <ExplorationAgentComposer
          v-show="panelMode === 'assistant'"
          ref="composer"
          v-model="input"
          :disabled="dataset.status.value !== 'ready'"
          :editing="Boolean(editingMessageId)"
          :resource-organization="dataset.activeResource.value?.organization"
          :resource-title="dataset.activeResource.value?.title"
          :responding="isResponding"
          :usage="latestResponseUsage"
          @cancel-edit="cancelQuestionEditing"
          @stop="stop"
          @submit="submit"
        />
        <ExplorationSqlConsole
          v-show="panelMode === 'sql'"
          :ready="dataset.status.value === 'ready'"
        />
      </aside>
    </div>
  </main>
</template>
