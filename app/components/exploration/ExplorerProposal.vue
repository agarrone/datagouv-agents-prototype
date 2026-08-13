<script setup lang="ts">
import type { ExplorerViewPreview } from "~~/shared/types/exploration";

const props = defineProps<{
  title: string;
  reason: string;
  sql: string;
  state: string;
  error?: string;
  recovering?: boolean;
  applied?: boolean;
  resultRowCount?: number;
  preview?: ExplorerViewPreview;
  currentRowCount?: number;
}>();

const emit = defineEmits<{ apply: []; decline: [] }>();
const dataset = useDatasetEngine();
const previewResult = ref<ExplorerViewPreview | undefined>(props.preview);
const previewLoading = ref(false);
const previewError = ref("");
const applying = ref(false);

const currentRowCount = computed(() =>
  props.currentRowCount
  ?? dataset.activeView.value?.rowCount
  ?? dataset.schema.value?.rowCount
  ?? 0,
);

async function loadPreview() {
  if (props.state !== "input-available" || previewResult.value || previewLoading.value) return;
  previewLoading.value = true;
  previewError.value = "";
  try {
    previewResult.value = await dataset.previewExplorerView(props.sql);
  } catch (reason) {
    previewError.value = reason instanceof Error
      ? reason.message
      : "L’aperçu de cette vue n’est pas disponible.";
  } finally {
    previewLoading.value = false;
  }
}

function apply() {
  if (applying.value) return;
  applying.value = true;
  emit("apply");
}

watch(() => props.state, (state) => {
  if (state !== "input-available") applying.value = false;
  else void loadPreview();
}, { immediate: true });
</script>

<template>
  <section class="agent-surface mt-3 overflow-hidden text-[13px]">
    <div class="flex items-start gap-3 px-4 py-3.5">
      <i aria-hidden="true" class="ri-filter-line mt-0.5 shrink-0 text-xl leading-none text-[#000091]" />
      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Vue proposée</p>
        <h3 class="mt-1 font-semibold leading-5">{{ title }}</h3>
        <p class="mt-1 text-xs leading-5 text-[#555555]">{{ reason }}</p>
        <div v-if="state === 'input-available'" class="mt-3 rounded-[6px] border border-[#e5e5e5] bg-[#f6f6f6] px-3 py-2.5 text-[11px] leading-4">
          <p class="font-semibold text-[#3a3a3a]">Effet sur l’explorateur</p>
          <p v-if="previewLoading" class="mt-1 flex items-center gap-1.5 text-[#666666]">
            <i aria-hidden="true" class="ri-loader-4-line animate-spin text-[14px]" />
            Calcul de l’aperçu…
          </p>
          <template v-else-if="previewResult">
            <p class="mt-1 text-[#3a3a3a]">
              <strong>{{ previewResult.rowCount.toLocaleString('fr-FR') }}</strong> ligne{{ previewResult.rowCount > 1 ? 's' : '' }} après application
              <span class="text-[#777777]">· {{ currentRowCount.toLocaleString('fr-FR') }} actuellement</span>
            </p>
            <p class="mt-0.5 text-[#555555]">
              {{ previewResult.preservesColumns ? `Toutes les ${previewResult.columns.length} colonnes sont conservées.` : `${previewResult.columns.length} colonnes seront affichées.` }}
            </p>
          </template>
          <p v-else-if="previewError" class="mt-1 text-[#a55800]">{{ previewError }}</p>
          <p class="mt-1 text-[#666666]">
            {{ dataset.activeView.value ? `Cette vue remplacera « ${dataset.activeView.value.title} ».` : "La source et ses données initiales ne seront pas modifiées." }}
          </p>
        </div>
        <ExplorationCodeBlock class="mt-2" :code="sql" collapsible />
      </div>
    </div>
    <div v-if="state === 'input-available'" class="flex flex-wrap items-center justify-end gap-2 border-t border-[#e5e5e5] px-4 py-3">
      <button class="agent-focusable rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#000091] hover:bg-[#f6f6f6]" :disabled="applying" type="button" @click="emit('decline')">
        Conserver la vue actuelle
      </button>
      <button class="agent-focusable agent-pressable inline-flex items-center gap-1.5 rounded-md bg-[#000091] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#1212ff] disabled:cursor-not-allowed disabled:opacity-60" :disabled="applying || previewLoading || !previewResult" type="button" @click="apply">
        <i v-if="applying" aria-hidden="true" class="ri-loader-4-line animate-spin text-[14px]" />
        {{ applying ? "Application…" : "Appliquer cette vue" }}
      </button>
    </div>
    <p v-else-if="state === 'output-available'" class="flex items-center gap-2 border-t border-[#b8fec9] bg-[#e3fdeb] px-4 py-3 text-xs text-[#18753c]">
      <i aria-hidden="true" :class="applied === false ? 'ri-arrow-go-back-line' : 'ri-check-line'" class="text-base leading-none" />
      <span>{{ applied === false ? "Vue actuelle conservée" : `Vue appliquée · ${(resultRowCount ?? 0).toLocaleString('fr-FR')} lignes` }}</span>
    </p>
    <p v-else-if="state === 'output-error' && recovering" class="flex items-center gap-2 border-t border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3 text-xs text-[#555555]">
      <ExplorationUnicodeSpinner name="dna" class="w-5 text-[#777777]" />
      Une correction est en cours de préparation
    </p>
    <p v-else-if="state === 'output-error'" class="border-t border-[#ffbdbd] bg-[#fef4f4] px-4 py-3 text-xs text-[#ce0500]">
      {{ error }}
    </p>
  </section>
</template>
