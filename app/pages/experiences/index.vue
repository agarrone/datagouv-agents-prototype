<script setup lang="ts">
type Experience = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

definePageMeta({
  alias: ["/experience", "/expérience"],
});

useSeoMeta({
  title: "Expérimentations — Prototype data.gouv.fr",
  description: "Découvrez les concepts explorés autour des données, des visualisations et de leur publication.",
  robots: "noindex, nofollow",
});

const experiences: Experience[] = [
  {
    title: "Création de visualisation assistée",
    description: "Créer et éditer un graphique à partir d’une ressource, par formulaire, en SQL ou avec l’assistant.",
    href: "/experiences/creation-visualisation-assistee",
    icon: "ri-bar-chart-box-line",
  },
  {
    title: "Personnalisation des visualisations",
    description: "Explorer différentes manières de configurer l’apparence des graphiques et des cartes produits à partir d’un jeu de données.",
    href: "/experiences/personnalisation-visualisations",
    icon: "ri-palette-line",
  },
  {
    title: "Publication assistée",
    description: "Tester un parcours de publication dans lequel un assistant analyse une ressource et accompagne la rédaction des métadonnées.",
    href: "/experiences/publication-assistee",
    icon: "ri-file-upload-line",
  },
  {
    title: "Composition de tableaux de bord",
    description: "Imaginer un espace éditorial pour assembler des textes, des graphiques et des cartes, avec une configuration manuelle ou assistée.",
    href: "/experiences/tableau-de-bord-visualisations",
    icon: "ri-layout-grid-line",
  },
];
</script>

<template>
  <main class="min-h-dvh bg-[#f6f6f6] text-[#161616]">
    <header class="border-b border-[#e5e5e5] bg-white">
      <div class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
        <NuxtLink class="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#000091] underline underline-offset-4 hover:text-[#1212ff]" to="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-[16px]" />
          Retour à l’accueil
        </NuxtLink>
        <div class="mt-8 max-w-3xl">
          <h1 class="text-3xl font-bold leading-[1.2] tracking-[-0.02em] sm:text-4xl lg:text-[44px]">
            Expérimentations
          </h1>
          <p class="mt-5 max-w-2xl text-[17px] leading-7 text-[#555555]">
            Des concepts interactifs pour explorer de nouveaux usages autour de la donnée. Ces expériences sont en cours de conception et peuvent être incomplètes ou instables.
          </p>
        </div>
      </div>
    </header>

    <section aria-labelledby="experiences-heading" class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
      <h2 id="experiences-heading" class="sr-only">Expérimentations disponibles</h2>
      <div class="divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
        <NuxtLink
          v-for="experience in experiences"
          :key="experience.href"
          :to="experience.href"
          class="group flex items-start gap-4 bg-white px-4 py-6 transition-colors hover:bg-[#f5f5fe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000091] sm:items-center sm:px-5"
        >
          <span class="inline-flex size-9 shrink-0 items-center justify-center text-[#000091]">
            <i aria-hidden="true" :class="experience.icon" class="text-[21px]" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 class="text-[17px] font-bold leading-6 group-hover:text-[#000091]">{{ experience.title }}</h3>
              <span class="text-[11px] font-medium text-[#716043]">En cours</span>
            </div>
            <p class="mt-1 max-w-3xl text-[13px] leading-5 text-[#555555]">{{ experience.description }}</p>
          </div>
          <i aria-hidden="true" class="ri-arrow-right-line mt-1 shrink-0 text-[18px] text-[#000091] transition-transform duration-200 group-hover:translate-x-1 sm:mt-0" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
