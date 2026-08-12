<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { ChatAddToolOutputFunction, LanguageModelUsage } from "ai";
import {
  explorationResources,
  type DatagouvDatasetPageMetadata,
  type DatagouvDatasetResource,
  type ExplorationResource,
} from "~~/shared/data/exploration-resources";
import type { ExplorationMessage } from "~~/shared/types/exploration";
import {
  classifyExplorationError,
  type ExplorationRecoveryAction,
} from "~~/shared/errors/exploration";

const input = ref("");
const route = useRoute();
const panelMode = ref<"assistant" | "sql">("assistant");
const assistantOpen = ref(true);
const DEFAULT_ASSISTANT_WIDTH = 576;
const DEFAULT_RESOURCES_WIDTH = 216;
const assistantWidth = ref(DEFAULT_ASSISTANT_WIDTH);
const resourcesWidth = ref(DEFAULT_RESOURCES_WIDTH);
const resourcesCollapsed = ref(false);
const workspaceFullscreen = ref(false);
const pageScrolled = ref(false);
const explorer = ref<{ download: () => Promise<void> } | null>(null);
const explorerDownloadInProgress = ref(false);
const datasetResources = ref<DatagouvDatasetResource[]>([]);
const datasetResourcesLoading = ref(false);
const datasetMetadata = ref<DatagouvDatasetPageMetadata>();
const datasetMetadataLoading = ref(false);
const datasetMetadataError = ref("");
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
  regenerate,
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
const chatErrorPresentation = computed(() => chatError.value
  ? classifyExplorationError(chatError.value)
  : undefined);
const datasetErrorPresentation = computed(() => dataset.error.value
  ? classifyExplorationError(dataset.error.value, "duckdb")
  : undefined);
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

function updatePageScrollState() {
  pageScrolled.value = window.scrollY > 8;
}

onMounted(() => {
  updatePageScrollState();
  window.addEventListener("scroll", updatePageScrollState, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updatePageScrollState);
});

onMounted(async () => {
  if (!selectedResource.value) return;
  const initialResource = selectedResource.value;
  await Promise.all([
    loadDatasetMetadata(initialResource),
    (async () => {
      await loadDatasetResources(initialResource);
      if (requestedResourceId || resourceFromQuery) await loadSelectedResource();
    })(),
  ]);
});

async function loadDatasetMetadata(resource: ExplorationResource) {
  datasetMetadataLoading.value = true;
  datasetMetadataError.value = "";
  try {
    const response = await $fetch<{ dataset: DatagouvDatasetPageMetadata }>(
      "/nuxt-api/datasets/metadata",
      { query: { dataset: resource.datasetReference } },
    );
    datasetMetadata.value = response.dataset;
  } catch {
    datasetMetadataError.value = "Les informations publiques du jeu de données n’ont pas pu être chargées.";
  } finally {
    datasetMetadataLoading.value = false;
  }
}

async function loadDatasetResources(resource: ExplorationResource) {
  datasetResourcesLoading.value = true;
  try {
    const response = await $fetch<{ resources: DatagouvDatasetResource[] }>("/nuxt-api/datasets/resources", {
      query: { dataset: resource.datasetReference },
    });
    datasetResources.value = response.resources;
    const matchingResource = response.resources.find(item =>
      item.id === resource.id || item.parquetUrl === resource.parquetUrl,
    );
    if (matchingResource?.parquetUrl) {
      selectedResource.value = {
        ...resource,
        id: matchingResource.id,
        parquetUrl: matchingResource.parquetUrl,
        resourceName: matchingResource.title,
      };
    }
  } catch {
    datasetResources.value = [{
      id: resource.id,
      title: resource.resourceName ?? "Version Parquet du jeu de données",
      format: "PARQUET",
      url: resource.parquetUrl,
      parquetUrl: resource.parquetUrl,
    }];
  } finally {
    datasetResourcesLoading.value = false;
  }
}

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

async function recoverFromError(action: ExplorationRecoveryAction, messageId?: string) {
  if (isResponding.value) return;
  if (action === "reload-resource") {
    if (selectedResource.value) await selectResource(selectedResource.value);
    return;
  }
  if (action === "clarify") {
    panelMode.value = "assistant";
    assistantOpen.value = true;
    await nextTick();
    composer.value?.focus();
    return;
  }
  clearError();
  await regenerate({ messageId });
}

async function loadSelectedResource() {
  if (!selectedResource.value || dataset.status.value === "loading") return;
  try {
    await dataset.load(selectedResource.value);
  } catch {
    // L’erreur est déjà exposée par le moteur de données et le sélecteur.
  }
}

async function downloadExplorerData() {
  if (!explorer.value || explorerDownloadInProgress.value) return;
  explorerDownloadInProgress.value = true;
  try {
    await explorer.value.download();
  } finally {
    explorerDownloadInProgress.value = false;
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

async function selectDatasetResource(resource: DatagouvDatasetResource) {
  if (!resource.parquetUrl || !selectedResource.value) return;
  await selectResource({
    id: resource.id,
    datasetReference: selectedResource.value.datasetReference,
    title: selectedResource.value.title,
    organization: selectedResource.value.organization,
    parquetUrl: resource.parquetUrl,
    resourceName: resource.title,
  });
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

function startResourcesResize(event: MouseEvent) {
  if (resourcesCollapsed.value) return;
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = resourcesWidth.value;
  const move = (moveEvent: MouseEvent) => {
    resourcesWidth.value = Math.max(176, Math.min(420, startWidth + moveEvent.clientX - startX));
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
  <main class="min-h-dvh min-w-[64rem] bg-white pb-6">
    <ExplorationDatasetOverview
      v-if="!workspaceFullscreen && selectedResource"
      :dataset="datasetMetadata"
      :error="datasetMetadataError"
      :fallback-organization="selectedResource.organization"
      :fallback-title="selectedResource.title"
      :loading="datasetMetadataLoading"
    />

    <section
      class="flex flex-col overflow-hidden bg-white"
      :class="workspaceFullscreen
        ? 'fixed inset-0 z-[100] h-dvh min-h-0 w-full max-w-none rounded-none border-0'
        : 'mx-auto mt-6 h-[calc(100dvh-48px)] min-h-[680px] max-h-[860px] w-[calc(100%-2rem)] max-w-[90rem] rounded-md border border-[#e5e5e5]'"
      aria-label="Espace d’exploration du jeu de données"
    >
      <header
        class="workspace-header flex h-16 shrink-0 items-center gap-3 border-b px-4"
        :class="pageScrolled && !workspaceFullscreen
          ? 'border-[#cfcfcf] bg-[#f6f6f6]/85 shadow-[0_1px_8px_rgba(0,0,0,0.08)] backdrop-blur-md'
          : 'border-[#e5e5e5] bg-[#f6f6f6]'"
      >
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-[13px] font-bold">{{ selectedResource?.title ?? "Agent d’exploration" }}</h1>
        <p class="mt-0.5 truncate text-[11px] text-[#555555]">{{ selectedResource?.organization ?? "Prototype autonome" }}</p>
      </div>
      <button
        aria-label="Télécharger les données affichées"
        class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] bg-white text-[#000091] disabled:text-[#929292]"
        :disabled="dataset.status.value !== 'ready' || explorerDownloadInProgress"
        title="Télécharger les données affichées"
        type="button"
        @click="downloadExplorerData"
      >
        <i :class="explorerDownloadInProgress ? 'ri-loader-4-line animate-spin' : 'ri-download-line'" class="text-sm" />
      </button>
      <button
        :aria-pressed="assistantOpen"
        class="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium"
        :class="assistantOpen ? 'border-[#000091] bg-[#ebedff] text-[#000091]' : 'border-[#e5e5e5] bg-white text-[#555555] hover:border-[#000091] hover:text-[#000091]'"
        type="button"
        @click="assistantOpen = true; panelMode = 'assistant'"
      >
        <i class="ri-message-ai-3-line text-sm" />Poser une question
      </button>
      <button :aria-label="workspaceFullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'" class="grid size-8 place-items-center rounded-md border border-[#e5e5e5] bg-white text-[#555555]" type="button" @click="workspaceFullscreen = !workspaceFullscreen"><i :class="workspaceFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'" class="text-base" /></button>
      </header>

      <div class="relative grid min-h-0 w-full flex-1" :style="{ gridTemplateColumns: `${resourcesCollapsed ? 44 : resourcesWidth}px minmax(0, 1fr)${assistantOpen ? ` ${assistantWidth}px` : ''}` }">
      <ExplorationResourceSidebar
        v-model:collapsed="resourcesCollapsed"
        :loading="dataset.status.value === 'loading' || datasetResourcesLoading"
        :resources="datasetResources"
        :selected-id="selectedResource?.id"
        @select="selectDatasetResource"
      />

      <button
        v-if="!resourcesCollapsed"
        aria-label="Redimensionner le panneau des ressources"
        class="group absolute inset-y-0 z-40 w-2 cursor-col-resize"
        :style="{ left: `${resourcesWidth - 4}px` }"
        title="Glisser pour redimensionner · Double-cliquer pour réinitialiser"
        type="button"
        @dblclick="resourcesWidth = DEFAULT_RESOURCES_WIDTH"
        @mousedown="startResourcesResize"
      ><span class="mx-auto block h-full w-px bg-transparent group-hover:bg-[#000091]" /></button>

      <section class="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div class="flex h-14 shrink-0 items-center gap-2 border-b border-[#e5e5e5] bg-[#f6f6f6] px-4">
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-bold">Ressource : {{ dataset.activeResource.value?.resourceName ?? selectedResource?.resourceName ?? "Aucune ressource chargée" }}</p>
            <p class="mt-0.5 truncate text-[11px] text-[#555555]">{{ dataset.activeResource.value ? `${dataset.activeResource.value.title} · ${dataset.activeResource.value.organization}` : "Sélectionnez une ressource dans le panneau de gauche" }}</p>
          </div>
        </div>

        <ExplorationDatasetTableSkeleton v-if="dataset.status.value === 'loading'" />
        <div v-else-if="dataset.status.value !== 'ready'" class="grid min-h-0 flex-1 place-items-center bg-[#fafafa] p-8 text-center">
          <div class="max-w-md">
            <ExplorationStatusMessage
              v-if="datasetErrorPresentation"
              action-label="Recharger la ressource"
              :details="datasetErrorPresentation.technicalDetails"
              :message="datasetErrorPresentation.message"
              :title="datasetErrorPresentation.title"
              tone="error"
              @action="selectedResource && selectResource(selectedResource)"
            />
            <template v-else>
              <i class="ri-table-line text-2xl text-[#777777]" />
              <h2 class="mt-3 text-[14px] font-bold">Choisissez une ressource</h2>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">Sélectionnez une ressource dans le panneau de gauche pour afficher ses données et préparer le contexte de l’assistant.</p>
            </template>
          </div>
        </div>

        <div v-else class="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ExplorationDatasetExplorer
            ref="explorer"
            :base-sql="dataset.activeView.value?.sql"
            :columns="explorerColumns"
            :row-count="dataset.activeView.value?.rowCount ?? dataset.schema.value?.rowCount ?? 0"
            :view-title="dataset.activeView.value?.title"
            @reset-view="dataset.resetExplorerView"
          />
        </div>
      </section>

      <aside v-if="assistantOpen" class="chat-sidebar relative flex min-h-0 flex-col border-l border-[#777777] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30)_0%,rgba(235,237,255,0.01)_100%)] shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
        <button aria-label="Redimensionner le panneau assistant" class="group absolute inset-y-0 -left-1 z-30 w-2 cursor-col-resize" title="Glisser pour redimensionner · Double-cliquer pour réinitialiser" type="button" @dblclick="assistantWidth = DEFAULT_ASSISTANT_WIDTH" @mousedown="startAssistantResize"><span class="mx-auto block h-full w-px bg-transparent group-hover:bg-[#000091]" /></button>
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
              dataset: dataset.activeResource.value.datasetReference,
              datasetName: dataset.activeResource.value.title,
              datasetUrl: `https://www.data.gouv.fr/fr/datasets/${encodeURIComponent(dataset.activeResource.value.datasetReference)}/`,
              resourceName: dataset.activeResource.value.resourceName ?? 'Version Parquet du jeu de données',
              model: 'agent-exploration',
            } : undefined"
            @apply-proposal="applyExplorerProposal"
            @clarify="resolveClarification"
            @edit="editQuestion"
            @dismiss-feedback-prompt="conversationFeedbackMessageId = null"
            @recover="recoverFromError"
          />
          <ExplorationAgentThinking v-if="showInitialThinking" />
          <ExplorationStatusMessage
            v-if="chatErrorPresentation && !isResponding"
            :action-label="chatErrorPresentation.actionLabel"
            :details="chatErrorPresentation.technicalDetails"
            :message="chatErrorPresentation.message"
            :title="chatErrorPresentation.title"
            tone="error"
            @action="recoverFromError(chatErrorPresentation.action)"
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
    </section>
  </main>
</template>

<style scoped>
.workspace-header {
  transition-property: background-color, border-color, box-shadow, backdrop-filter;
  transition-duration: var(--duration-quick);
  transition-timing-function: var(--ease-smooth-out);
}

@media (prefers-reduced-motion: reduce) {
  .workspace-header { transition: none; }
}
</style>
