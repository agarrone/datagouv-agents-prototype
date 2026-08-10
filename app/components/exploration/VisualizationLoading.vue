<script setup lang="ts">
import GameOfLifeLoader from "./GameOfLifeLoader.client.vue";

defineProps<{ kind: "graphique" | "carte" }>();
</script>

<template>
  <ExplorationResultCard
    content-class="p-5"
    :eyebrow="kind === 'carte' ? 'Carte' : 'Graphique'"
    :title="kind === 'carte' ? 'Préparation de la carte' : 'Préparation du graphique'"
  >
    <div class="relative isolate h-72 overflow-hidden border border-[#e5e5e5] bg-white">
      <GameOfLifeLoader class="absolute inset-0" />
      <p class="absolute inset-x-3 bottom-3 z-10 text-center text-[12px] font-medium leading-4 text-[#555555]">
        Mise en forme des données…
      </p>
    </div>
    <template #footer>
      <span>Calcul en cours</span>
      <span>Données traitées localement</span>
    </template>
  </ExplorationResultCard>
</template>
