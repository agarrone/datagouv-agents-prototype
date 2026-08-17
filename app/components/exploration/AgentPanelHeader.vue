<script setup lang="ts">
const mode = defineModel<"assistant" | "sql">({ default: "assistant" });
withDefaults(defineProps<{
  closable?: boolean;
  title?: string;
  subtitle?: string;
  showSql?: boolean;
}>(), {
  closable: false,
  showSql: true,
  subtitle: "Assistant d’exploration",
  title: "Interroger ces données",
});
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <header class="shrink-0 bg-white">
    <div class="flex h-14 items-center gap-2 border-b border-[#e5e5e5] bg-[#f6f6f6] px-4">
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-[12px] font-bold">{{ title }}</h2>
        <p class="mt-0.5 truncate text-[11px] text-[#555555]">{{ subtitle }}</p>
      </div>
      <button v-if="closable" aria-label="Fermer le panneau" class="grid size-7 shrink-0 place-items-center rounded hover:bg-[#f6f6f6] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#000091]" type="button" @click="emit('close')">
        <i class="ri-close-line text-base text-[#555555]" />
      </button>
    </div>
    <nav
      aria-label="Modes d’interrogation"
      class="flex h-11 items-stretch gap-5 border-b border-[#e5e5e5] bg-white px-5"
      role="tablist"
    >
      <button
        :aria-selected="mode === 'assistant'"
        class="relative flex items-center gap-1.5 border-b-2 px-0.5 text-[12px] font-normal"
        :class="mode === 'assistant'
          ? 'border-[#000091] text-[#000091]'
          : 'border-transparent text-[#555555] hover:text-[#161616]'"
        role="tab"
        type="button"
        @click="mode = 'assistant'"
      >
        <i aria-hidden="true" class="ri-sparkling-line text-base leading-none" :class="mode === 'assistant' ? 'text-[#000091]' : 'text-[#555555]'" />
        Assistant
      </button>
      <button
        v-if="showSql"
        :aria-selected="mode === 'sql'"
        class="relative flex items-center gap-1.5 border-b-2 px-0.5 text-[12px] font-normal"
        :class="mode === 'sql'
          ? 'border-[#000091] text-[#000091]'
          : 'border-transparent text-[#555555] hover:text-[#161616]'"
        role="tab"
        type="button"
        @click="mode = 'sql'"
      >
        <i aria-hidden="true" class="ri-terminal-line text-base leading-none" :class="mode === 'sql' ? 'text-[#000091]' : 'text-[#555555]'" />
        Console SQL
      </button>
    </nav>
  </header>
</template>
