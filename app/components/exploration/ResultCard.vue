<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  contentClass?: string;
  titleWeight?: "semibold" | "bold";
}>(), {
  eyebrow: undefined,
  description: undefined,
  contentClass: "",
  titleWeight: "semibold",
});
</script>

<template>
  <section class="agent-surface overflow-hidden">
    <header class="border-b border-[#ddd] px-5 py-4">
      <p v-if="eyebrow" class="mb-1 text-[10px] font-medium uppercase tracking-[0.05em] text-[#666]">
        {{ eyebrow }}
      </p>
      <h3
        class="text-[13px] leading-5"
        :class="titleWeight === 'bold' ? 'font-bold' : 'font-semibold'"
      >{{ title }}</h3>
      <p v-if="description" class="mt-1 text-xs leading-5 text-[#666]">
        {{ description }}
      </p>
    </header>

    <div :class="contentClass">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#ddd] px-5 py-2.5 text-[11px] text-[#666]"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
