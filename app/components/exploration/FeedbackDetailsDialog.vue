<script setup lang="ts">
import type { FeedbackContext, FeedbackOrigin } from "~~/shared/types/feedback";

const props = defineProps<{
  context: FeedbackContext;
  answer: string;
  rating?: "useful" | "not-useful" | null;
  origin: FeedbackOrigin;
}>();

const emit = defineEmits<{ close: [] }>();
const formBaseUrl = "https://grist.numerique.gouv.fr/o/datagouv/forms/iMKAxQa486jfLdQ5AJEyHj/8";
const formUrl = computed(() => {
  const url = new URL(formBaseUrl);
  const originLabel = props.origin === "after_six_questions"
    ? "Invitation après 6 questions"
    : "Feedback sur une réponse";
  if (props.rating) url.searchParams.set("Rating", props.rating === "useful" ? "Utile" : "Inutile");
  const questionPrefix = props.origin === "after_six_questions" ? `[${originLabel}]\n` : "";
  url.searchParams.set("Question", `${questionPrefix}${props.context.question}`.slice(0, 2_000));
  url.searchParams.set("Answer", props.answer.slice(0, 5_000));
  url.searchParams.set("Resource", props.context.resource);
  url.searchParams.set("Dataset", props.context.dataset);
  url.searchParams.set("Ressource_name", props.context.resourceName);
  url.searchParams.set("Model", props.context.model);
  url.searchParams.set("CreatedAt", new Date().toISOString());
  return url.toString();
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[180] grid place-items-center bg-[#161616]/40 p-3 backdrop-blur-[1px] sm:p-6" role="presentation" @mousedown.self="emit('close')">
      <section class="flex h-[calc(100dvh-24px)] w-full max-w-[720px] flex-col overflow-hidden rounded-md border border-[#e5e5e5] border-t-4 border-t-[#000091] bg-white shadow-[0_16px_48px_rgba(0,0,18,0.22)] sm:h-[min(760px,calc(100dvh-48px))]" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" aria-describedby="feedback-dialog-description">
        <header class="flex items-start justify-between gap-5 border-b border-[#e5e5e5] px-4 py-4 sm:px-6 sm:py-5">
          <div class="max-w-[580px]">
            <p class="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Votre avis</p>
            <h2 id="feedback-dialog-title" class="text-[18px] font-semibold leading-6">Ajouter un commentaire</h2>
            <p id="feedback-dialog-description" class="mt-1 text-[13px] leading-5 text-[#555555]">Précisez ce qui vous a été utile, ce qui vous a manqué ou ce qui pourrait être amélioré.</p>
            <p class="mt-2 text-[11px] leading-4 text-[#777777]">La question, la réponse et la ressource sont jointes pour fournir le contexte. Aucune identité n’est demandée.</p>
          </div>
          <button class="agent-focusable agent-pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[#f6f6f6]" aria-label="Fermer le formulaire de retour" title="Fermer" type="button" @click="emit('close')">
            <i aria-hidden="true" class="ri-close-line text-xl" />
          </button>
        </header>
        <div class="min-h-0 flex-1 bg-[#f6f6f6] p-2 sm:p-3">
          <iframe :src="formUrl" class="h-full min-h-0 w-full border border-[#e5e5e5] bg-white" loading="lazy" title="Formulaire de retour sur l’assistant" />
        </div>
      </section>
    </div>
  </Teleport>
</template>
