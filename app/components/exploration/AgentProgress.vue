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
  <section class="py-1" aria-label="Progression de l’analyse" role="status" aria-live="polite">
    <div class="mb-2 flex items-center gap-1.5 text-[11px] leading-4 text-[#555555]">
      <ExplorationUnicodeSpinner name="dna" class="w-5 text-[#777777]" />
      <span>Analyse en cours</span>
    </div>
    <ol class="space-y-1">
      <li
        v-for="(step, index) in steps"
        :key="`${step.label}-${index}`"
        class="relative grid min-h-5 grid-cols-[14px_minmax(0,1fr)] gap-2"
      >
        <span class="relative flex justify-center" aria-hidden="true">
          <i
            v-if="step.status === 'complete'"
            class="ri-check-line mt-[2px] text-sm leading-4 text-[#777777]"
          />
          <span v-else class="mt-[6px] h-1.5 w-1.5 rounded-full" :class="step.status === 'error' ? 'bg-[#ce0500]' : 'bg-[#777777]'" />
          <span
            v-if="index < steps.length - 1"
            class="absolute left-1/2 top-[14px] h-[calc(100%+1px)] w-px -translate-x-1/2 bg-[#e5e5e5]"
          />
        </span>
        <p
          class="text-[11px] font-normal leading-5"
          :class="step.status === 'active'
            ? 't-shimmer'
            : step.status === 'error' ? 'text-[#ce0500]' : 'text-[#777777]'"
          :data-text="step.status === 'active' ? step.label : undefined"
        >
          {{ step.label }}
        </p>
      </li>
    </ol>
  </section>
</template>
