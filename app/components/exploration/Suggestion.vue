<script setup lang="ts">
defineProps<{
  compact?: boolean;
  disabled?: boolean;
}>();
defineEmits<{ select: [] }>();
</script>

<template>
  <button
    class="agent-focusable agent-pressable group inline-flex min-h-7 max-w-full items-center rounded-full border border-[#e5e5e5] bg-white px-2.5 py-1 text-left text-[12px] leading-[1.35] text-[#3a3a3a] transition-colors duration-150 hover:border-[#000091] hover:bg-[#e8edff] hover:text-[#000091] disabled:cursor-not-allowed disabled:opacity-50"
    :class="compact ? '' : 'gap-1.5'"
    :disabled="disabled"
    type="button"
    @click="$emit('select')"
  >
    <span><slot /></span>
  </button>
</template>
