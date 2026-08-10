<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  source?: string;
  contentClass?: string;
  titleWeight?: "semibold" | "bold";
}>(), {
  eyebrow: undefined,
  description: undefined,
  source: undefined,
  contentClass: "",
  titleWeight: "semibold",
});
</script>

<template>
  <section class="agent-surface">
    <header class="flex min-h-12 items-start justify-between gap-3 border-b border-[#e5e5e5] px-5 py-3">
      <div class="min-w-0">
        <p v-if="eyebrow" class="mb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">
          {{ eyebrow }}
        </p>
        <h3
          class="text-[13px] leading-5"
          :class="titleWeight === 'bold' ? 'font-bold' : 'font-semibold'"
        >{{ title }}</h3>
        <p v-if="description" class="mt-1 text-xs leading-5 text-[#555555]">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-1">
        <slot name="actions" />
      </div>
    </header>

    <div :class="contentClass">
      <slot />
    </div>

    <p
      v-if="source"
      class="flex h-8 items-center truncate border-t border-[#e5e5e5] px-5 text-[11px] leading-4 text-[#555555]"
      :title="source"
    >
      Source : {{ source }}
    </p>
    <footer
      v-else-if="$slots.footer"
      class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#e5e5e5] px-5 py-2.5 text-[11px] text-[#555555]"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
