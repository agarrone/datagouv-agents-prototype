<script setup lang="ts">
const props = defineProps<{
  title: string;
  state: string;
  sql?: string;
  error?: string;
}>();

const status = computed(() => {
  if (props.state === "output-available") return "Terminé";
  if (props.state === "output-error") return "Erreur";
  if (props.state === "input-available") return "Exécution locale";
  return "Préparation";
});

const statusClass = computed(() => {
  if (props.state === "output-available") return "bg-[#18753c]";
  if (props.state === "output-error") return "bg-[#e1000f]";
  return "agent-step-pulse bg-[#929292]";
});
</script>

<template>
  <div class="relative mt-3 pl-5 text-[13px] before:absolute before:bottom-0 before:left-[5px] before:top-0 before:w-px before:bg-[#c6c6c6]">
    <span
      aria-hidden="true"
      class="absolute left-0 top-[5px] h-[11px] w-[11px] rounded-full border-2 border-white"
      :class="statusClass"
    />
    <div class="flex min-h-5 items-start justify-between gap-3">
      <p class="leading-5">{{ title }}</p>
      <span class="shrink-0 text-[11px] leading-5" :class="state === 'output-error' ? 'text-[#e1000f]' : 'text-[#666]'">
        {{ status }}
      </span>
    </div>
    <ExplorationCodeBlock v-if="sql" :code="sql" collapsible :open="state !== 'output-available'" />
    <p v-if="error" class="mt-2 text-xs leading-5 text-[#e1000f]">{{ error }}</p>
  </div>
</template>

<style scoped>
@keyframes agent-step-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

.agent-step-pulse {
  animation: agent-step-pulse 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .agent-step-pulse { animation: none; }
}
</style>
