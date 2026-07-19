<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { ChatAddToolOutputFunction } from "ai";
import {
  explorationResources,
  type ExplorationResource,
} from "~~/shared/data/exploration-resources";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const input = ref("");
const dataset = useDatasetEngine();
const selectedResource = ref<ExplorationResource | null>(null);
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
            resourceName: "Version Parquet du jeu de données",
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
const tableRows = computed(() =>
  dataset.activeView.value?.rows ?? dataset.preview.value,
);

async function submit() {
  const text = input.value.trim();
  if (!text || dataset.status.value !== "ready" || isResponding.value) return;
  input.value = "";
  await sendMessage({ text });
}

async function applyExplorerProposal(
  toolCallId: string,
  sql: string,
  title: string,
) {
  try {
    const view = await dataset.applyExplorerView(sql, title);
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
</script>

<template>
  <main class="flex min-h-screen flex-col bg-white">
    <header class="border-b border-[#ddd] px-5 py-4">
      <div class="mx-auto flex w-full max-w-[90rem] items-center justify-between">
        <div>
          <p class="text-sm text-[#666]">Prototype autonome · Spike technique</p>
          <h1 class="text-xl font-bold md:text-2xl">Agent d’exploration</h1>
        </div>
        <NuxtLink class="text-sm text-[#000091] underline" to="/">Retour</NuxtLink>
      </div>
    </header>

    <div class="mx-auto grid w-full max-w-[90rem] flex-1 lg:grid-cols-[minmax(0,1fr)_32rem]">
      <section class="min-w-0 border-b border-[#aaa] lg:border-b-0">
        <div class="border-b border-[#ddd] px-5 py-4">
          <p class="text-sm font-bold">{{ dataset.activeResource.value?.title ?? "Ressources de test" }}</p>
          <p class="mt-1 text-sm text-[#666]">
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
          <ExplorationDatasetSummary
            :column-count="tableColumns.length"
            :row-count="dataset.activeView.value?.rowCount ?? dataset.schema.value?.rowCount ?? 0"
            :view-title="dataset.activeView.value?.title"
            @reset="dataset.resetExplorerView"
          />
          <ExplorationDatasetTable
            :columns="tableColumns"
            :rows="tableRows"
            :schema-columns="dataset.schema.value?.columns ?? []"
            :show-types="!dataset.activeView.value"
          />
        </div>
      </section>

      <aside class="chat-sidebar flex min-h-[44rem] flex-col border-l border-[#c6c6c6] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30)_0%,rgba(235,237,255,0.01)_100%)] shadow-[-4px_0_12px_rgba(0,0,0,0.06)]">
        <ExplorationAgentPanelHeader />
        <ExplorationConversationScroller
          :message-count="messages.length"
          :responding="isResponding"
        >
          <ExplorationAgentEmptyState
            v-if="messages.length === 0"
            class="min-h-full"
            :ready="dataset.status.value === 'ready'"
            @suggestion="input = $event"
          />
          <ExplorationAgentMessage
            v-for="message in messages"
            :key="message.id"
            :message="message"
            @apply-proposal="applyExplorerProposal"
          />
          <p v-if="chatError" class="border-l-4 border-[#e1000f] bg-white p-3 text-sm">{{ chatError.message }}</p>
        </ExplorationConversationScroller>
        <ExplorationAgentComposer
          v-model="input"
          :disabled="dataset.status.value !== 'ready'"
          :resource-organization="dataset.activeResource.value?.organization"
          :resource-title="dataset.activeResource.value?.title"
          :responding="isResponding"
          @stop="stop"
          @submit="submit"
        />
      </aside>
    </div>
  </main>
</template>
