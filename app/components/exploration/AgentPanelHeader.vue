<script setup lang="ts">
const mode = defineModel<"assistant" | "sql">({ default: "assistant" });
</script>

<template>
  <header class="shrink-0 bg-white">
    <div class="flex h-14 items-center gap-2 border-b border-[#e5e5e5] px-5">
      <i aria-hidden="true" class="ri-sparkling-line text-xl leading-none text-[#000091]" />
      <div>
        <h2 class="text-[13px] font-medium">Interroger ces données</h2>
        <p class="text-[12px] text-[#555555]">Assistant d’exploration</p>
      </div>
    </div>
    <nav
      aria-label="Modes d’interrogation"
      class="flex h-11 items-stretch gap-5 border-b border-[#e5e5e5] bg-white px-5"
      role="tablist"
    >
      <button
        :aria-selected="mode === 'assistant'"
        class="relative flex items-center gap-1.5 border-b-2 px-0.5 text-[12px] font-medium"
        :class="mode === 'assistant'
          ? 'border-[#000091] text-[#000091]'
          : 'border-transparent text-[#555555] hover:text-[#161616]'"
        role="tab"
        type="button"
        @click="mode = 'assistant'"
      >
        <i aria-hidden="true" class="ri-sparkling-line text-base leading-none" />
        Assistant
      </button>
      <button
        :aria-selected="mode === 'sql'"
        class="relative flex items-center gap-1.5 border-b-2 px-0.5 text-[12px] font-medium"
        :class="mode === 'sql'
          ? 'border-[#000091] text-[#000091]'
          : 'border-transparent text-[#555555] hover:text-[#161616]'"
        role="tab"
        type="button"
        @click="mode = 'sql'"
      >
        <i aria-hidden="true" class="ri-terminal-line text-base leading-none text-[#555555]" />
        Console SQL
      </button>
    </nav>
  </header>
</template>
