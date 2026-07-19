<script setup lang="ts">
const props = defineProps<{
  active: boolean;
  count: number;
}>();

const open = ref(props.active);

watch(
  () => props.active,
  (active) => {
    open.value = active;
  },
);
</script>

<template>
  <section v-if="count > 0" class="mt-1">
    <button
      :aria-expanded="open"
      class="flex min-h-7 items-center gap-2 text-xs text-[#666] hover:text-[#000091]"
      type="button"
      @click="open = !open"
    >
      <span aria-hidden="true" class="transition-transform" :class="open ? 'rotate-90' : ''">›</span>
      <span v-if="active" class="agent-reasoning-shimmer">Analyse en cours…</span>
      <span v-else>Analyse terminée · {{ count }} étape{{ count > 1 ? "s" : "" }}</span>
    </button>
    <div v-if="open" class="pb-1">
      <slot />
    </div>
  </section>
</template>

<style scoped>
@keyframes reasoning-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

.agent-reasoning-shimmer {
  background: linear-gradient(90deg, #666 25%, #c6c6c6 50%, #666 75%);
  background-size: 200% 100%;
  background-clip: text;
  color: transparent;
  animation: reasoning-shimmer 1.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .agent-reasoning-shimmer { animation: none; color: #666; }
}
</style>
