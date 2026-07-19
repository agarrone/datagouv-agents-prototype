<script setup lang="ts">
defineProps<{ kind: "graphique" | "carte" }>();
</script>

<template>
  <div class="mt-3 flex h-80 flex-col items-center justify-center border border-[#ddd] bg-white text-center">
    <div aria-hidden="true" class="flex items-center gap-1.5">
      <span v-for="index in 3" :key="index" class="visual-dot h-1.5 w-1.5 rounded-full bg-[#929292]" :style="{ animationDelay: `${(index - 1) * 140}ms` }" />
    </div>
    <p class="mt-3 text-xs text-[#666]">Préparation {{ kind === "carte" ? "de la carte" : "du graphique" }}…</p>
  </div>
</template>

<style scoped>
@keyframes visual-dot {
  0%, 70%, 100% { opacity: 0.25; transform: translateY(0); }
  35% { opacity: 1; transform: translateY(-3px); }
}

.visual-dot { animation: visual-dot 1.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .visual-dot { animation: none; opacity: 0.65; }
}
</style>
