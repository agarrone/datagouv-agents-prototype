<script setup lang="ts">
const canvas = ref<HTMLCanvasElement | null>(null);
let animationFrame: number | undefined;
let resizeObserver: ResizeObserver | undefined;
let cells = new Uint8Array();
let nextCells = new Uint8Array();
let opacities = new Float32Array();
let columns = 0;
let rows = 0;
let lastStep = 0;
let previousTime = 0;
let shouldAnimate = true;

const cellSize = 14;
const gap = 3;
const density = 0.24;
const maxOpacity = 0.13;
const fadeDuration = 900;
const stepInterval = 620;

function random(index: number) {
  const value = Math.sin(index * 12.9898 + 20260716) * 43758.5453;
  return value - Math.floor(value);
}

function resize() {
  const element = canvas.value;
  if (!element) return;
  const bounds = element.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  element.width = Math.max(1, Math.round(bounds.width * ratio));
  element.height = Math.max(1, Math.round(bounds.height * ratio));
  columns = Math.max(1, Math.ceil(bounds.width / cellSize));
  rows = Math.max(1, Math.ceil(bounds.height / cellSize));
  const length = columns * rows;
  cells = Uint8Array.from({ length }, (_, index) => random(index) < density ? 1 : 0);
  nextCells = new Uint8Array(length);
  opacities = new Float32Array(length);
}

function step() {
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      let neighbours = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighbourX = (x + offsetX + columns) % columns;
          const neighbourY = (y + offsetY + rows) % rows;
          neighbours += cells[neighbourY * columns + neighbourX] ?? 0;
        }
      }
      const index = y * columns + x;
      nextCells[index] = neighbours === 3 || (cells[index] === 1 && neighbours === 2) ? 1 : 0;
    }
  }
  [cells, nextCells] = [nextCells, cells];
}

function draw(time: number) {
  const element = canvas.value;
  if (!element) return;
  const context = element.getContext("2d");
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const delta = previousTime ? Math.min(time - previousTime, 64) : 0;
  previousTime = time;
  if (time - lastStep >= stepInterval) {
    step();
    lastStep = time;
  }

  context.clearRect(0, 0, element.width, element.height);
  context.fillStyle = "#000091";
  for (let index = 0; index < cells.length; index += 1) {
    const target = cells[index] ? maxOpacity : 0;
    const amount = fadeDuration > 0 ? Math.min(1, delta / fadeDuration) : 1;
    opacities[index] = (opacities[index] ?? 0) + (target - (opacities[index] ?? 0)) * amount;
    if ((opacities[index] ?? 0) < 0.002) continue;
    const x = (index % columns) * cellSize + gap / 2;
    const y = Math.floor(index / columns) * cellSize + gap / 2;
    context.globalAlpha = opacities[index] ?? 0;
    context.beginPath();
    context.roundRect(
      x * ratio,
      y * ratio,
      (cellSize - gap) * ratio,
      (cellSize - gap) * ratio,
      2 * ratio,
    );
    context.fill();
  }
  context.globalAlpha = 1;
  if (shouldAnimate) animationFrame = window.requestAnimationFrame(draw);
}

onMounted(() => {
  shouldAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  resize();
  if (canvas.value) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.value);
  }
  if (shouldAnimate) animationFrame = window.requestAnimationFrame(draw);
  else draw(0);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
});
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" class="block h-full w-full" />
</template>
