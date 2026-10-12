<script setup lang="ts">
import type { FeedbackContext } from "~~/shared/types/feedback";

const props = defineProps<{
  context: FeedbackContext;
  answer: string;
  rating: "useful" | "not-useful";
}>();
const emit = defineEmits<{ close: []; sent: [] }>();

const comment = ref("");
const status = ref<"idle" | "sending" | "sent" | "error">("idle");

async function submitFeedback(withComment: boolean) {
  if (withComment && !comment.value.trim()) return;
  if (status.value === "sending") return;
  status.value = "sending";
  try {
    await $fetch("/nuxt-api/feedback", {
      method: "POST",
      body: {
        rating: props.rating === "useful" ? "Utile" : "Inutile",
        question: props.context.question,
        answer: props.answer,
        comment: withComment ? comment.value : "",
        resource: props.context.resource,
        dataset: props.context.dataset,
        datasetName: props.context.datasetName,
        datasetUrl: props.context.datasetUrl,
        resourceName: props.context.resourceName,
        model: props.context.model,
        origin: "response_feedback",
        createdAt: new Date().toISOString(),
      },
    });
    status.value = "sent";
    emit("sent");
  } catch {
    status.value = "error";
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[180] grid place-items-center bg-[#161616]/40 p-3 backdrop-blur-[1px] sm:p-6" role="presentation" @mousedown.self="emit('close')">
      <section class="w-full max-w-[560px] overflow-hidden rounded-md border border-[#e5e5e5] border-t-4 border-t-[#000091] bg-white shadow-[0_16px_48px_rgba(0,0,18,0.22)]" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" aria-describedby="feedback-dialog-description">
        <header class="flex items-start justify-between gap-5 border-b border-[#e5e5e5] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p class="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Votre avis</p>
            <h2 id="feedback-dialog-title" class="text-[18px] font-semibold leading-6">{{ rating === "useful" ? "Cette réponse vous a été utile" : "Cette réponse ne vous a pas été utile" }}</h2>
            <p id="feedback-dialog-description" class="mt-1 text-[13px] leading-5 text-[#555555]">Vous pouvez préciser votre retour ou l’envoyer sans commentaire.</p>
            <p class="mt-2 text-[11px] leading-4 text-[#777777]">La note, le commentaire éventuel et le contexte de cette réponse seront enregistrés ensemble.</p>
          </div>
          <button class="agent-focusable agent-pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[#f6f6f6]" aria-label="Fermer le formulaire de retour" title="Fermer" type="button" @click="emit('close')">
            <i aria-hidden="true" class="ri-close-line text-xl" />
          </button>
        </header>
        <form class="p-4 sm:p-6" @submit.prevent="submitFeedback(true)">
          <label class="mb-2 block text-[13px] font-medium" for="feedback-comment">Commentaire facultatif</label>
          <textarea id="feedback-comment" v-model="comment" class="agent-focusable min-h-32 w-full resize-y rounded-sm border border-[#929292] bg-white px-3 py-2 text-[14px] leading-5" maxlength="5000" placeholder="Décrivez votre expérience…" :disabled="status === 'sending' || status === 'sent'" />
          <p v-if="status === 'error'" class="mt-2 text-[12px] text-[#ce0500]">Le commentaire n’a pas pu être enregistré. Vous pouvez réessayer.</p>
          <p v-else-if="status === 'sent'" class="mt-2 text-[12px] text-[#18753c]">Merci, votre retour a été enregistré.</p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="agent-focusable h-9 px-3 text-[13px] text-[#000091] underline underline-offset-2" type="button" @click="emit('close')">{{ status === "sent" ? "Fermer" : "Annuler" }}</button>
            <button v-if="status !== 'sent'" class="agent-focusable h-9 px-3 text-[13px] text-[#000091] underline underline-offset-2 disabled:opacity-50" type="button" :disabled="status === 'sending'" @click="submitFeedback(false)">Envoyer sans commentaire</button>
            <button v-if="status !== 'sent'" class="agent-focusable agent-pressable h-9 rounded-sm bg-[#000091] px-4 text-[13px] font-medium text-white hover:bg-[#1212ff] disabled:cursor-not-allowed disabled:opacity-50" type="submit" :disabled="!comment.trim() || status === 'sending'">{{ status === "sending" ? "Envoi…" : "Envoyer avec le commentaire" }}</button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
