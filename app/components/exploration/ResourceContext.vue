<script setup lang="ts">
defineProps<{
  title: string;
  organization?: string;
  format?: string;
}>();

const open = ref(false);
</script>

<template>
  <div
    class="t-resource-context shrink-0 border-b border-[#e5e5e5] bg-white/80"
    :data-open="String(open)"
    aria-label="Ressources utilisées par l’assistant"
  >
    <button
      :aria-expanded="open"
      class="agent-focusable flex h-8 w-full items-center gap-1.5 px-2 text-left text-[11px] leading-4 text-[#666] transition-colors duration-150 hover:bg-black/[0.025] hover:text-[#161616]"
      type="button"
      @click="open = !open"
    >
      <i
        aria-hidden="true"
        class="ri-arrow-down-s-line text-sm leading-none transition-transform duration-200 ease-out"
        :class="open ? '' : '-rotate-90'"
      />
      <span>1 ressource utilisée</span>
    </button>
    <div class="resource-context-panel grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out" :class="open ? 'grid-rows-[1fr]' : ''">
      <div class="min-h-0 overflow-hidden">
        <div class="flex min-w-0 items-center gap-1.5 overflow-x-auto px-2 pb-2">
          <span class="inline-flex h-7 min-w-0 max-w-full shrink-0 cursor-default items-center gap-1.5 rounded border border-[#cacafb] bg-[#ececfe] px-2 text-[#000091]" :title="title">
            <i aria-hidden="true" class="ri-table-line shrink-0 text-sm leading-none" />
            <span class="max-w-64 truncate text-[12px] font-medium leading-4 max-sm:max-w-44">{{ title }}</span>
            <span class="shrink-0 border-l border-[#cacafb] pl-1.5 text-[10px] uppercase leading-4">{{ format ?? 'PARQUET' }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .resource-context-panel,
  button i {
    transition: none !important;
  }
}
</style>
