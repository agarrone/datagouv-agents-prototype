<script setup lang="ts">
defineProps<{
  rowCount: number;
  columnCount: number;
  viewTitle?: string;
}>();

defineEmits<{ reset: [] }>();
</script>

<template>
  <div class="flex min-h-12 flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#e5e5e5] px-5 py-2 text-[13px]">
    <span><strong>{{ rowCount.toLocaleString("fr-FR") }}</strong> lignes</span>
    <span><strong>{{ columnCount }}</strong> colonnes</span>
    <span v-if="viewTitle" class="font-medium text-[#000091]">Vue : {{ viewTitle }}</span>
    <span v-else class="text-[#18753c]">Exécution locale prête</span>
    <button v-if="viewTitle" class="ml-auto text-[#000091] underline" type="button" @click="$emit('reset')">
      Revenir aux données initiales
    </button>
  </div>
</template>
