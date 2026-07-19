<script setup lang="ts">
import type { AgentCapability } from "~~/shared/types/agents";

const capabilities: AgentCapability[] = [
  {
    id: "inspect-schema",
    label: "Inspecter le schéma",
    execution: "browser",
    effect: "read",
  },
  {
    id: "execute-sql",
    label: "Exécuter une requête SQL",
    execution: "browser",
    effect: "read",
  },
  {
    id: "propose-view",
    label: "Proposer une vue du tableau",
    execution: "interface",
    effect: "proposal",
  },
];
</script>

<template>
  <main class="min-h-screen bg-white">
    <header class="border-b border-[#ddd] px-6 py-5">
      <div class="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <p class="text-sm text-[#666]">Prototype autonome</p>
          <h1 class="text-2xl font-bold">Agent d’exploration</h1>
        </div>
        <NuxtLink class="text-[#000091] underline" to="/">
          Retour
        </NuxtLink>
      </div>
    </header>

    <div class="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_24rem]">
      <section class="min-h-[32rem] border border-[#ddd] bg-[#f6f6f6] p-6">
        <p class="text-sm font-bold uppercase text-[#666]">Explorateur</p>
        <h2 class="mt-2 text-2xl font-bold">Aucune ressource chargée</h2>
        <p class="mt-3 max-w-xl leading-7 text-[#666]">
          Le prochain jalon branchera ici une ressource Parquet fixe et
          DuckDB-WASM. Aucun appel aux services internes de data.gouv.fr n’est
          nécessaire.
        </p>
      </section>

      <aside class="border border-[#aaa]">
        <div class="border-b border-[#ddd] px-5 py-4">
          <h2 class="font-bold">Interroger ces données</h2>
        </div>
        <div class="p-5">
          <p class="text-sm text-[#666]">Capacités prévues</p>
          <ul class="mt-4 space-y-3">
            <li v-for="capability in capabilities" :key="capability.id">
              <p class="font-bold">{{ capability.label }}</p>
              <p class="text-sm text-[#666]">
                {{ capability.execution }} : {{ capability.effect }}
              </p>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </main>
</template>

