<script setup lang="ts">
const props = withDefaults(defineProps<{
  tone?: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  details?: string;
  actionLabel?: string;
  code?: string;
  sourceLabel?: string;
  requestId?: string;
  retryAfterSeconds?: number;
}>(), {
  actionLabel: undefined,
  details: undefined,
  tone: "info",
  message: undefined,
  code: undefined,
  sourceLabel: undefined,
  requestId: undefined,
  retryAfterSeconds: undefined,
});

const emit = defineEmits<{ action: [] }>();
const remainingSeconds = ref(0);
let countdown: ReturnType<typeof setInterval> | undefined;

function startCountdown(seconds?: number) {
  if (countdown) clearInterval(countdown);
  remainingSeconds.value = Math.max(0, Math.ceil(seconds ?? 0));
  if (!remainingSeconds.value) return;
  countdown = setInterval(() => {
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
    if (!remainingSeconds.value && countdown) clearInterval(countdown);
  }, 1000);
}

watch(() => props.retryAfterSeconds, startCountdown, { immediate: true });
onBeforeUnmount(() => {
  if (countdown) clearInterval(countdown);
});

const resolvedActionLabel = computed(() => remainingSeconds.value
  ? `Réessayer dans ${remainingSeconds.value} s`
  : props.actionLabel);

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
      <dl v-if="sourceLabel || code || requestId" class="mt-2 flex flex-wrap gap-1.5 text-[10px] leading-4 text-[#555555]">
        <div v-if="sourceLabel" class="rounded-md border border-current/20 bg-white/70 px-1.5 py-0.5">
          <dt class="sr-only">Origine</dt><dd>{{ sourceLabel }}</dd>
        </div>
        <div v-if="code" class="rounded-md border border-current/20 bg-white/70 px-1.5 py-0.5 font-mono">
          <dt class="sr-only">Code</dt><dd>{{ code }}</dd>
        </div>
        <div v-if="requestId" class="rounded-md border border-current/20 bg-white/70 px-1.5 py-0.5 font-mono">
          <dt class="sr-only">Identifiant</dt><dd>Réf. {{ requestId }}</dd>
        </div>
      </dl>
      <details v-if="details" class="group/details mt-1.5 text-[11px] text-[#555555]">
        <summary class="agent-focusable inline-flex cursor-pointer list-none items-center gap-1 underline underline-offset-2 [&::-webkit-details-marker]:hidden">
          Détails techniques
          <i aria-hidden="true" class="ri-arrow-down-s-line text-sm transition-transform group-open/details:rotate-180" />
        </summary>
        <pre class="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap rounded-[2px] border border-[#e5e5e5] bg-white p-2 font-mono text-[11px] leading-4 text-[#555555]">{{ details }}</pre>
      </details>
      <button
        v-if="resolvedActionLabel"
        class="agent-focusable agent-pressable mt-2 h-7 rounded-md border px-2.5 text-[11px] font-medium disabled:cursor-wait disabled:opacity-60"
        :class="tone === 'error' ? 'border-[#ce0500] text-[#ce0500] hover:bg-white' : 'border-[#000091] text-[#000091] hover:bg-white'"
        :disabled="remainingSeconds > 0"
        type="button"
        @click="emit('action')"
      >{{ resolvedActionLabel }}</button>
    </div>
  </div>
</template>
