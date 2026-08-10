<script setup lang="ts">
import { explorationResources } from "~~/shared/data/exploration-resources";

useSeoMeta({
  title: "Tester l’assistant de données — Prototype data.gouv.fr",
  description: "Un prototype pour interroger et explorer des jeux de données en langage naturel.",
});
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <div class="mx-auto w-full max-w-[78rem] px-4 py-10 lg:px-6 lg:py-14">
      <section class="max-w-3xl pb-10">
        <div class="mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-[#000091]">
          <i aria-hidden="true" class="ri-flask-line text-xl leading-none" />
          Une expérimentation data.gouv.fr
        </div>
        <h1 class="text-3xl font-bold leading-[1.2] tracking-[-0.02em] sm:text-4xl lg:text-[44px]">
          Posez vos questions directement aux données
        </h1>
        <p class="mt-5 max-w-2xl text-[17px] leading-7 text-[#3a3a3a]">
          Ce prototype permet d’explorer un jeu de données en langage naturel. Choisissez une ressource, puis demandez à l’assistant de décrire ses colonnes, de rechercher une information ou de représenter les résultats.
        </p>
        <p class="mt-5 max-w-2xl text-[14px] leading-6 text-[#666]">
          Il s’agit d’un prototype : les réponses peuvent être incomplètes ou erronées. Votre retour nous aide à comprendre ce qui vous semble utile, confus ou manquant pendant le test.
        </p>
        <nav aria-label="Documentation du prototype" class="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/documentation">Lire la documentation</NuxtLink>
          <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/documentation/technique">Consulter la documentation technique</NuxtLink>
        </nav>
      </section>

      <HomeResourceSelector :resources="explorationResources" />
    </div>
  </main>
</template>
