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
  <main class="flex min-h-screen flex-col bg-white lg:h-dvh lg:overflow-hidden">
    <header class="border-b border-[#e5e5e5] px-5 py-4">
      <div class="mx-auto flex w-full max-w-[90rem] items-center justify-between">
        <div>
          <p class="text-[13px] text-[#555555]">Prototype autonome · Spike technique</p>
          <h1 class="text-2xl font-bold">Agent d’exploration</h1>
        </div>
        <NuxtLink class="text-[13px] text-[#000091] underline" to="/">Retour</NuxtLink>
      </div>
    </header>

    <div class="mx-auto grid w-full max-w-[96rem] flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_36rem]">
      <section class="min-w-0 border-b border-[#777777] lg:min-h-0 lg:overflow-auto lg:border-b-0">
        <div class="border-b border-[#e5e5e5] px-5 py-4">
          <p class="text-[13px] font-bold">{{ dataset.activeResource.value?.title ?? "Ressources de test" }}</p>
          <p class="mt-1 text-[13px] text-[#555555]">
            {{ dataset.activeResource.value
              ? `${dataset.activeResource.value.organization} · Parquet`
              : "Sélectionnez une ressource issue de data.gouv.fr" }}
          </p>
        </div>

        <ExplorationResourcePicker
          v-if="dataset.status.value !== 'ready'"
          :error="dataset.error.value"
          :loading="dataset.status.value === 'loading'"
          :resources="explorationResources"
          :selected="selectedResource"
          @load="selectedResource && dataset.load(selectedResource)"
          @select="selectedResource = $event"
        />

        <div v-else class="min-w-0">
          <ExplorationDatasetExplorer
            :base-sql="dataset.activeView.value?.sql"
            :columns="explorerColumns"
            :row-count="dataset.activeView.value?.rowCount ?? dataset.schema.value?.rowCount ?? 0"
            :view-title="dataset.activeView.value?.title"
            @reset-view="dataset.resetExplorerView"
          />
        </div>
      </section>

      <aside class="chat-sidebar flex min-h-[44rem] flex-col border-l border-[#777777] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30)_0%,rgba(235,237,255,0.01)_100%)] shadow-[-4px_0_12px_rgba(0,0,0,0.05)] lg:h-full lg:min-h-0 lg:overflow-hidden">
        <ExplorationAgentPanelHeader v-model="panelMode" />
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
