<script setup lang="ts">
const props = defineProps<{
  title: string;
  state: string;
  sql?: string;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
}>();

const open = ref(props.state !== "output-available");

watch(
  () => props.state,
  (state) => {
    if (state === "output-error") open.value = true;
  },
);

const status = computed(() => {
  if (props.state === "output-available") return "Terminé";
  if (props.state === "output-error") return "Erreur";
  if (props.state === "input-available") return "En cours";
  return "En attente";
});

const statusClass = computed(() => {
  if (props.state === "output-available") return "border-[#b8fec9] bg-[#e3fdeb] text-[#18753c]";
  if (props.state === "output-error") return "border-[#ffbdbd] bg-[#ffe9e9] text-[#ce0500]";
  return "border-[#e5e5e5] bg-[#eee] text-[#666]";
});
</script>

<template>
  <section class="mt-2 overflow-hidden rounded-md border border-[#ddd] bg-white text-[12px]">
    <button
      type="button"
      class="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f6f6f6]"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg aria-hidden="true" class="size-4 shrink-0 text-[#666]" viewBox="0 0 24 24" fill="none">
        <path d="M14.7 6.3 17.7 3.3 20.7 6.3 17.7 9.3M9.3 17.7 6.3 20.7 3.3 17.7 6.3 14.7M8 8l8 8M15 11l2-2M9 15l-2 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="min-w-0 flex-1 truncate font-medium">{{ title }}</span>
      <span class="rounded-full border px-2 py-0.5 text-[10px] leading-4" :class="statusClass">
        {{ status }}
      </span>
      <svg
        aria-hidden="true"
        class="size-4 shrink-0 text-[#666] transition-transform"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="open" class="border-t border-[#e5e5e5] px-3 py-3">
      <div v-if="sql || inputSummary">
        <p class="mb-1.5 text-[10px] font-medium uppercase tracking-[0.04em] text-[#666]">Paramètres</p>
        <p v-if="inputSummary" class="mb-2 leading-5 text-[#666]">{{ inputSummary }}</p>
        <ExplorationCodeBlock v-if="sql" :code="sql" />
      </div>

      <div v-if="outputSummary || error" :class="{ 'mt-3': sql || inputSummary }">
        <p class="mb-1 text-[10px] font-medium uppercase tracking-[0.04em] text-[#666]">
          {{ error ? "Erreur" : "Résultat" }}
        </p>
        <p class="leading-5" :class="error ? 'text-[#ce0500]' : 'text-[#3a3a3a]'">
          {{ error || outputSummary }}
        </p>
      </div>

      <p v-if="!sql && !inputSummary && !outputSummary && !error" class="leading-5 text-[#666]">
        {{ state === "output-available" ? "Opération terminée." : "L’opération est en cours d’exécution." }}
      </p>
    </div>
  </section>
</template>
