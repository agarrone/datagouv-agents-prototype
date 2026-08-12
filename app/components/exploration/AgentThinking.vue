<template>
  <div class="flex items-start gap-3 py-1 text-[13px]" role="status" aria-live="polite">
    <span class="mt-0.5 flex h-6 min-w-10 shrink-0 items-center justify-center px-1 text-[12px] text-[#777777]">
      <ExplorationUnicodeSpinner name="dna" />
    </span>
    <div class="min-w-0">
      <p class="t-shimmer font-normal leading-5" data-text="Planification de la réponse…">
        Planification de la réponse…
      </p>
      <p class="mt-0.5 text-[12px] leading-5 text-[#777777]">
        Compréhension de la question et choix des opérations utiles
      </p>
    </div>
  </div>
</template>
