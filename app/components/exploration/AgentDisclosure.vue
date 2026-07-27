<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string;
  icon: string;
  open?: boolean;
}>(), {
  open: false,
});

const expanded = ref(props.open);
</script>

<template>
  <section class="t-acc text-[12px] text-[#666]" :data-open="String(expanded)">
    <button
      :aria-expanded="expanded"
      class="t-acc-head agent-focusable flex min-h-10 w-full items-center gap-2 py-1 text-left transition-colors duration-150 hover:text-[#161616]"
      type="button"
      @click="expanded = !expanded"
    >
      <i aria-hidden="true" :class="icon" class="shrink-0 text-base leading-none" />
      <span class="min-w-0 flex-1 truncate">{{ title }}</span>
      <i
        aria-hidden="true"
        class="t-acc-chevron ri-arrow-down-s-line shrink-0 text-base leading-none"
      />
    </button>
    <div class="t-acc-panel">
      <div class="t-acc-panel-inner min-h-0">
        <div class="pb-2 pl-6 pt-1">
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.t-acc-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--acc-collapse) var(--acc-ease);
}

.t-acc[data-open="true"] .t-acc-panel {
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--acc-expand) var(--acc-ease);
}

.t-acc-panel-inner {
  overflow: hidden;
  opacity: 0;
  filter: blur(var(--blur-small));
  transition:
    opacity var(--acc-collapse) var(--acc-ease),
    filter var(--acc-collapse) var(--acc-ease);
}

.t-acc[data-open="true"] .t-acc-panel-inner {
  opacity: 1;
  filter: blur(0);
  transition:
    opacity var(--acc-expand) var(--acc-ease),
    filter var(--acc-expand) var(--acc-ease);
}

.t-acc-chevron {
  display: inline-flex;
  transform: scaleY(1);
  transform-origin: center;
  transition: transform var(--acc-chevron) var(--acc-ease);
}

.t-acc[data-open="true"] .t-acc-chevron {
  transform: scaleY(-1);
}

@media (prefers-reduced-motion: reduce) {
  .t-acc-panel,
  .t-acc-panel-inner,
  .t-acc-chevron {
    transition: none !important;
  }
}
</style>
