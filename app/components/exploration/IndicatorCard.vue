<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string;
  value: string | number;
  unit?: string;
  period?: string;
  description?: string;
  source?: string;
  sourceDescription?: string;
  comparison?: string;
  comparisonLabel?: string;
  comparisonTone?: "positive" | "negative" | "neutral";
  compact?: boolean;
}>(), {
  unit: undefined,
  period: undefined,
  description: undefined,
  source: undefined,
  sourceDescription: undefined,
  comparison: undefined,
  comparisonLabel: undefined,
  comparisonTone: "neutral",
  compact: false,
});

const formattedValue = computed(() => {
  if (typeof props.value === "number") {
    return props.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  const normalized = props.value.trim();
  if (/^[-+]?\d+$/.test(normalized)) {
    try {
      return BigInt(normalized).toLocaleString("fr-FR");
    }
    catch {
      return props.value;
    }
  }
  if (/^[-+]?(?:\d+\.\d*|\d*\.\d+)(?:[eE][-+]?\d+)?$/.test(normalized)) {
    const numericValue = Number(normalized);
    if (Number.isFinite(numericValue)) return numericValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  return props.value;
});

const comparisonClasses = computed(() => ({
  positive: "bg-[#e3fdeb] text-[#18753c]",
  negative: "bg-[#ffe9e9] text-[#ce0500]",
  neutral: "bg-[#eeeeee] text-[#555555]",
}[props.comparisonTone]));

const sourceIsOpen = ref(false);
</script>

<template>
  <article class="agent-surface flex min-w-0 flex-col overflow-hidden">
    <div class="flex flex-1 flex-col" :class="compact ? 'p-4' : 'p-5'">
      <div>
        <div class="min-w-0">
          <p class="font-bold tabular-nums tracking-[-0.025em] text-[#161616]" :class="compact ? 'text-[28px] leading-8' : 'text-[38px] leading-[1.08] sm:text-[42px]'">
            {{ formattedValue }}<span v-if="unit" class="ml-1.5 align-baseline text-[0.5em] font-medium tracking-normal">{{ unit }}</span>
          </p>
          <h3 class="mt-3 font-semibold text-[#161616]" :class="compact ? 'text-[13px] leading-5' : 'text-[15px] leading-5'">{{ title }}</h3>
          <p v-if="period" class="mt-1 text-[12px] leading-5 text-[#666666]">{{ period }}</p>
        </div>

      </div>

      <p v-if="description && !compact" class="mt-3 max-w-[42rem] text-[13px] leading-5 text-[#555555]">{{ description }}</p>

      <div v-if="comparison" class="mt-4 flex flex-wrap items-center gap-2">
        <span class="rounded-sm px-2 py-1 text-[11px] font-semibold tabular-nums" :class="comparisonClasses">{{ comparison }}</span>
        <span v-if="comparisonLabel" class="text-[11px] leading-4 text-[#666666]">{{ comparisonLabel }}</span>
      </div>

    </div>

    <div v-if="source || sourceDescription" class="border-t border-[#e5e5e5]">
      <button
        type="button"
        class="agent-focusable flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 px-5 py-2 text-left text-[11px] font-medium text-[#161616]"
        :aria-expanded="sourceIsOpen"
        @click="sourceIsOpen = !sourceIsOpen"
      >
        <span>Sources et description</span>
        <i aria-hidden="true" class="ri-arrow-down-s-line text-[15px] transition-transform duration-150" :class="sourceIsOpen ? 'rotate-180' : ''" />
      </button>
      <div v-if="sourceIsOpen" class="border-t border-[#f0f0f0] px-5 py-3 text-[11px] leading-5 text-[#555555]">
        <p v-if="source"><span class="font-medium text-[#161616]">Source :</span> {{ source }}</p>
        <p v-if="sourceDescription" :class="source ? 'mt-1' : ''">{{ sourceDescription }}</p>
      </div>
    </div>
  </article>
</template>
