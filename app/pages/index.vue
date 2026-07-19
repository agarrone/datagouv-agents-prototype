<script setup lang="ts">
const principles = [
  "Streaming et tools typés avec AI SDK",
  "Données et SQL exécutés dans le navigateur",
  "Adaptateurs remplaçables pour les services data.gouv.fr",
  "Aucune écriture réelle depuis le prototype",
];
</script>

<template>
  <main class="mx-auto min-h-screen max-w-5xl px-6 py-16 md:px-10">
    <p class="mb-4 text-sm font-bold uppercase tracking-wide text-[#000091]">
      Laboratoire data.gouv.fr
    </p>
    <h1 class="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
      Prototype des agents de données
    </h1>
    <p class="mt-6 max-w-2xl text-lg leading-8 text-[#666]">
      Un socle Vue autonome pour expérimenter l’exploration et l’aide à la
      publication, pensé pour être portable vers data.gouv.fr sans dépendre de
      son code interne.
    </p>

    <section class="mt-12 border border-[#ddd] bg-white p-6 md:p-8">
      <h2 class="text-2xl font-bold">Principes d’architecture</h2>
      <ul class="mt-5 grid gap-3 md:grid-cols-2">
        <li
          v-for="principle in principles"
          :key="principle"
          class="border-l-2 border-[#000091] pl-4 leading-7"
        >
          {{ principle }}
        </li>
      </ul>
    </section>

    <NuxtLink
      to="/laboratoire/exploration"
      class="mt-8 inline-flex bg-[#000091] px-5 py-3 font-bold text-white hover:bg-[#1212ff]"
    >
      Ouvrir le laboratoire
    </NuxtLink>
  </main>
</template>

