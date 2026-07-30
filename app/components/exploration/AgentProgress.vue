<script setup lang="ts">
export interface AgentProgressStep {
  label: string;
  status: "complete" | "active" | "pending" | "error";
}

defineProps<{
  steps: AgentProgressStep[];
}>();
</script>

<template>
  <section class="py-1" aria-label="Progression de l’analyse" role="status">
    <p class="mb-2 text-[11px] leading-[1.5] text-[#777]">Analyse en cours</p>
    <ol class="space-y-1.5">
      <li
        v-for="(step, index) in steps"
        :key="`${step.label}-${index}`"
        class="relative grid grid-cols-[10px_minmax(0,1fr)] gap-2"
      >
        <span class="relative flex justify-center" aria-hidden="true">
          <span
            class="mt-[5px] h-1.5 w-1.5 rounded-full"
            :class="step.status === 'error' ? 'bg-[#ce0500]' : 'bg-[#929292]'"
          />
          <span
            v-if="index < steps.length - 1"
            class="absolute left-1/2 top-[12px] h-[calc(100%+2px)] w-px -translate-x-1/2 bg-[#d6d6d6]"
          />
        </span>
        <p
          class="text-[11px] font-normal leading-[1.5]"
          :class="step.status === 'active'
            ? 't-shimmer'
            : step.status === 'error' ? 'text-[#ce0500]' : 'text-[#777]'"
          :data-text="step.status === 'active' ? step.label : undefined"
        >
          {{ step.label }}
        </p>
      </li>
    </ol>
  </section>
</template>
