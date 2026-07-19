<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import {
  explorationResources,
  type ExplorationResource,
} from "~~/shared/data/exploration-resources";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const input = ref("");
const dataset = useDatasetEngine();
const selectedResource = ref<ExplorationResource | null>(null);

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
      if (!resource) {
        throw new Error("Aucune ressource n’est chargée.");
      }

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
          },
        },
      };
    },
  }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  async onToolCall({ toolCall }) {
    if (toolCall.dynamic) return;

    try {
      if (toolCall.toolName === "inspect_schema") {
        const output = await dataset.inspectSchema();
        addToolOutput({
          tool: "inspect_schema",
          toolCallId: toolCall.toolCallId,
          output,
        });
        return;
      }

      if (toolCall.toolName === "execute_sql") {
        const output = await dataset.executeSql(toolCall.input.sql);
        addToolOutput({
          tool: "execute_sql",
          toolCallId: toolCall.toolCallId,
          output,
        });
      }
    } catch (reason) {
      addToolOutput({
        state: "output-error",
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        errorText: reason instanceof Error
          ? reason.message
          : "Le tool n’a pas pu être exécuté.",
      });
    }
  },
});

const isResponding = computed(
  () => chatStatus.value === "submitted" || chatStatus.value === "streaming",
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

function partStateLabel(state: string) {
  if (state === "output-available") return "Terminé";
  if (state === "output-error") return "Erreur";
  if (state === "input-available") return "Exécution locale";
  return "Préparation";
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
        <NuxtLink class="text-sm text-[#000091] underline" to="/">
          Retour
        </NuxtLink>
      </div>
    </header>

    <div
      class="mx-auto grid w-full max-w-[90rem] flex-1 lg:grid-cols-[minmax(0,1fr)_28rem]"
    >
      <section class="min-w-0 border-b border-[#aaa] lg:border-b-0 lg:border-r">
        <div class="border-b border-[#ddd] px-5 py-4">
          <p class="text-sm font-bold">
            {{ dataset.activeResource.value?.title ?? "Ressources de test" }}
          </p>
          <p class="mt-1 text-sm text-[#666]">
            {{
              dataset.activeResource.value
                ? `${dataset.activeResource.value.organization} · Parquet`
                : "Sélectionnez une ressource issue de data.gouv.fr"
            }}
          </p>
        </div>

        <div
          v-if="dataset.status.value !== 'ready'"
          class="flex min-h-[34rem] items-center justify-center p-6 md:p-10"
        >
          <div class="w-full max-w-3xl">
            <div class="text-center">
              <p class="text-2xl font-bold">
                Choisissez une ressource pour commencer
              </p>
              <p class="mt-3 leading-7 text-[#666]">
                Ces ressources étaient utilisées dans le précédent prototype.
                Leur version Parquet sera interrogée directement dans votre
                navigateur.
              </p>
            </div>

            <div class="mt-6 grid gap-2">
              <button
                v-for="resource in explorationResources"
                :key="resource.id"
                :aria-pressed="selectedResource?.id === resource.id"
                class="flex w-full items-center justify-between gap-4 border bg-white px-4 py-3 text-left transition-colors"
                :class="
                  selectedResource?.id === resource.id
                    ? 'border-[#000091] bg-[#f5f5fe]'
                    : 'border-[#ddd] hover:border-[#8585f6]'
                "
                :disabled="dataset.status.value === 'loading'"
                type="button"
                @click="selectedResource = resource"
              >
                <span class="min-w-0">
                  <strong class="block text-sm">{{ resource.title }}</strong>
                  <span class="mt-1 block text-xs text-[#666]">
                    {{ resource.organization }}
                  </span>
                </span>
                <span
                  class="shrink-0 text-sm"
                  :class="
                    selectedResource?.id === resource.id
                      ? 'text-[#000091]'
                      : 'text-[#666]'
                  "
                >
                  {{ selectedResource?.id === resource.id ? "Sélectionnée" : "Choisir" }}
                </span>
              </button>
            </div>

            <p
              v-if="dataset.error.value"
              class="mt-4 border-l-4 border-[#e1000f] bg-[#fef4f4] p-3 text-left text-sm"
            >
              {{ dataset.error.value }}
            </p>

            <div class="mt-6 flex justify-end">
              <button
                class="bg-[#000091] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-[#929292]"
                :disabled="
                  dataset.status.value === 'loading' || !selectedResource
                "
                type="button"
                @click="selectedResource && dataset.load(selectedResource)"
              >
                {{
                  dataset.status.value === "loading"
                    ? "Chargement de la ressource…"
                    : "Charger la ressource"
                }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="min-w-0">
          <div
            class="flex flex-wrap gap-x-6 gap-y-2 border-b border-[#ddd] px-5 py-3 text-sm"
          >
            <span>
              <strong>
                {{
                  dataset.activeView.value?.rowCount
                    ?? dataset.schema.value?.rowCount
                }}
              </strong>
              lignes
            </span>
            <span>
              <strong>
                {{
                  dataset.activeView.value?.columns.length
                    ?? dataset.schema.value?.columns.length
                }}
              </strong>
              colonnes
            </span>
            <span
              v-if="dataset.activeView.value"
              class="font-medium text-[#000091]"
            >
              Vue : {{ dataset.activeView.value.title }}
            </span>
            <span v-else class="text-[#18753c]">Exécution locale prête</span>
            <button
              v-if="dataset.activeView.value"
              class="ml-auto text-[#000091] underline"
              type="button"
              @click="dataset.resetExplorerView"
            >
              Revenir aux données initiales
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[58rem] border-collapse text-sm">
              <thead>
                <tr class="bg-[#f6f6f6] text-left">
                  <th
                    v-for="column in (
                      dataset.activeView.value?.columns
                        ?? dataset.schema.value?.columns.map(item => item.name)
                        ?? []
                    )"
                    :key="column"
                    class="border-b border-r border-[#ddd] px-4 py-3 font-bold"
                  >
                    {{ column }}
                    <span
                      v-if="!dataset.activeView.value"
                      class="ml-1 block font-normal text-[#666]"
                    >
                      {{
                        dataset.schema.value?.columns.find(
                          item => item.name === column,
                        )?.type
                      }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in (
                    dataset.activeView.value?.rows ?? dataset.preview.value
                  )"
                  :key="rowIndex"
                >
                  <td
                    v-for="column in (
                      dataset.activeView.value?.columns
                        ?? dataset.schema.value?.columns.map(item => item.name)
                        ?? []
                    )"
                    :key="column"
                    class="max-w-64 truncate border-b border-r border-[#ddd] px-4 py-3"
                  >
                    {{ row[column] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <aside class="flex min-h-[44rem] flex-col bg-[#f8f8ff]">
        <div class="border-b border-[#aaa] bg-white px-5 py-4">
          <h2 class="font-bold">Interroger ces données</h2>
        </div>

        <div class="flex-1 space-y-5 overflow-y-auto p-5">
          <div
            v-if="messages.length === 0"
            class="flex min-h-full flex-col justify-center"
          >
            <p class="text-2xl font-bold">Assistant d’exploration</p>
            <p class="mt-2 leading-7 text-[#666]">
              Chargez la ressource, puis posez une question sur son contenu.
              L’assistant peut inspecter le schéma et exécuter du SQL localement.
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              <button
                v-for="suggestion in [
                  'Quelles sont les colonnes disponibles ?',
                  'Quelles organisations ont le plus de vues ?',
                  'Combien de jeux de données concernent l’environnement ?',
                ]"
                :key="suggestion"
                class="border border-[#aaa] bg-white px-3 py-2 text-left text-sm hover:border-[#000091]"
                :disabled="dataset.status.value !== 'ready'"
                type="button"
                @click="input = suggestion"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>

          <article
            v-for="message in messages"
            :key="message.id"
            :class="message.role === 'user' ? 'ml-8 bg-white' : 'mr-4'"
            class="border border-[#ddd] p-4"
          >
            <p class="mb-2 text-xs font-bold uppercase text-[#666]">
              {{ message.role === "user" ? "Vous" : "Assistant" }}
            </p>
            <template
              v-for="(part, partIndex) in message.parts"
              :key="`${message.id}-${partIndex}`"
            >
              <p
                v-if="part.type === 'text'"
                class="whitespace-pre-wrap leading-7"
              >
                {{ part.text }}
              </p>

              <div
                v-else-if="part.type === 'tool-inspect_schema'"
                class="mt-3 border-l-2 border-[#929292] pl-3 text-sm"
              >
                <p class="font-bold">Inspection du schéma</p>
                <p class="text-[#666]">{{ partStateLabel(part.state) }}</p>
              </div>

              <div
                v-else-if="part.type === 'tool-get_dataset_metadata'"
                class="mt-3 border-l-2 border-[#929292] pl-3 text-sm"
              >
                <p class="font-bold">Métadonnées du jeu de données</p>
                <p class="text-[#666]">{{ partStateLabel(part.state) }}</p>
              </div>

              <div
                v-else-if="part.type === 'tool-execute_sql'"
                class="mt-3 border-l-2 border-[#929292] pl-3 text-sm"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="font-bold">Exécution SQL</p>
                  <span class="text-[#666]">
                    {{ partStateLabel(part.state) }}
                  </span>
                </div>
                <pre
                  v-if="'input' in part && part.input?.sql"
                  class="mt-2 overflow-x-auto bg-white p-3 font-mono text-xs"
                ><code>{{ part.input.sql }}</code></pre>
              </div>

              <div
                v-else-if="part.type === 'tool-propose_explorer_view'"
                class="mt-3 border border-[#ddd] bg-white p-4 text-sm"
              >
                <p class="text-xs font-bold uppercase text-[#666]">
                  Vue proposée
                </p>
                <template v-if="'input' in part && part.input">
                  <p class="mt-2 font-bold">{{ part.input.title }}</p>
                  <p class="mt-1 leading-6 text-[#666]">
                    {{ part.input.reason }}
                  </p>
                  <pre
                    class="mt-3 overflow-x-auto bg-[#f6f6f6] p-3 font-mono text-xs"
                  ><code>{{ part.input.sql }}</code></pre>
                  <button
                    v-if="part.state === 'input-available'"
                    class="mt-3 bg-[#000091] px-4 py-2 font-bold text-white"
                    type="button"
                    @click="
                      applyExplorerProposal(
                        part.toolCallId,
                        part.input.sql,
                        part.input.title,
                      )
                    "
                  >
                    Appliquer au tableau
                  </button>
                  <p
                    v-else-if="part.state === 'output-available'"
                    class="mt-3 font-medium text-[#18753c]"
                  >
                    Vue appliquée au tableau
                  </p>
                  <p
                    v-else-if="part.state === 'output-error'"
                    class="mt-3 text-[#e1000f]"
                  >
                    {{ part.errorText }}
                  </p>
                </template>
              </div>
            </template>
          </article>

          <p v-if="chatError" class="border-l-4 border-[#e1000f] bg-white p-3">
            {{ chatError.message }}
          </p>
        </div>

        <form class="border-t border-[#aaa] bg-white p-4" @submit.prevent="submit">
          <textarea
            v-model="input"
            class="min-h-24 w-full resize-none border border-[#929292] p-3 outline-none focus:border-[#000091] focus:ring-1 focus:ring-[#000091]"
            :disabled="dataset.status.value !== 'ready'"
            :placeholder="
              dataset.status.value === 'ready'
                ? 'Posez une question sur cette ressource'
                : 'Chargez d’abord la ressource'
            "
            @keydown.meta.enter.prevent="submit"
            @keydown.ctrl.enter.prevent="submit"
          />
          <div class="mt-3 flex items-center justify-between gap-3">
            <p class="text-xs text-[#666]">
              DuckDB-WASM s’exécute dans le navigateur.
            </p>
            <button
              v-if="isResponding"
              class="border border-[#000091] px-4 py-2 font-bold text-[#000091]"
              type="button"
              @click="stop"
            >
              Arrêter
            </button>
            <button
              v-else
              class="bg-[#000091] px-4 py-2 font-bold text-white disabled:bg-[#929292]"
              :disabled="
                dataset.status.value !== 'ready' || input.trim().length === 0
              "
              type="submit"
            >
              Envoyer
            </button>
          </div>
        </form>
      </aside>
    </div>
  </main>
</template>
