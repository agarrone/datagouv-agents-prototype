<script setup lang="ts">
const props = defineProps<{
  messageCount: number;
  responding: boolean;
}>();

const container = ref<HTMLElement | null>(null);
const showScrollButton = ref(false);
let previousMessageCount = 0;

function updateScrollButton() {
  if (!container.value) return;
  const distance = container.value.scrollHeight
    - container.value.scrollTop
    - container.value.clientHeight;
  showScrollButton.value = distance > 120;
}

function scrollToBottom() {
  container.value?.scrollTo({
    top: container.value.scrollHeight,
    behavior: "smooth",
  });
}

watch(
  () => props.messageCount,
  async (count) => {
    if (count <= previousMessageCount) {
      previousMessageCount = count;
      return;
    }
    previousMessageCount = count;
    await nextTick();
    const userMessages = container.value?.querySelectorAll<HTMLElement>(
      '[data-message-role="user"]',
    );
    userMessages?.item(userMessages.length - 1)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  },
  { immediate: true },
);

watch(
  () => props.responding,
  async () => {
    await nextTick();
    updateScrollButton();
  },
);

onMounted(updateScrollButton);
</script>

<template>
  <div class="relative min-h-0 flex-1">
    <div
      ref="container"
      class="agent-conversation-scroll h-full overflow-y-auto px-5 py-5 md:px-6"
      @scroll.passive="updateScrollButton"
    >
      <div class="mx-auto max-w-[42rem] space-y-6">
        <slot />
      </div>
    </div>
    <button
      v-if="showScrollButton"
      aria-label="Revenir au dernier message"
      class="agent-focusable agent-pressable absolute bottom-3 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[#161616] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.05)] hover:text-[#000091] hover:shadow-[0_0_0_1px_rgba(0,0,145,0.20),0_1px_2px_-1px_rgba(0,0,0,0.10),0_2px_5px_rgba(0,0,0,0.07)]"
      type="button"
      @click="scrollToBottom"
    >
      <i aria-hidden="true" class="ri-arrow-down-line text-base leading-none" />
    </button>
  </div>
</template>

<style scoped>
.agent-conversation-scroll {
  mask-image: linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
}
</style>
