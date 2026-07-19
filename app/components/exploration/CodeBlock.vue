<script setup lang="ts">
defineProps<{
  code: string;
  collapsible?: boolean;
  open?: boolean;
}>();
</script>

<template>
  <details v-if="collapsible" class="group mt-1" :open="open">
    <summary class="cursor-pointer list-none text-[11px] text-[#666] hover:text-[#000091]">
      <span class="group-open:hidden">Afficher la requête SQL</span>
      <span class="hidden group-open:inline">Masquer la requête SQL</span>
    </summary>
    <pre class="mt-2 max-h-40 overflow-auto border border-[#e5e5e5] bg-white px-3 py-2 font-mono text-[11px] leading-5"><code>{{ code }}</code></pre>
  </details>
  <pre v-else class="max-h-40 overflow-auto border border-[#e5e5e5] bg-white px-3 py-2 font-mono text-[11px] leading-5"><code>{{ code }}</code></pre>
</template>
