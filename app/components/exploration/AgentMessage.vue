<script setup lang="ts">
import ExplorationAgentChart from "./AgentChart.client.vue";
import ExplorationAgentMap from "./AgentMap.client.vue";
import type { ExplorationMessage } from "~~/shared/types/exploration";

defineProps<{
  message: ExplorationMessage;
}>();

const emit = defineEmits<{
  applyProposal: [toolCallId: string, sql: string, title: string];
}>();

function partStateLabel(state: string) {
  if (state === "output-available") return "Terminé";
  if (state === "output-error") return "Erreur";
  if (state === "input-available") return "Exécution locale";
  return "Préparation";
}
</script>

<template>
  <article
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
          <span class="text-[#666]">{{ partStateLabel(part.state) }}</span>
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
        <p class="text-xs font-bold uppercase text-[#666]">Vue proposée</p>
        <template v-if="'input' in part && part.input">
          <p class="mt-2 font-bold">{{ part.input.title }}</p>
          <p class="mt-1 leading-6 text-[#666]">{{ part.input.reason }}</p>
          <pre
            class="mt-3 overflow-x-auto bg-[#f6f6f6] p-3 font-mono text-xs"
          ><code>{{ part.input.sql }}</code></pre>
          <button
            v-if="part.state === 'input-available'"
            class="mt-3 bg-[#000091] px-4 py-2 font-bold text-white"
            type="button"
            @click="emit(
              'applyProposal',
              part.toolCallId,
              part.input.sql,
              part.input.title,
            )"
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

      <div v-else-if="part.type === 'tool-create_chart'" class="mt-3">
        <div
          v-if="part.state === 'input-streaming' || part.state === 'input-available'"
          class="flex h-80 items-center justify-center border border-[#ddd] bg-white text-sm text-[#666]"
        >
          Préparation du graphique…
        </div>
        <ExplorationAgentChart
          v-else-if="part.state === 'output-available' && 'input' in part && part.input"
          :spec="part.input"
          :rows="part.output.rows"
          :truncated="part.output.truncated"
        />
        <p
          v-else-if="part.state === 'output-error'"
          class="border-l-4 border-[#e1000f] bg-white p-3 text-sm"
        >
          {{ part.errorText }}
        </p>
      </div>

      <div v-else-if="part.type === 'tool-create_map'" class="mt-3">
        <div
          v-if="part.state === 'input-streaming' || part.state === 'input-available'"
          class="flex h-80 items-center justify-center border border-[#ddd] bg-white text-sm text-[#666]"
        >
          Préparation de la carte…
        </div>
        <ExplorationAgentMap
          v-else-if="part.state === 'output-available' && 'input' in part && part.input"
          :spec="part.input"
          :rows="part.output.rows"
          :truncated="part.output.truncated"
        />
        <p
          v-else-if="part.state === 'output-error'"
          class="border-l-4 border-[#e1000f] bg-white p-3 text-sm"
        >
          {{ part.errorText }}
        </p>
      </div>
    </template>
  </article>
</template>
