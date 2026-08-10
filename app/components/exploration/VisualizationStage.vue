<script setup lang="ts">
const props = defineProps<{
  kind: "graphique" | "carte";
  ready: boolean;
}>();

const minimumElapsed = ref(false);
const completionSoundPlayed = ref(false);
const { playUiSound } = useUiSound();
let minimumTimer: ReturnType<typeof setTimeout> | undefined;

const revealed = computed(() => props.ready && minimumElapsed.value);

watch(revealed, (isRevealed) => {
  if (!isRevealed || completionSoundPlayed.value) return;
  completionSoundPlayed.value = true;
  playUiSound("sparkle");
});

onMounted(() => {
  minimumTimer = setTimeout(() => {
    minimumElapsed.value = true;
  }, 900);
});

onBeforeUnmount(() => {
  if (minimumTimer) clearTimeout(minimumTimer);
});
</script>

<template>
  <div class="t-skel h-[28rem]" :class="revealed ? 'is-revealed' : ''">
    <div class="t-skel-skeleton is-pulsing">
      <ExplorationVisualizationLoading class="h-full" :kind="kind" />
    </div>
    <div class="t-skel-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.t-skel { position: relative; }
.t-skel-skeleton,
.t-skel-content {
  position: absolute;
  inset: 0;
}

.t-skel-skeleton {
  z-index: 1;
  opacity: 1;
  filter: blur(0);
  transition:
    opacity var(--reveal-dur) var(--reveal-ease),
    filter  var(--reveal-dur) var(--reveal-ease);
}
.t-skel-content {
  z-index: 2;
  opacity: 0;
  filter: blur(var(--reveal-blur));
  transition:
    opacity var(--reveal-dur) var(--reveal-ease),
    filter  var(--reveal-dur) var(--reveal-ease);
}
.t-skel.is-revealed .t-skel-skeleton {
  opacity: 0;
  filter: blur(var(--reveal-blur));
}
.t-skel.is-revealed .t-skel-content {
  opacity: 1;
  filter: blur(0);
}
.t-skel.is-resetting .t-skel-skeleton,
.t-skel.is-resetting .t-skel-content {
  transition: none !important;
}

.t-skel-skeleton.is-pulsing > * {
  animation: t-skel-pulse var(--pulse-dur) ease-in-out var(--pulse-count);
}
@keyframes t-skel-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: var(--pulse-min); }
}

@media (prefers-reduced-motion: reduce) {
  .t-skel-skeleton, .t-skel-content {
    transition: none !important;
  }
  .t-skel-skeleton.is-pulsing > * { animation: none !important; }
}
</style>
