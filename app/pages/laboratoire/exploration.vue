<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const input = ref("");
const dataset = useDatasetEngine();

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
          <p class="text-sm font-bold">Ressource de test</p>
          <p class="mt-1 text-sm text-[#666]">
            Catalogue de jeux de données · Parquet local
          </p>
        </div>

        <div
          v-if="dataset.status.value !== 'ready'"
          class="flex min-h-[34rem] items-center justify-center p-6"
        >
          <div class="max-w-md text-center">
            <p class="text-2xl font-bold">Chargez la ressource pour commencer</p>
            <p class="mt-3 leading-7 text-[#666]">
              Le fichier Parquet sera chargé dans DuckDB-WASM et restera
              entièrement dans votre navigateur.
            </p>
            <button
              class="mt-6 bg-[#000091] px-5 py-3 font-bold text-white disabled:cursor-wait disabled:bg-[#929292]"
              :disabled="dataset.status.value === 'loading'"
              type="button"
              @click="dataset.load"
            >
              {{
                dataset.status.value === "loading"
                  ? "Chargement de la ressource…"
                  : "Charger la ressource"
              }}
            </button>
            <p
              v-if="dataset.error.value"
              class="mt-4 border-l-4 border-[#e1000f] bg-[#fef4f4] p-3 text-left text-sm"
            >
              {{ dataset.error.value }}
            </p>
          </div>
        </div>

        <div v-else class="min-w-0">
          <div
            class="flex flex-wrap gap-x-6 gap-y-2 border-b border-[#ddd] px-5 py-3 text-sm"
          >
            <span>
              <strong>{{ dataset.schema.value?.rowCount }}</strong> lignes
            </span>
            <span>
              <strong>{{ dataset.schema.value?.columns.length }}</strong>
              colonnes
            </span>
            <span class="text-[#18753c]">Exécution locale prête</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[58rem] border-collapse text-sm">
              <thead>
                <tr class="bg-[#f6f6f6] text-left">
                  <th
                    v-for="column in dataset.schema.value?.columns"
                    :key="column.name"
                    class="border-b border-r border-[#ddd] px-4 py-3 font-bold"
                  >
                    {{ column.name }}
                    <span class="ml-1 block font-normal text-[#666]">
                      {{ column.type }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in dataset.preview.value"
                  :key="rowIndex"
                >
                  <td
                    v-for="column in dataset.schema.value?.columns"
                    :key="column.name"
                    class="max-w-64 truncate border-b border-r border-[#ddd] px-4 py-3"
                  >
                    {{ row[column.name] }}
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
