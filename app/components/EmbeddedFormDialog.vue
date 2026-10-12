<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  formUrl: string;
}>();

const emit = defineEmits<{ close: [] }>();

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[180] grid place-items-center bg-[#161616]/40 p-3 backdrop-blur-[1px] sm:p-6" role="presentation" @mousedown.self="emit('close')">
      <section class="flex h-[calc(100dvh-24px)] w-full max-w-[720px] flex-col overflow-hidden rounded-md border border-[#e5e5e5] border-t-4 border-t-[#000091] bg-white shadow-[0_16px_48px_rgba(0,0,18,0.22)] sm:h-[min(760px,calc(100dvh-48px))]" role="dialog" aria-modal="true" aria-labelledby="embedded-form-title" aria-describedby="embedded-form-description">
        <header class="flex items-start justify-between gap-5 border-b border-[#e5e5e5] px-4 py-4 sm:px-6 sm:py-5">
          <div class="max-w-[580px]">
            <p class="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Prototype data.gouv.fr</p>
            <h2 id="embedded-form-title" class="text-[18px] font-semibold leading-6">{{ title }}</h2>
            <p id="embedded-form-description" class="mt-1 text-[13px] leading-5 text-[#555555]">{{ description }}</p>
          </div>
          <button class="agent-focusable agent-pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[#f6f6f6]" aria-label="Fermer le formulaire" title="Fermer" type="button" @click="emit('close')">
            <i aria-hidden="true" class="ri-close-line text-xl" />
          </button>
        </header>
        <div class="min-h-0 flex-1 bg-[#f6f6f6] p-2 sm:p-3">
          <iframe :src="formUrl" class="h-full min-h-0 w-full border border-[#e5e5e5] bg-white" loading="lazy" :title="title" />
        </div>
      </section>
    </div>
  </Teleport>
</template>
