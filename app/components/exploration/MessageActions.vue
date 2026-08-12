<script setup lang="ts">
import type { FeedbackContext } from "~~/shared/types/feedback";

const props = defineProps<{
  content: string;
  feedbackContext?: FeedbackContext;
}>();
const copied = ref(false);
const rating = ref<"useful" | "not-useful" | null>(null);
const feedbackStatus = ref<"idle" | "sending" | "sent" | "error">("idle");
const detailsOpen = ref(false);
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
        datasetName: props.feedbackContext.datasetName,
        datasetUrl: props.feedbackContext.datasetUrl,
        resourceName: props.feedbackContext.resourceName,
        model: props.feedbackContext.model,
        origin: "response_feedback",
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
  <footer class="mt-2 flex min-h-6 flex-wrap items-center gap-1 text-[#555555]">
    <button
      :aria-label="copied ? 'Réponse copiée' : 'Copier la réponse'"
      class="agent-focusable agent-pressable flex h-6 w-6 items-center justify-center rounded-md hover:bg-[#f6f6f6] hover:text-[#000091]"
      type="button"
      @click="copyResponse"
    >
      <span class="t-icon-swap h-4 w-4" :data-state="copied ? 'copied' : 'copy'" aria-hidden="true">
        <i
          class="t-icon ri-check-line text-sm leading-none"
          data-icon="copied"
        />
        <i
          class="t-icon ri-file-copy-line text-sm leading-none"
          data-icon="copy"
        />
      </span>
      <span role="tooltip" class="action-tooltip action-tooltip-start">{{ copied ? "Réponse copiée" : "Copier la réponse" }}</span>
    </button>
    <span aria-hidden="true" class="mx-1 h-3 w-px bg-[#e5e5e5]" />
    <button
      aria-label="Réponse utile"
      :aria-pressed="rating === 'useful'"
      :disabled="feedbackStatus === 'sending'"
      class="agent-focusable agent-pressable flex h-6 w-6 items-center justify-center rounded-md hover:bg-[#f6f6f6] hover:text-[#000091]"
      :class="rating === 'useful' ? 'bg-[#e3fdeb] text-[#18753c]' : ''"
      type="button"
      @click="sendFeedback('useful')"
    >
      <i aria-hidden="true" class="ri-thumb-up-line text-sm leading-none" />
      <span role="tooltip" class="action-tooltip action-tooltip-start">Marquer comme utile. La question, la réponse et la ressource seront envoyées.</span>
    </button>
    <button
      aria-label="Réponse inutile"
      :aria-pressed="rating === 'not-useful'"
      :disabled="feedbackStatus === 'sending'"
      class="agent-focusable agent-pressable flex h-6 w-6 items-center justify-center rounded-md hover:bg-[#f6f6f6] hover:text-[#000091]"
      :class="rating === 'not-useful' ? 'bg-[#fef4f4] text-[#ce0500]' : ''"
      type="button"
      @click="sendFeedback('not-useful')"
    >
      <i aria-hidden="true" class="ri-thumb-down-line text-sm leading-none" />
      <span role="tooltip" class="action-tooltip action-tooltip-start">Marquer comme inutile. La question, la réponse et la ressource seront envoyées.</span>
    </button>
    <span
      v-if="feedbackStatus === 'sending'"
      class="ml-2 text-[11px] text-[#555555]"
    >Envoi…</span>
    <span
      v-else-if="feedbackStatus === 'sent'"
      class="ml-2 text-[11px] text-[#18753c]"
    >Merci pour votre retour.</span>
    <button
      v-if="feedbackStatus === 'sent' && feedbackContext"
      class="agent-focusable relative ml-1 text-[11px] font-medium text-[#000091] underline underline-offset-2"
      type="button"
      @click="detailsOpen = true"
    >
      Ajouter un commentaire
      <span role="tooltip" class="action-tooltip action-tooltip-wide action-tooltip-end">Ouvrir le formulaire Grist prérempli avec le contexte de cette réponse.</span>
    </button>
    <button
      v-else-if="feedbackStatus === 'error'"
      class="agent-focusable ml-2 text-[11px] text-[#ce0500] underline underline-offset-2"
      type="button"
      @click="rating && sendFeedback(rating)"
    >Échec de l’envoi · Réessayer</button>
    <span class="sr-only" aria-live="polite">
      {{ copied ? "Réponse copiée" : feedbackStatus === "sent" ? "Retour envoyé" : "" }}
    </span>
  </footer>
  <ExplorationFeedbackDetailsDialog
    v-if="detailsOpen && feedbackContext"
    :answer="content"
    :context="feedbackContext"
    origin="response_feedback"
    :rating="rating"
    @close="detailsOpen = false"
  />
</template>

<style scoped>
.action-tooltip {
  position: absolute;
  z-index: 80;
  bottom: calc(100% + 6px);
  left: 50%;
  width: max-content;
  max-width: 280px;
  padding: 6px 8px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
  color: #555555;
  font-size: 11px;
  font-weight: 400;
  line-height: 16px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 2px);
  transition: opacity 120ms ease, transform 120ms ease;
}

button { position: relative; }
button:hover > .action-tooltip,
button:focus-visible > .action-tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.action-tooltip-wide { width: 240px; }

.action-tooltip-start {
  left: 0;
  transform: translateY(2px);
}

.action-tooltip-end {
  right: 0;
  left: auto;
  transform: translateY(2px);
}

button:hover > .action-tooltip-start,
button:focus-visible > .action-tooltip-start,
button:hover > .action-tooltip-end,
button:focus-visible > .action-tooltip-end {
  transform: translateY(0);
}

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
