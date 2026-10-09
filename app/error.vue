<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
const isNotFound = computed(() => props.error.statusCode === 404);

useSeoMeta({
  title: () => isNotFound.value
    ? "Page introuvable — Prototype data.gouv.fr"
    : "Une erreur est survenue — Prototype data.gouv.fr",
});
</script>

<template>
  <div class="min-h-dvh bg-white text-[#161616]">
    <PrototypeBanner />
    <main class="mx-auto grid min-h-[calc(100dvh-2.25rem)] w-full max-w-[90rem] place-items-center px-4 py-12 sm:px-6">
      <section class="w-full max-w-xl border-l-2 border-[#000091] pl-5 sm:pl-7">
        <p class="text-[12px] font-medium uppercase tracking-[0.06em] text-[#555555]">
          Erreur {{ error.statusCode || 500 }}
        </p>
        <h1 class="mt-2 text-2xl font-bold leading-8 sm:text-[32px] sm:leading-10">
          {{ isNotFound ? "Cette page n’existe pas" : "Cette page n’est pas disponible" }}
        </h1>
        <p class="mt-3 max-w-md text-[14px] leading-6 text-[#555555]">
          {{ isNotFound
            ? "Le lien est peut-être incorrect ou la page a été déplacée."
            : "Une erreur inattendue empêche momentanément l’affichage de cette page." }}
        </p>
        <a class="agent-focusable agent-pressable mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white hover:bg-[#1212ff]" href="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-sm" />
          Revenir à l’accueil
        </a>
      </section>
    </main>
  </div>
</template>
