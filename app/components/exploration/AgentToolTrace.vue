<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  summary: string;
  description?: string;
  error?: boolean;
  details?: Array<{ label: string; value: string }>;
  code?: string;
  codeLanguage?: "SQL" | "JSON";
  open?: boolean;
}>(), {
  code: undefined,
  codeLanguage: "SQL",
  description: undefined,
  details: undefined,
  error: false,
  open: false,
});
</script>

<template>
  <li>
    <details class="group/tool overflow-hidden rounded-md border border-[#e5e5e5] bg-white" :open="open">
      <summary class="agent-focusable flex min-h-10 cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-left hover:bg-[#f6f6f6] [&::-webkit-details-marker]:hidden">
        <i aria-hidden="true" class="ri-wrench-line shrink-0 text-sm leading-none text-[#555555]" />
        <span class="min-w-0 flex-1">
          <strong class="block truncate text-[11px] font-semibold leading-4 text-[#161616]">{{ label }}</strong>
          <span class="block truncate text-[11px] leading-4" :class="error ? 'text-[#ce0500]' : 'text-[#777777]'">{{ summary }}</span>
        </span>
        <i
          v-if="error"
          aria-hidden="true"
          class="ri-error-warning-line shrink-0 text-sm leading-none text-[#ce0500]"
        />
        <i
          aria-hidden="true"
          class="ri-arrow-down-s-line shrink-0 text-sm leading-none text-[#777777] transition-transform duration-200 group-open/tool:rotate-180"
        />
      </summary>

      <div class="border-t border-[#e5e5e5] px-2.5 pb-2.5 pt-2">
        <p v-if="description" class="text-[11px] leading-4 text-[#555555]">{{ description }}</p>
        <dl v-if="details?.length" class="mt-2 grid gap-0.5 text-[11px] leading-4">
          <div v-for="detail in details" :key="detail.label" class="grid grid-cols-[5rem_minmax(0,1fr)] gap-1.5">
            <dt class="text-[#777777]">{{ detail.label }}</dt>
            <dd class="min-w-0 break-words text-[#555555]">{{ detail.value }}</dd>
          </div>
        </dl>
        <ExplorationCodeBlock
          v-if="code"
          class="mt-2"
          :code="code"
          :language="codeLanguage"
        />
      </div>
    </details>
  </li>
</template>
