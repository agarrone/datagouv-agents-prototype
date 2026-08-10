<script setup lang="ts">
import spinners, { type BrailleSpinnerName } from "unicode-animations";

const props = withDefaults(defineProps<{
  name?: BrailleSpinnerName;
}>(), {
  name: "dna",
});

const frameIndex = ref(0);
const reducedMotion = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
let mediaQuery: MediaQueryList | undefined;

const spinner = computed(() => spinners[props.name]);
const frameWidth = computed(() => Math.max(
  ...spinner.value.frames.map(value => [...value].length),
) + 0.5);
const frame = computed(() => {
  const frames = spinner.value.frames;
  if (reducedMotion.value) return frames[Math.floor(frames.length / 2)];
  return frames[frameIndex.value % frames.length];
});

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = undefined;
}

function start() {
  stop();
  frameIndex.value = 0;
  if (reducedMotion.value) return;
  timer = setInterval(() => {
    frameIndex.value = (frameIndex.value + 1) % spinner.value.frames.length;
  }, spinner.value.interval);
}

function handleMotionPreference(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches;
  start();
}

watch(() => props.name, start);

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = mediaQuery.matches;
  mediaQuery.addEventListener("change", handleMotionPreference);
  start();
});

onBeforeUnmount(() => {
  stop();
  mediaQuery?.removeEventListener("change", handleMotionPreference);
});
</script>

<template>
  <span
    aria-hidden="true"
    class="inline-flex shrink-0 justify-center font-mono text-[1em] font-normal leading-none text-[#777777] tabular-nums"
    :style="{ width: `${frameWidth}ch` }"
  >
    {{ frame }}
  </span>
</template>
