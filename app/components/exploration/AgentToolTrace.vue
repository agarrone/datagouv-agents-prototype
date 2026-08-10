<script setup lang="ts">
defineProps<{
  label: string;
  icon: string;
  summary: string;
  description?: string;
  error?: boolean;
  details?: Array<{ label: string; value: string }>;
  sql?: string;
}>();
</script>

<template>
  <li class="rounded-sm border border-[#e5e5e5] bg-white px-2.5 py-2">
    <div class="flex min-w-0 items-start gap-2">
      <span
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#f6f6f6] text-[12px] text-[#666]"
        aria-hidden="true"
      >
        <i :class="icon" class="leading-none" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center justify-between gap-2">
          <strong class="truncate text-[11px] font-semibold leading-4 text-[#333]">{{ label }}</strong>
          <i
            aria-hidden="true"
            :class="error ? 'ri-error-warning-line text-[#ce0500]' : 'ri-check-line text-[#777]'"
            class="shrink-0 text-[12px] leading-none"
          />
        </div>
        <p v-if="description" class="mt-0.5 text-[11px] leading-4 text-[#555]">{{ description }}</p>
        <p class="mt-0.5 text-[10px] leading-4" :class="error ? 'text-[#ce0500]' : 'text-[#777]'">{{ summary }}</p>
        <dl v-if="details?.length" class="mt-1.5 grid gap-0.5 border-t border-[#eee] pt-1.5 text-[10px] leading-4">
          <div v-for="detail in details" :key="detail.label" class="grid grid-cols-[5rem_minmax(0,1fr)] gap-1.5">
            <dt class="text-[#777]">{{ detail.label }}</dt>
            <dd class="min-w-0 break-words text-[#555]">{{ detail.value }}</dd>
          </div>
        </dl>
        <ExplorationCodeBlock v-if="sql" class="mt-1.5" :code="sql" collapsible />
      </div>
    </div>
  </li>
</template>
