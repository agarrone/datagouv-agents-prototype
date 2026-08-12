<script setup lang="ts">
import type { DatagouvDatasetPageMetadata } from "~~/shared/data/exploration-resources";

defineProps<{
  dataset?: DatagouvDatasetPageMetadata;
  error?: string;
  fallbackOrganization: string;
  fallbackTitle: string;
  loading?: boolean;
}>();

function formatDate(value: string | null | undefined) {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

</script>

<template>
  <section class="border-b border-[#e5e5e5] bg-white py-6 text-[#161616]">
    <div class="mx-auto w-full max-w-[90rem] px-4 sm:px-6">
      <NuxtLink class="inline-flex items-center gap-1 text-[12px] font-medium text-[#000091] underline underline-offset-4" to="/">
        <i aria-hidden="true" class="ri-arrow-left-line text-sm" />Choisir un autre jeu de données
      </NuxtLink>

      <div v-if="loading" class="mt-7 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <div class="space-y-4"><div class="h-8 w-2/3 animate-pulse rounded-md bg-[#eeeeee]" /><div class="h-4 w-full animate-pulse rounded-md bg-[#f6f6f6]" /><div class="h-4 w-5/6 animate-pulse rounded-md bg-[#f6f6f6]" /></div>
        <div class="space-y-3"><div class="h-12 animate-pulse rounded-md bg-[#f6f6f6]" /><div class="h-7 animate-pulse rounded-md bg-[#f6f6f6]" /><div class="h-7 animate-pulse rounded-md bg-[#f6f6f6]" /></div>
      </div>

      <div v-else class="mt-7 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)] lg:gap-12">
        <div class="min-w-0">
          <h1 class="text-[24px] font-bold leading-8 tracking-[-0.01em]">
            {{ dataset?.title ?? fallbackTitle }}
            <span v-if="dataset?.acronym" class="ml-1 text-[12px] tracking-normal">{{ dataset.acronym }}</span>
          </h1>
          <ExplorationDatasetDescription class="mt-5" :description="dataset?.description ?? error ?? 'Les informations détaillées de ce jeu de données ne sont pas disponibles.'" />
        </div>

        <aside class="space-y-4 text-[12px] leading-5">
          <section>
            <h2 class="font-bold">Producteur</h2>
            <div class="mt-1.5 flex items-center gap-2">
              <div class="grid size-11 shrink-0 place-items-center border border-[#e5e5e5] bg-white p-1.5">
                <img v-if="dataset?.organization.logo" :src="dataset.organization.logo" alt="" class="h-full w-full object-contain">
                <i v-else aria-hidden="true" class="ri-government-line text-lg text-[#000091]" />
              </div>
              <a v-if="dataset?.organization.page" class="min-w-0 font-medium text-[#000091] underline underline-offset-2" :href="dataset.organization.page" target="_blank" rel="noopener noreferrer">{{ dataset.organization.name }}</a>
              <span v-else class="font-medium">{{ dataset?.organization.name ?? fallbackOrganization }}</span>
            </div>
          </section>
          <section><h2 class="font-bold">Licence</h2><p class="mt-1 inline-block rounded-sm bg-[#f6f6f6] px-1.5 py-0.5 font-mono text-[11px] text-[#555555]">{{ dataset?.license ?? "Non renseignée" }}</p></section>
          <section><h2 class="font-bold">Dernière mise à jour</h2><p class="mt-1">{{ formatDate(dataset?.lastUpdate) }}</p></section>
          <a v-if="dataset?.page" class="inline-flex items-center gap-1 font-medium text-[#000091] underline underline-offset-2" :href="dataset.page" target="_blank" rel="noopener noreferrer">Voir sur data.gouv.fr<i aria-hidden="true" class="ri-external-link-line text-sm" /></a>
        </aside>
      </div>
    </div>
  </section>
</template>
