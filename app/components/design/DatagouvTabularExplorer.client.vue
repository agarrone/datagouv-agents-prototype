<script setup lang="ts">
import { TabularExplorer } from "@datagouv/components-next/dist/components-next.js";

defineProps<{
  resourceId: string;
}>();

const specimen = ref<HTMLElement | null>(null);
let observer: MutationObserver | undefined;
let floatingPanelObserver: MutationObserver | undefined;
let desktopPoll: ReturnType<typeof setInterval> | undefined;

function enforceDesktopVariant() {
  const root = specimen.value;
  if (!root) return;

  root.querySelectorAll<HTMLElement>(".md\\:hidden").forEach((element) => {
    element.style.setProperty("display", "none", "important");
  });
  root.querySelectorAll<HTMLElement>(".hidden.md\\:block").forEach((element) => {
    element.style.setProperty("display", "block", "important");
  });
  root.querySelectorAll<HTMLElement>(".hidden.md\\:inline").forEach((element) => {
    element.style.setProperty("display", "inline", "important");
  });

  const table = root.querySelector("table");
  const tableContainer = table?.parentElement;
  tableContainer?.style.setProperty("max-height", "34rem", "important");
  tableContainer?.style.setProperty("margin-inline", "0", "important");

  const tableHost = tableContainer?.parentElement;
  const toolbar = tableHost?.querySelector<HTMLElement>(":scope > div:first-child");
  toolbar?.style.setProperty("min-height", "48px", "important");
  toolbar?.style.setProperty("padding", "8px 16px", "important");
  toolbar?.style.setProperty("border-bottom", "1px solid #e5e5e5", "important");

  const head = root.querySelector<HTMLElement>("thead");
  head?.style.setProperty("background", "#f6f6f6", "important");
  head?.style.setProperty("box-shadow", "inset 0 -1px 0 #e5e5e5", "important");

  root.querySelectorAll<HTMLElement>("th").forEach((cell) => {
    cell.style.setProperty("height", "48px", "important");
    cell.style.setProperty("padding", "5px 12px", "important");
    cell.style.setProperty("border-color", "#e5e5e5", "important");
  });
  root.querySelectorAll<HTMLElement>("th .relative.shrink-0").forEach((filter) => {
    filter.style.setProperty("margin-top", "0", "important");
  });
  root.querySelectorAll<HTMLElement>("th .font-extrabold").forEach((label) => {
    label.style.setProperty("font-size", "13px", "important");
    label.style.setProperty("font-weight", "700", "important");
    label.style.setProperty("line-height", "18px", "important");
  });
  root.querySelectorAll<HTMLElement>("th .font-mono").forEach((type) => {
    type.style.setProperty("margin-top", "0", "important");
    type.style.setProperty("color", "#555555", "important");
    type.style.setProperty("font-family", "var(--font-mono)", "important");
    type.style.setProperty("font-size", "11px", "important");
    type.style.setProperty("font-weight", "400", "important");
    type.style.setProperty("line-height", "16px", "important");
  });
  root.querySelectorAll<HTMLElement>("td").forEach((cell) => {
    cell.style.setProperty("height", "36px", "important");
    cell.style.setProperty("padding", "8px 12px", "important");
    cell.style.setProperty("border-color", "#e5e5e5", "important");
    cell.style.setProperty("font-size", "12px", "important");
    cell.style.setProperty("line-height", "18px", "important");
  });
}

function styleFloatingPanels() {
  const target = specimen.value?.querySelector<HTMLElement>("#tooltips");
  if (!target) return;
  target.querySelectorAll<HTMLElement>("[data-headlessui-state]").forEach((panel) => {
    panel.style.setProperty("border-color", "#e5e5e5", "important");
    panel.style.setProperty("border-radius", "6px", "important");
    panel.style.setProperty("background", "#ffffff", "important");
    panel.style.setProperty("font-size", "12px", "important");
    panel.style.setProperty("box-shadow", "0 4px 12px rgb(0 0 0 / 12%)", "important");
  });
}

onMounted(() => {
  enforceDesktopVariant();
  observer = new MutationObserver(enforceDesktopVariant);
  if (specimen.value) observer.observe(specimen.value, { childList: true, subtree: true });
  const floatingPanels = specimen.value?.querySelector<HTMLElement>("#tooltips");
  if (floatingPanels) {
    floatingPanelObserver = new MutationObserver(styleFloatingPanels);
    floatingPanelObserver.observe(floatingPanels, { childList: true, subtree: true });
  }
  desktopPoll = setInterval(() => {
    enforceDesktopVariant();
    if (specimen.value?.querySelector(".hidden.md\\:block")) {
      clearInterval(desktopPoll);
      desktopPoll = undefined;
    }
  }, 100);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  floatingPanelObserver?.disconnect();
  if (desktopPoll) clearInterval(desktopPoll);
});
</script>

<template>
  <div ref="specimen" class="datagouv-tabular-specimen min-w-0 bg-white">
    <TabularExplorer :resource-id="resourceId" />
    <div id="tooltips" />
  </div>
</template>
