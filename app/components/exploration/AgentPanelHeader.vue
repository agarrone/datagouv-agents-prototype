<template>
  <header class="shrink-0 bg-white">
    <div class="flex h-14 items-center gap-2 border-b border-[#c6c6c6] px-5">
      <span class="flex size-7 items-center justify-center rounded-md bg-[#f5f5fe] text-[#000091]" aria-hidden="true">
        <svg class="size-4" fill="none" viewBox="0 0 24 24">
          <path d="m12 2 .9 3.1A8 8 0 0 0 18.4 11l2.6 1-2.6 1a8 8 0 0 0-5.5 5.9L12 22l-.9-3.1A8 8 0 0 0 5.6 13L3 12l2.6-1a8 8 0 0 0 5.5-5.9L12 2Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" />
        </svg>
      </span>
      <div>
        <h2 class="text-[13px] font-medium">Interroger ces données</h2>
        <p class="text-[11px] text-[#666]">Assistant d’exploration</p>
      </div>
    </div>
    <nav aria-label="Modes de l’assistant" class="flex h-11 items-stretch border-b border-[#ddd] bg-white px-5">
      <button
        aria-current="page"
        class="relative flex items-center gap-2 px-1 text-[12px] font-medium text-[#000091] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#000091]"
        type="button"
      >
        <span aria-hidden="true" class="text-sm">✦</span>
        Assistant
      </button>
    </nav>
  </header>
</template>
