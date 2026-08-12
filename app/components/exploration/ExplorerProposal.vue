<script setup lang="ts">
defineProps<{
  title: string;
  reason: string;
  sql: string;
  state: string;
  error?: string;
  recovering?: boolean;
}>();

defineEmits<{ apply: [] }>();
</script>

<template>
  <section class="agent-surface mt-3 overflow-hidden text-[13px]">
    <div class="flex items-start gap-3 px-4 py-3.5">
      <i aria-hidden="true" class="ri-filter-line mt-0.5 shrink-0 text-xl leading-none text-[#000091]" />
      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Vue proposée</p>
        <h3 class="mt-1 font-semibold leading-5">{{ title }}</h3>
        <p class="mt-1 text-xs leading-5 text-[#555555]">{{ reason }}</p>
        <ExplorationCodeBlock class="mt-2" :code="sql" collapsible />
      </div>
    </div>
    <div v-if="state === 'input-available'" class="flex justify-end border-t border-[#e5e5e5] px-4 py-3">
      <button class="agent-focusable agent-pressable rounded-md bg-[#000091] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#1212ff]" type="button" @click="$emit('apply')">
        Appliquer au tableau
      </button>
    </div>
    <p v-else-if="state === 'output-available'" class="flex items-center gap-2 border-t border-[#b8fec9] bg-[#e3fdeb] px-4 py-3 text-xs text-[#18753c]">
      <i aria-hidden="true" class="ri-check-line text-base leading-none" />
      <span>Vue appliquée au tableau</span>
    </p>
    <p v-else-if="state === 'output-error' && recovering" class="flex items-center gap-2 border-t border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3 text-xs text-[#555555]">
      <ExplorationUnicodeSpinner name="dna" class="w-5 text-[#777777]" />
      Une correction est en cours de préparation
    </p>
    <p v-else-if="state === 'output-error'" class="border-t border-[#ffbdbd] bg-[#fef4f4] px-4 py-3 text-xs text-[#ce0500]">
      {{ error }}
    </p>
  </section>
</template>
