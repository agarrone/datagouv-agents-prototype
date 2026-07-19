<script setup lang="ts">
defineProps<{
  title: string;
  reason: string;
  sql: string;
  state: string;
  error?: string;
}>();

defineEmits<{ apply: [] }>();
</script>

<template>
  <section class="mt-3 overflow-hidden border border-[#c6c6c6] bg-white text-[13px]">
    <div class="px-4 py-3">
      <p class="text-[11px] font-medium uppercase tracking-wide text-[#666]">Vue proposée</p>
      <h3 class="mt-1 font-medium leading-5">{{ title }}</h3>
      <p class="mt-1 leading-5 text-[#666]">{{ reason }}</p>
      <ExplorationCodeBlock class="mt-2" :code="sql" collapsible />
    </div>
    <div v-if="state === 'input-available'" class="border-t border-[#e5e5e5] p-3">
      <button class="bg-[#000091] px-4 py-2 text-xs font-medium text-white hover:bg-[#1212ff]" type="button" @click="$emit('apply')">
        Appliquer au tableau
      </button>
    </div>
    <p v-else-if="state === 'output-available'" class="border-t border-[#e5e5e5] px-4 py-3 text-xs text-[#18753c]">
      Vue appliquée au tableau
    </p>
    <p v-else-if="state === 'output-error'" class="border-t border-[#e5e5e5] px-4 py-3 text-xs text-[#e1000f]">
      {{ error }}
    </p>
  </section>
</template>
