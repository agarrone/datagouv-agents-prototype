<script setup lang="ts">
const mode = defineModel<"assistant" | "sql">({ default: "assistant" });
</script>

<template>
  <header class="shrink-0 bg-white">
    <div class="flex h-14 items-center gap-2 border-b border-[#c6c6c6] px-5">
      <span class="flex size-7 items-center justify-center rounded-md bg-[#f5f5fe] text-[#000091]" aria-hidden="true">
        <i class="ri-sparkling-line text-base leading-none" />
      </span>
      <div>
        <h2 class="text-[13px] font-medium">Interroger ces données</h2>
        <p class="text-[11px] text-[#666]">Assistant d’exploration</p>
      </div>
    </div>
    <nav
      aria-label="Modes d’interrogation"
      class="flex h-11 items-stretch gap-5 border-b border-[#ddd] bg-white px-5"
      role="tablist"
    >
      <button
        :aria-selected="mode === 'assistant'"
        class="relative flex items-center gap-1.5 border-b-2 px-0.5 text-[12px] font-medium"
        :class="mode === 'assistant'
          ? 'border-[#000091] text-[#000091]'
          : 'border-transparent text-[#666] hover:text-[#161616]'"
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
          : 'border-transparent text-[#666] hover:text-[#161616]'"
        role="tab"
        type="button"
        @click="mode = 'sql'"
      >
        <i aria-hidden="true" class="ri-terminal-line text-base leading-none text-[#666]" />
        Console SQL
      </button>
    </nav>
  </header>
</template>
