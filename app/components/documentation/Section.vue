<script setup lang="ts">
defineProps<{
  title: string;
  eyebrow?: string;
  description?: string;
  id?: string;
}>();
</script>

<template>
  <section :id="id" class="scroll-mt-6 border-t border-[#e5e5e5] py-9 lg:py-10">
    <div class="max-w-3xl">
      <p v-if="eyebrow" class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">{{ eyebrow }}</p>
      <h2 class="mt-1 text-2xl font-bold leading-8 text-[#161616]">{{ title }}</h2>
      <p v-if="description" class="mt-3 text-[15px] leading-7 text-[#555555]">{{ description }}</p>
    </div>
    <div class="documentation-content mt-4 space-y-4 text-[15px] leading-7 text-[#555555]">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.documentation-content :deep(ul),
.documentation-content :deep(ol) { padding-left: 1.25rem; }
.documentation-content :deep(ul) { list-style: disc; }
.documentation-content :deep(ol) { list-style: decimal; }
.documentation-content :deep(li + li) { margin-top: 0.5rem; }
.documentation-content :deep(li::marker) { color: #555555; }
.documentation-content :deep(code) {
  border-radius: 2px;
  background: #f6f6f6;
  padding: 0.1rem 0.3rem;
  font-family: "Geist Mono Variable", "Geist Mono", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.88em;
}
</style>
