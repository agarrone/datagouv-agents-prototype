<script setup lang="ts">
import ExplorationAgentChart from "./AgentChart.client.vue";
import ExplorationAgentMap from "./AgentMap.client.vue";
import type { ExplorationMessage } from "~~/shared/types/exploration";

const props = defineProps<{
  message: ExplorationMessage;
}>();

const emit = defineEmits<{
  applyProposal: [toolCallId: string, sql: string, title: string];
}>();

const reasoningParts = computed(() => props.message.parts.filter(part =>
  part.type === "tool-inspect_schema"
  || part.type === "tool-get_dataset_metadata"
  || part.type === "tool-execute_sql",
));
const reasoningActive = computed(() => reasoningParts.value.some(part =>
  "state" in part
  && part.state !== "output-available"
  && part.state !== "output-error",
));

</script>

<template>
  <article
    :class="message.role === 'user' ? 'ml-auto max-w-[85%] rounded-xl bg-[#eee] px-3 py-2.5' : 'w-full'"
    class="text-[13px]"
    :data-message-role="message.role"
  >
    <template v-if="message.role === 'user'">
      <p
        v-for="(part, partIndex) in message.parts"
        v-show="part.type === 'text'"
        :key="`${message.id}-user-${partIndex}`"
        class="whitespace-pre-wrap leading-6"
      >
        {{ part.type === "text" ? part.text : "" }}
      </p>
    </template>

    <ExplorationReasoning
      v-else
      :active="reasoningActive"
      :count="reasoningParts.length"
    >
      <template
        v-for="(part, partIndex) in reasoningParts"
        :key="`${message.id}-reasoning-${partIndex}`"
      >
        <ExplorationAgentToolStep
          v-if="part.type === 'tool-inspect_schema'"
          title="Inspection du schéma"
          :state="part.state"
          :error="part.state === 'output-error' ? part.errorText : undefined"
        />
        <ExplorationAgentToolStep
          v-else-if="part.type === 'tool-get_dataset_metadata'"
          title="Métadonnées du jeu de données"
          :state="part.state"
          :error="part.state === 'output-error' ? part.errorText : undefined"
        />
        <ExplorationAgentToolStep
          v-else-if="part.type === 'tool-execute_sql'"
          title="Exécution SQL"
          :state="part.state"
          :sql="'input' in part ? part.input?.sql : undefined"
          :error="part.state === 'output-error' ? part.errorText : undefined"
        />
      </template>
    </ExplorationReasoning>

    <template v-if="message.role !== 'user'">
      <template
        v-for="(part, partIndex) in message.parts"
        :key="`${message.id}-${partIndex}`"
      >
      <p
        v-if="part.type === 'text'"
        class="whitespace-pre-wrap leading-6"
      >
        {{ part.text }}
      </p>

      <template v-else-if="part.type === 'tool-propose_explorer_view'">
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

      <div v-else-if="part.type === 'tool-create_chart'" class="mt-3">
        <ExplorationVisualizationLoading
          v-if="part.state === 'input-streaming' || part.state === 'input-available'"
          kind="graphique"
        />
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
        <ExplorationVisualizationLoading
          v-if="part.state === 'input-streaming' || part.state === 'input-available'"
          kind="carte"
        />
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
    </template>
  </article>
</template>
