<script setup lang="ts">
const props = defineProps<{ content: string }>();
const copied = ref(false);
const rating = ref<"useful" | "not-useful" | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copyResponse() {
  await navigator.clipboard.writeText(props.content);
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1800);
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
});
</script>

<template>
  <footer class="mt-2 flex h-7 items-center gap-0.5 text-[#666]">
    <button
      :aria-label="copied ? 'Réponse copiée' : 'Copier la réponse'"
      class="flex h-7 w-7 items-center justify-center hover:bg-[#eee] hover:text-[#161616]"
      :title="copied ? 'Copié' : 'Copier'"
      type="button"
      @click="copyResponse"
    >
      <span v-if="copied" aria-hidden="true">✓</span>
      <svg v-else aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <rect height="13" width="13" x="8" y="8" stroke="currentColor" stroke-width="1.6" />
        <path d="M16 8V3H3v13h5" stroke="currentColor" stroke-width="1.6" />
      </svg>
    </button>
    <span aria-hidden="true" class="mx-1 h-3 w-px bg-[#ddd]" />
    <button
      aria-label="Réponse utile"
      class="flex h-7 w-7 items-center justify-center hover:bg-[#eee]"
      :class="rating === 'useful' ? 'bg-[#e3fdeb] text-[#18753c]' : ''"
      title="Utile"
      type="button"
      @click="rating = rating === 'useful' ? null : 'useful'"
    >
      <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M7.5 20H4V9.5h3.5M7.5 20h8.1a2 2 0 0 0 1.94-1.5l1.75-7A2 2 0 0 0 17.35 9H14l.5-3.25A2.4 2.4 0 0 0 12.13 3L7.5 9.5V20Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" />
      </svg>
    </button>
    <button
      aria-label="Réponse inutile"
      class="flex h-7 w-7 rotate-180 items-center justify-center hover:bg-[#eee]"
      :class="rating === 'not-useful' ? 'bg-[#fef4f4] text-[#e1000f]' : ''"
      title="Inutile"
      type="button"
      @click="rating = rating === 'not-useful' ? null : 'not-useful'"
    >
      <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M7.5 20H4V9.5h3.5M7.5 20h8.1a2 2 0 0 0 1.94-1.5l1.75-7A2 2 0 0 0 17.35 9H14l.5-3.25A2.4 2.4 0 0 0 12.13 3L7.5 9.5V20Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" />
      </svg>
    </button>
    <span class="sr-only" aria-live="polite">{{ copied ? "Réponse copiée" : "" }}</span>
  </footer>
</template>
