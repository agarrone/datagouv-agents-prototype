<script setup lang="ts">
import type { FeedbackContext } from "~~/shared/types/feedback";

defineProps<{ context: FeedbackContext; answer: string }>();
const emit = defineEmits<{ dismiss: [] }>();
const dialogOpen = ref(false);
</script>

<template>
  <aside class="mt-3 rounded-md border border-[#c2d1ff] bg-[#e8edff] p-3 text-[12px] leading-5">
    <p class="font-medium">Que pensez-vous de l’assistant ?</p>
    <p class="mt-0.5 text-[#555555]">Après ces quelques questions, votre retour nous aiderait à améliorer son fonctionnement.</p>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button class="agent-focusable agent-pressable h-8 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white hover:bg-[#1212ff]" title="Ouvrir le formulaire de retour" type="button" @click="dialogOpen = true">Donner mon avis</button>
      <button class="agent-focusable h-8 px-2 text-[12px] text-[#000091] underline underline-offset-2" title="Masquer cette invitation" type="button" @click="emit('dismiss')">Non merci</button>
    </div>
  </aside>
  <ExplorationFeedbackDetailsDialog v-if="dialogOpen" :answer="answer" :context="context" origin="after_six_questions" @close="dialogOpen = false; emit('dismiss')" />
</template>
