<script setup lang="ts">
import type { LanguageModelUsage } from "ai";

const props = defineProps<{ usage?: LanguageModelUsage }>();
const details = ref<HTMLDetailsElement | null>(null);

const total = computed(() => (
  props.usage?.totalTokens
  ?? ((props.usage?.inputTokens ?? 0) + (props.usage?.outputTokens ?? 0))
) || undefined);

function closeOnOutside(event: PointerEvent) {
  if (details.value?.open && !details.value.contains(event.target as Node)) {
    details.value.open = false;
  }
}

onMounted(() => document.addEventListener("pointerdown", closeOnOutside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeOnOutside));
</script>

<template>
  <details ref="details" class="relative h-6 text-[12px] leading-[1.4] text-[#555555]">
    <summary
      class="agent-focusable flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-md hover:bg-[#f6f6f6] [&::-webkit-details-marker]:hidden"
      :aria-label="total ? `${total.toLocaleString('fr-FR')} tokens utilisés` : 'Tokens indisponibles'"
      title="Tokens utilisés"
    >
      <i
        aria-hidden="true"
        class="ri-dashboard-2-line text-base leading-none"
        :class="total ? 'text-[#555555]' : 'text-[#777777]'"
      />
    </summary>
    <div class="absolute bottom-7 left-0 z-30 w-[220px] rounded-md border border-[#e5e5e5] bg-white p-2 shadow-[0_2px_4px_rgba(0,0,0,0.04),2px_4px_16px_rgba(0,0,0,0.12)]">
      <template v-if="total">
        <p class="mb-1 text-[11px] font-medium leading-4 text-[#161616]">Nombre de tokens utilisés</p>
        <div v-if="typeof usage?.inputTokens === 'number'" class="mt-1 flex items-center justify-between gap-4 text-[11px] leading-4 text-[#555555]">
          <span>Entrée</span>
          <span class="tabular-nums">{{ usage.inputTokens.toLocaleString("fr-FR") }}</span>
        </div>
        <div v-if="typeof usage?.outputTokens === 'number'" class="mt-1 flex items-center justify-between gap-4 text-[11px] leading-4 text-[#555555]">
          <span>Réponse</span>
          <span class="tabular-nums">{{ usage.outputTokens.toLocaleString("fr-FR") }}</span>
        </div>
        <div class="mt-2 flex items-center justify-between gap-4 border-t border-[#e5e5e5] pt-1 text-[11px] font-medium leading-4 text-[#161616]">
          <span>Total</span>
          <span class="tabular-nums">{{ total.toLocaleString("fr-FR") }}</span>
        </div>
      </template>
      <p v-else class="text-[11px] leading-4 text-[#555555]">Nombre de tokens utilisés indisponible</p>
    </div>
  </details>
</template>
