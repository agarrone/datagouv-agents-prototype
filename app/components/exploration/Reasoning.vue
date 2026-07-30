<script setup lang="ts">
defineProps<{
  content: string;
}>();
</script>

<template>
  <ExplorationAgentDisclosure icon="ri-brain-line" title="Raisonnement">
    <p class="text-pretty text-[12px] leading-5 text-[#777]">{{ content }}</p>
  </ExplorationAgentDisclosure>
</template>
