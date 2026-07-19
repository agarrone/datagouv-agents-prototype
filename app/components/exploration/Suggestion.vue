<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <button
    class="rounded-full border border-[#ddd] bg-white px-3 py-2 text-left text-xs transition-colors hover:border-[#6a6af4] hover:bg-[#f5f5fe] disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="disabled"
    type="button"
    @click="$emit('select')"
  >
    <slot />
  </button>
</template>
