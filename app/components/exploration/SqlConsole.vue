<script setup lang="ts">
import type { DatasetQueryResult, DatasetValue } from "~~/shared/types/exploration";

const props = defineProps<{ ready: boolean }>();
const dataset = useDatasetEngine();
const { playUiSound } = useUiSound();
const query = ref("");
const executedQuery = ref("");
const result = ref<DatasetQueryResult | null>(null);
const error = ref("");
const running = ref(false);
const applied = ref(false);

watch(query, () => {
  if (query.value.trim() !== executedQuery.value) applied.value = false;
});

function displayValue(value: DatasetValue) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

async function runQuery() {
  const sql = query.value.trim();
  if (!sql || running.value || !props.ready) return;
  running.value = true;
  error.value = "";
  applied.value = false;

  try {
    result.value = await dataset.executeSql(sql);
    executedQuery.value = sql;
  } catch (reason) {
    result.value = null;
    executedQuery.value = "";
    error.value = reason instanceof Error
      ? reason.message
      : "La requête SQL n’a pas pu être exécutée.";
    playUiSound("error");
  } finally {
    running.value = false;
  }
}

async function applyToExplorer() {
  if (!result.value || query.value.trim() !== executedQuery.value || applied.value) return;
  try {
    await dataset.applyExplorerView(
      executedQuery.value,
      "Requête personnalisée depuis la console SQL",
    );
    applied.value = true;
    if (/\bwhere\b/i.test(executedQuery.value)) playUiSound("whisper");
  } catch (reason) {
    error.value = reason instanceof Error
      ? reason.message
      : "La requête n’a pas pu être appliquée à l’explorateur.";
    playUiSound("error");
  }
}
</script>

<template>
  <section class="min-h-0 flex-1 overflow-auto bg-transparent p-3" aria-label="Console SQL">
    <div class="mb-4 max-w-[32rem]">
      <h3 class="text-balance text-[15px] font-semibold leading-6 text-[#161616]">
        Interrogez les données en SQL
      </h3>
      <p class="mt-1 text-pretty text-[12px] leading-5 text-[#555]">
        La console SQL utilise DuckDB WASM et s’exécute entièrement dans votre navigateur.
      </p>
    </div>

    <div class="agent-surface overflow-hidden">
      <div class="flex h-9 items-center border-b border-[#ddd] bg-[#f6f6f6] px-3">
        <span class="flex items-center gap-2 text-[12px] font-semibold text-[#555]">
          <i aria-hidden="true" class="ri-terminal-line text-sm leading-none text-[#666]" />
          Requête SQL
        </span>
      </div>
      <ExplorationSqlEditor
        v-model="query"
        :columns="dataset.schema.value?.columns.map(column => column.name) ?? []"
        :disabled="!ready || running"
      />
      <footer class="flex min-h-11 items-center justify-between gap-3 border-t border-[#ddd] bg-[#f6f6f6] px-3 py-1.5">
        <span class="text-[12px] leading-4 text-[#666]">Requêtes SELECT et WITH uniquement</span>
        <button
          class="agent-focusable agent-pressable h-7 shrink-0 rounded-sm bg-[#000091] px-2.5 text-[11px] font-medium text-white hover:bg-[#1212ff] disabled:cursor-not-allowed disabled:bg-[#929292]"
          :disabled="!ready || !query.trim() || running"
          type="button"
          @click="runQuery"
        >
          {{ running ? "Exécution…" : "Exécuter" }}
        </button>
      </footer>
    </div>

    <ExplorationStatusMessage
      v-if="!ready"
      class="mt-3"
      message="Chargez d’abord une ressource depuis l’explorateur."
      title="Aucune ressource chargée"
      tone="info"
    />
    <ExplorationStatusMessage
      v-else-if="error"
      class="mt-3"
      :message="error"
      title="La requête n’a pas pu être exécutée"
      tone="error"
    />

    <div v-if="result" class="agent-surface mt-3 min-h-0 overflow-hidden">
      <header class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-[#ddd] bg-[#f6f6f6] px-3 py-1.5">
        <span class="text-[12px] font-semibold text-[#555]">Résultat</span>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <span class="tabular-nums text-[12px] text-[#777]">
            {{ result.rowCount.toLocaleString("fr-FR") }} ligne{{ result.rowCount > 1 ? "s" : "" }} · {{ result.elapsedMs }} ms
            <template v-if="result.truncated"> · résultat limité</template>
          </span>
          <button
            class="agent-focusable agent-pressable h-7 rounded-sm px-2 text-[11px] font-medium"
            :class="applied
              ? 'border border-[#46fd89] bg-[#b8fec9] text-[#18753c]'
              : 'bg-[#000091] text-white hover:bg-[#1212ff]'"
            :disabled="applied || query.trim() !== executedQuery"
            type="button"
            @click="applyToExplorer"
          >
            {{ applied ? "Appliquée" : "Appliquer à l’explorateur" }}
          </button>
        </div>
      </header>
      <div class="max-h-[22rem] overflow-auto">
        <table class="min-w-max border-collapse text-left font-mono text-[12px] leading-5">
          <thead class="sticky top-0 z-10 bg-[#f6f6f6]">
            <tr>
              <th
                v-for="column in result.columns"
                :key="column"
                class="whitespace-nowrap border-b border-r border-[#ddd] px-2 py-1.5 font-semibold text-[#161616] last:border-r-0"
              >{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in result.rows" :key="rowIndex" class="odd:bg-white even:bg-[#fafafa]">
              <td
                v-for="column in result.columns"
                :key="column"
                class="max-w-[17.5rem] whitespace-nowrap border-b border-r border-[#eee] px-2 py-1 text-[#3a3a3a] last:border-r-0"
                :class="row[column] === null ? 'text-[#929292]' : ''"
              >
                <span class="block max-w-[17.5rem] overflow-hidden text-ellipsis">{{ displayValue(row[column] ?? null) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
