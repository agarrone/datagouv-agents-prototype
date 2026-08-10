<script setup lang="ts">
const props = defineProps<{
  choices: string[];
  question: string;
  selected?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [choice: string];
}>();
</script>

<template>
  <section class="my-2" aria-label="Précision demandée par l’assistant">
    <p class="text-[13px] leading-5 text-[#161616]">
      {{ question }}
    </p>
    <div class="mt-2 flex flex-wrap gap-1.5">
      <ExplorationSuggestion
        v-for="choice in choices"
        :key="choice"
        compact
        :disabled="disabled || Boolean(selected)"
        :class="selected === choice ? '!border-[#000091] !bg-[#ececfe] !text-[#000091] !opacity-100' : ''"
        @select="emit('select', choice)"
      >
        {{ choice }}
      </ExplorationSuggestion>
    </div>
    <p v-if="selected" class="mt-1.5 text-[11px] leading-4 text-[#555555]">
      Choix retenu : {{ selected }}
    </p>
  </section>
</template>
