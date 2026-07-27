<script setup lang="ts">
interface FeedbackContext {
  question: string;
  resource: string;
  dataset: string;
  resourceName: string;
  model: string;
}

const props = defineProps<{
  content: string;
  feedbackContext?: FeedbackContext;
}>();
const copied = ref(false);
const rating = ref<"useful" | "not-useful" | null>(null);
const feedbackStatus = ref<"idle" | "sending" | "sent" | "error">("idle");
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copyResponse() {
  await navigator.clipboard.writeText(props.content);
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1800);
}

async function sendFeedback(nextRating: "useful" | "not-useful") {
  if (feedbackStatus.value === "sending" || feedbackStatus.value === "sent") return;

  // Les spécimens de la page design restent interactifs sans envoyer de donnée.
  if (!props.feedbackContext) {
    rating.value = nextRating;
    feedbackStatus.value = "sent";
    return;
  }

  rating.value = nextRating;
  feedbackStatus.value = "sending";

  try {
    await $fetch("/nuxt-api/feedback", {
      method: "POST",
      body: {
        rating: nextRating === "useful" ? "Utile" : "Inutile",
        question: props.feedbackContext.question,
        answer: props.content,
        resource: props.feedbackContext.resource,
        dataset: props.feedbackContext.dataset,
        resourceName: props.feedbackContext.resourceName,
        model: props.feedbackContext.model,
        createdAt: new Date().toISOString(),
      },
    });
    feedbackStatus.value = "sent";
  } catch {
    feedbackStatus.value = "error";
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
});
</script>

<template>
  <footer class="mt-2 flex min-h-10 flex-wrap items-center gap-0.5 text-[#666]">
    <button
      :aria-label="copied ? 'Réponse copiée' : 'Copier la réponse'"
      class="agent-focusable agent-pressable flex h-10 w-10 items-center justify-center rounded hover:bg-[#eee] hover:text-[#161616]"
      :title="copied ? 'Copié' : 'Copier'"
      type="button"
      @click="copyResponse"
    >
      <span class="t-icon-swap h-4 w-4" :data-state="copied ? 'copied' : 'copy'" aria-hidden="true">
        <i
          class="t-icon ri-check-line text-base leading-none"
          data-icon="copied"
        />
        <i
          class="t-icon ri-file-copy-line text-base leading-none"
          data-icon="copy"
        />
      </span>
    </button>
    <span aria-hidden="true" class="mx-1 h-3 w-px bg-[#ddd]" />
    <button
      aria-label="Réponse utile"
      :aria-pressed="rating === 'useful'"
      :disabled="feedbackStatus === 'sending' || feedbackStatus === 'sent'"
      class="agent-focusable agent-pressable flex h-10 w-10 items-center justify-center rounded hover:bg-[#eee]"
      :class="rating === 'useful' ? 'bg-[#e3fdeb] text-[#18753c]' : ''"
      title="Utile"
      type="button"
      @click="sendFeedback('useful')"
    >
      <i aria-hidden="true" class="ri-thumb-up-line text-base leading-none" />
    </button>
    <button
      aria-label="Réponse inutile"
      :aria-pressed="rating === 'not-useful'"
      :disabled="feedbackStatus === 'sending' || feedbackStatus === 'sent'"
      class="agent-focusable agent-pressable flex h-10 w-10 items-center justify-center rounded hover:bg-[#eee]"
      :class="rating === 'not-useful' ? 'bg-[#fef4f4] text-[#e1000f]' : ''"
      title="Inutile"
      type="button"
      @click="sendFeedback('not-useful')"
    >
      <i aria-hidden="true" class="ri-thumb-down-line text-base leading-none" />
    </button>
    <span
      v-if="feedbackStatus === 'sending'"
      class="ml-2 text-xs text-[#666]"
    >Envoi…</span>
    <span
      v-else-if="feedbackStatus === 'sent'"
      class="ml-2 text-xs text-[#18753c]"
    >Merci pour votre retour.</span>
    <button
      v-else-if="feedbackStatus === 'error'"
      class="agent-focusable ml-2 text-xs text-[#ce0500] underline underline-offset-2"
      type="button"
      @click="rating && sendFeedback(rating)"
    >Échec de l’envoi · Réessayer</button>
    <span class="sr-only" aria-live="polite">
      {{ copied ? "Réponse copiée" : feedbackStatus === "sent" ? "Retour envoyé" : "" }}
    </span>
  </footer>
</template>

<style scoped>
.t-icon-swap {
  position: relative;
  display: inline-grid;
}

.t-icon-swap .t-icon {
  grid-area: 1 / 1;
  transition:
    opacity var(--icon-swap-dur) var(--icon-swap-ease),
    filter var(--icon-swap-dur) var(--icon-swap-ease),
    transform var(--icon-swap-dur) var(--icon-swap-ease);
  will-change: opacity, filter, transform;
}

.t-icon-swap[data-state="copy"] .t-icon[data-icon="copy"],
.t-icon-swap[data-state="copied"] .t-icon[data-icon="copied"] {
  opacity: 1;
  filter: blur(0);
  transform: scale(1);
}

.t-icon-swap[data-state="copy"] .t-icon[data-icon="copied"],
.t-icon-swap[data-state="copied"] .t-icon[data-icon="copy"] {
  opacity: 0;
  filter: blur(var(--icon-swap-blur));
  transform: scale(var(--icon-swap-start-scale));
}

@media (prefers-reduced-motion: reduce) {
  .t-icon-swap .t-icon { transition: none !important; }
}
</style>
