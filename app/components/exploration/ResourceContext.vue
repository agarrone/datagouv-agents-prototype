<script setup lang="ts">
defineProps<{
  title: string;
  organization?: string;
}>();

const open = ref(false);
</script>

<template>
  <div>
    <button
      :aria-expanded="open"
      class="flex min-h-10 w-full items-center gap-2 border-b border-[#e5e5e5] px-3 text-left text-xs text-[#666] hover:bg-[#f6f6f6]"
      type="button"
      @click="open = !open"
    >
      <span aria-hidden="true" class="transition-transform" :class="open ? 'rotate-90' : ''">›</span>
      <span>1 ressource utilisée</span>
    </button>
    <div v-if="open" class="border-b border-[#e5e5e5] px-3 py-2">
      <span class="inline-flex max-w-full rounded border border-[#cacafb] bg-[#f5f5fe] px-2 py-1 text-xs text-[#000091]">
        <span class="truncate">{{ title }}</span>
        <span v-if="organization" class="ml-1 truncate text-[#666]">· {{ organization }}</span>
      </span>
    </div>
  </div>
</template>
