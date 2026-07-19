<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <button
    class="group flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-[#ddd] bg-white px-3 py-2 text-left text-xs transition-colors hover:border-[#6a6af4] hover:bg-[#f5f5fe] disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="disabled"
    type="button"
    @click="$emit('select')"
  >
    <span><slot /></span>
    <span aria-hidden="true" class="text-[#929292] transition-transform group-hover:translate-x-0.5 group-hover:text-[#000091]">→</span>
  </button>
</template>
