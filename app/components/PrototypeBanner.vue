<template>
  <aside class="sticky top-0 z-[90] border-b border-[#cacafb] bg-[#ececfe] text-[#161616]" aria-label="Information sur le prototype">
    <div class="mx-auto flex min-h-9 w-full max-w-[90rem] items-center gap-2 px-4 py-2 text-[11px] leading-4 sm:px-6 sm:text-[12px]">
      <i aria-hidden="true" class="ri-flask-line shrink-0 text-[15px] leading-none text-[#000091]" />
      <p class="min-w-0 flex-1">
        <strong>Prototype de démonstration.</strong>
        Les réponses peuvent être incomplètes ou erronées et doivent être vérifiées avant réutilisation.
      </p>
      <NuxtLink class="hidden shrink-0 font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff] sm:inline" to="/documentation">
        En savoir plus
      </NuxtLink>
    </div>
  </aside>
</template>
