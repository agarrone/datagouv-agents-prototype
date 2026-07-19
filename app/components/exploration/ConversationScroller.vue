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
      class="agent-conversation-scroll h-full overflow-y-auto px-5 py-4"
      @scroll.passive="updateScrollButton"
    >
      <div class="space-y-5">
        <slot />
      </div>
    </div>
    <button
      v-if="showScrollButton"
      aria-label="Revenir au dernier message"
      class="absolute bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[#c6c6c6] bg-white text-[#161616] shadow-sm hover:border-[#000091] hover:text-[#000091]"
      type="button"
      @click="scrollToBottom"
    >
      <span aria-hidden="true">↓</span>
    </button>
  </div>
</template>

<style scoped>
.agent-conversation-scroll {
  mask-image: linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
}
</style>
