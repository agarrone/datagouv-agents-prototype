<script setup lang="ts">
const props = withDefaults(defineProps<{
  tone?: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  details?: string;
  actionLabel?: string;
}>(), {
  actionLabel: undefined,
  details: undefined,
  tone: "info",
  message: undefined,
});

const emit = defineEmits<{ action: [] }>();

const styles = computed(() => ({
  info: {
    container: "border-[#cacafb] bg-[#f5f5fe]",
    tone: "text-[#000091]",
    icon: "ri-information-line",
  },
  success: {
    container: "border-[#b8fec9] bg-[#e3fdeb]",
    tone: "text-[#18753c]",
    icon: "ri-checkbox-circle-line",
  },
  warning: {
    container: "border-[#f9e4d4] bg-[#fff4f3]",
    tone: "text-[#a55800]",
    icon: "ri-error-warning-line",
  },
  error: {
    container: "border-[#ffbdbd] bg-[#fef4f4]",
    tone: "text-[#ce0500]",
    icon: "ri-error-warning-line",
  },
})[props.tone]);
</script>

<template>
  <div class="flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[12px] leading-5" :class="styles.container" role="status">
    <i aria-hidden="true" class="mt-0.5 shrink-0 text-base leading-none" :class="[styles.icon, styles.tone]" />
    <div class="min-w-0">
      <p class="font-medium" :class="styles.tone">{{ title }}</p>
      <p v-if="message" class="mt-0.5 text-[#555555]">{{ message }}</p>
      <details v-if="details" class="group/details mt-1.5 text-[11px] text-[#555555]">
        <summary class="agent-focusable inline-flex cursor-pointer list-none items-center gap-1 underline underline-offset-2 [&::-webkit-details-marker]:hidden">
          Détails techniques
          <i aria-hidden="true" class="ri-arrow-down-s-line text-sm transition-transform group-open/details:rotate-180" />
        </summary>
        <pre class="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap rounded-[2px] border border-[#e5e5e5] bg-white p-2 font-mono text-[11px] leading-4 text-[#555555]">{{ details }}</pre>
      </details>
      <button
        v-if="actionLabel"
        class="agent-focusable agent-pressable mt-2 h-7 rounded-md border px-2.5 text-[11px] font-medium"
        :class="tone === 'error' ? 'border-[#ce0500] text-[#ce0500] hover:bg-white' : 'border-[#000091] text-[#000091] hover:bg-white'"
        type="button"
        @click="emit('action')"
      >{{ actionLabel }}</button>
    </div>
  </div>
</template>
