<script setup lang="ts">
import GameOfLifeLoader from "./GameOfLifeLoader.client.vue";

defineProps<{ kind: "graphique" | "carte" | "indicateur" }>();
</script>

<template>
  <ExplorationResultCard
    content-class="p-5"
    :eyebrow="kind === 'carte' ? 'Carte' : kind === 'indicateur' ? 'Indicateur' : 'Graphique'"
    :title="kind === 'carte' ? 'Préparation de la carte' : kind === 'indicateur' ? 'Préparation de l’indicateur' : 'Préparation du graphique'"
  >
    <div class="relative isolate overflow-hidden border border-[#e5e5e5] bg-white" :class="kind === 'indicateur' ? 'h-36' : 'h-72'">
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
