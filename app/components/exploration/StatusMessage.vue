<script setup lang="ts">
const props = withDefaults(defineProps<{
  tone?: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
}>(), {
  tone: "info",
  message: undefined,
});

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
    </div>
  </div>
</template>
