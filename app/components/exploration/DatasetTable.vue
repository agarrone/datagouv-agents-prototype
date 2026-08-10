<script setup lang="ts">
import type { DatasetColumn, DatasetRow } from "~~/shared/types/exploration";

const props = defineProps<{
  columns: readonly string[];
  schemaColumns: readonly DatasetColumn[];
  rows: readonly DatasetRow[];
  showTypes: boolean;
}>();

function typeFor(column: string) {
  return props.schemaColumns.find(item => item.name === column)?.type;
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[58rem] border-collapse text-[13px]">
      <thead>
        <tr class="bg-[#f6f6f6] text-left">
          <th v-for="column in columns" :key="column" class="border-b border-r border-[#e5e5e5] px-4 py-3 font-bold">
            {{ column }}
            <span v-if="showTypes" class="mt-1 block font-normal text-[#555555]">{{ typeFor(column) }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
          <td v-for="column in columns" :key="column" class="max-w-64 truncate border-b border-r border-[#e5e5e5] px-4 py-3">
            {{ row[column] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
