<template>
  <div class="min-h-0 flex-1 bg-white p-3" aria-label="Chargement de l’aperçu" role="status">
    <div class="animate-pulse space-y-2">
      <div class="grid h-10 grid-cols-5 gap-px overflow-hidden rounded-md border border-[#e5e5e5] bg-[#e5e5e5]">
        <div v-for="index in 5" :key="`skeleton-header-${index}`" class="bg-[#f6f6f6] p-3">
          <div class="h-3 w-2/3 rounded bg-[#dddddd]" />
        </div>
      </div>
      <div class="overflow-hidden rounded-md border border-[#e5e5e5]">
        <div v-for="rowIndex in 9" :key="`skeleton-row-${rowIndex}`" class="grid h-8 grid-cols-5 gap-px border-b border-[#eeeeee] last:border-b-0">
          <div v-for="cellIndex in 5" :key="`skeleton-cell-${rowIndex}-${cellIndex}`" class="px-3 py-2">
            <div class="h-2.5 rounded bg-[#eeeeee]" :style="{ width: `${45 + ((rowIndex + cellIndex) % 4) * 12}%` }" />
          </div>
        </div>
      </div>
    </div>
    <p class="mt-3 text-center text-[12px] leading-5 text-[#555555]">Chargement du fichier Parquet…</p>
  </div>
</template>
