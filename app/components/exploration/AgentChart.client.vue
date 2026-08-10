<script setup lang="ts">
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  AriaComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import {
  init,
  use,
  type EChartsCoreOption,
  type EChartsType,
} from "echarts/core";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import type {
  ChartSpec,
  DatasetRow,
} from "~~/shared/types/exploration";

const props = defineProps<{
  spec: ChartSpec;
  rows: DatasetRow[];
  truncated: boolean;
  source?: string;
  playCompletionSound?: boolean;
}>();

use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  ScatterChart,
  SVGRenderer,
  TooltipComponent,
]);

const chartElement = ref<HTMLElement | null>(null);
const copyMenu = ref<HTMLDetailsElement | null>(null);
const isFullscreen = ref(false);
const copyStatus = ref("");
const { playUiSound } = useUiSound();
let chart: EChartsType | undefined;
let resizeObserver: ResizeObserver | undefined;
let completionSoundPlayed = false;
let copyStatusTimer: ReturnType<typeof setTimeout> | undefined;
let previousBodyOverflow = "";

const colors = ["#000091", "#E1000F", "#18753C", "#A558A0"];

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function chartOption(): EChartsCoreOption {
  const common = {
    animationDuration: 450,
    aria: {
      enabled: true,
      description: props.spec.description,
    },
    color: colors,
    textStyle: {
      fontFamily: "Marianne, Arial, sans-serif",
      fontWeight: 400,
      color: "#161616",
    },
    tooltip: {
      trigger: props.spec.type === "pie" ? "item" : "axis",
      backgroundColor: "#ffffff",
      borderColor: "#777777",
      borderWidth: 1,
      padding: 12,
      textStyle: {
        color: "#161616",
        fontFamily: "Marianne, Arial, sans-serif",
        fontWeight: 400,
      },
    },
  };

  if (props.spec.type === "pie") {
    const valueSeries = props.spec.series[0];
    return {
      ...common,
      legend: {
        bottom: 0,
        type: "scroll",
      },
      series: [{
        name: valueSeries?.label ?? "Valeur",
        type: "pie",
        radius: ["42%", "70%"],
        center: ["50%", "44%"],
        data: props.rows.map(row => ({
          name: String(row[props.spec.xField] ?? ""),
          value: numericValue(row[valueSeries?.field ?? ""]),
        })),
        label: {
          overflow: "truncate",
        },
      }],
    };
  }

  const isScatter = props.spec.type === "scatter";
  return {
    ...common,
    dataset: isScatter ? undefined : {
      source: props.rows,
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 55,
      left: 60,
      containLabel: true,
    },
    legend: {
      show: props.spec.series.length > 1,
      bottom: 0,
    },
    xAxis: {
      name: props.spec.xLabel,
      nameLocation: "middle",
      nameGap: 36,
      type: isScatter ? "value" : "category",
      axisLabel: {
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
    },
    series: props.spec.series.map((series, index) => {
      if (isScatter) {
        return {
          name: series.label,
          type: "scatter",
          symbolSize: 9,
          data: props.rows.map(row => [
            numericValue(row[props.spec.xField]),
            numericValue(row[series.field]),
          ]),
        };
      }

      const isArea = props.spec.type === "area";
      return {
        name: series.label,
        type: props.spec.type === "bar" ? "bar" : "line",
        encode: {
          x: props.spec.xField,
          y: series.field,
          tooltip: [props.spec.xField, series.field],
        },
        areaStyle: isArea ? { opacity: 0.18 } : undefined,
        smooth: props.spec.type === "line" || isArea,
        itemStyle: {
          color: colors[index % colors.length],
        },
      };
    }),
  };
}

function renderChart() {
  if (!chartElement.value) return;
  chart ??= init(chartElement.value, undefined, { renderer: "canvas" });
  chart.setOption(chartOption(), true);
  if (props.playCompletionSound !== false && !completionSoundPlayed) {
    completionSoundPlayed = true;
    window.requestAnimationFrame(() => playUiSound("sparkle"));
  }
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value: string, maximumLength = 100) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maximumLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function createExportSvg() {
  const chartWidth = 880;
  const chartHeight = 460;
  const descriptionLines = wrapText(props.spec.description);
  const headerHeight = 76 + Math.max(0, descriptionLines.length - 1) * 20;
  const footerHeight = props.source ? 44 : 20;
  const width = 960;
  const height = headerHeight + chartHeight + footerHeight;
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${chartWidth}px;height:${chartHeight}px`;
  document.body.append(container);
  const svgChart = init(container, undefined, {
    renderer: "svg",
    width: chartWidth,
    height: chartHeight,
  });

  try {
    svgChart.setOption({ ...chartOption(), animation: false }, true);
    const chartSvg = container.querySelector("svg")?.outerHTML;
    if (!chartSvg) throw new Error("SVG indisponible");
    const embeddedChart = chartSvg.replace(
      /<svg[^>]*>/,
      `<svg x="40" y="${headerHeight}" width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}">`,
    );
    const description = descriptionLines.map((line, index) => (
      `<text x="40" y="${58 + index * 20}" font-family="Marianne,Arial,sans-serif" font-size="14" font-weight="400" fill="#555555">${escapeXml(line)}</text>`
    )).join("");
    const source = props.source
      ? `<text x="40" y="${height - 17}" font-family="Marianne,Arial,sans-serif" font-size="11" font-weight="400" fill="#555555">Source : ${escapeXml(props.source)}</text>`
      : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#ffffff" />
      <text x="40" y="32" font-family="Marianne,Arial,sans-serif" font-size="18" font-weight="700" fill="#161616">${escapeXml(props.spec.title)}</text>
      ${description}
      <line x1="0" y1="${headerHeight - 1}" x2="${width}" y2="${headerHeight - 1}" stroke="#e5e5e5" />
      ${embeddedChart}
      ${props.source ? `<line x1="0" y1="${height - footerHeight}" x2="${width}" y2="${height - footerHeight}" stroke="#e5e5e5" />` : ""}
      ${source}
    </svg>`;
  } finally {
    svgChart.dispose();
    container.remove();
  }
}

async function svgToPng(svg: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth * 2;
    canvas.height = image.naturalHeight * 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible");
    context.scale(2, 2);
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG indisponible")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function setCopyStatus(message: string) {
  copyStatus.value = message;
  if (copyStatusTimer) clearTimeout(copyStatusTimer);
  copyStatusTimer = setTimeout(() => {
    copyStatus.value = "";
  }, 1800);
}

async function copyPng() {
  try {
    const blob = await svgToPng(createExportSvg());
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setCopyStatus("Image copiée");
  } catch {
    setCopyStatus("Copie impossible");
  }
}

async function copySvg() {
  try {
    const svg = createExportSvg();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": new Blob([svg], { type: "image/svg+xml" }),
          "text/plain": new Blob([svg], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(svg);
    }
    setCopyStatus("SVG copié");
  } catch {
    setCopyStatus("Copie impossible");
  }
}

function closeCopyMenu(event: PointerEvent) {
  if (copyMenu.value?.open && !copyMenu.value.contains(event.target as Node)) {
    copyMenu.value.open = false;
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && isFullscreen.value) isFullscreen.value = false;
}

onMounted(() => {
  renderChart();
  if (chartElement.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
  document.addEventListener("pointerdown", closeCopyMenu);
  document.addEventListener("keydown", handleEscape);
});

watch(isFullscreen, async (fullscreen) => {
  if (fullscreen) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = previousBodyOverflow;
  }
  await nextTick();
  chart?.resize();
});

watch(
  () => [props.spec, props.rows],
  renderChart,
  { deep: true },
);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeCopyMenu);
  document.removeEventListener("keydown", handleEscape);
  if (isFullscreen.value) document.body.style.overflow = previousBodyOverflow;
  if (copyStatusTimer) clearTimeout(copyStatusTimer);
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<template>
  <Teleport to="body" :disabled="!isFullscreen">
    <div
      :class="isFullscreen ? 'fixed inset-0 z-[150] bg-white' : ''"
      :data-fullscreen="isFullscreen ? 'true' : 'false'"
    >
      <ExplorationResultCard
        class="flex h-full flex-col"
        :content-class="isFullscreen ? 'min-h-0 flex-1 p-5' : 'p-5'"
        :description="spec.description"
        :source="source"
        :title="spec.title"
        title-weight="bold"
      >
        <template #actions>
          <details ref="copyMenu" class="relative z-30">
            <summary
              aria-label="Copier le graphique"
              class="agent-focusable flex h-8 w-8 cursor-pointer list-none items-center justify-center border border-[#e5e5e5] bg-white text-[#555555] hover:bg-[#f6f6f6] [&::-webkit-details-marker]:hidden"
              title="Copier le graphique"
            >
              <i aria-hidden="true" class="ri-file-copy-line text-base leading-none" />
            </summary>
            <div class="absolute right-0 top-[calc(100%+4px)] z-50 w-44 rounded-md border border-[#e5e5e5] bg-white p-1 shadow-[0_2px_4px_rgba(0,0,0,0.04),2px_4px_16px_rgba(0,0,0,0.12)]">
              <button class="agent-focusable flex h-8 w-full items-center rounded-md px-2.5 text-left text-[12px] leading-4 text-[#555555] hover:bg-[#f6f6f6]" type="button" @click="copyPng">Copier comme image</button>
              <button class="agent-focusable flex h-8 w-full items-center rounded-md px-2.5 text-left text-[12px] leading-4 text-[#555555] hover:bg-[#f6f6f6]" type="button" @click="copySvg">Copier le SVG</button>
              <p v-if="copyStatus" class="mt-1 border-t border-[#e5e5e5] px-2.5 py-1.5 text-[11px] leading-4 text-[#555555]" role="status">{{ copyStatus }}</p>
            </div>
          </details>
          <button
            :aria-label="isFullscreen ? 'Quitter le plein écran' : 'Afficher le graphique en plein écran'"
            class="agent-focusable flex h-8 shrink-0 items-center justify-center gap-2 border border-[#e5e5e5] bg-white text-[12px] font-medium text-[#555555] hover:bg-[#f6f6f6]"
            :class="isFullscreen ? 'px-3' : 'w-8'"
            :title="isFullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'"
            type="button"
            @click="isFullscreen = !isFullscreen"
          >
            <i aria-hidden="true" :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'" class="text-base leading-none" />
            <span v-if="isFullscreen">Réduire</span>
          </button>
        </template>
        <div ref="chartElement" :class="isFullscreen ? 'h-full min-h-0' : 'h-72'" class="w-full" />
      </ExplorationResultCard>
    </div>
  </Teleport>
</template>
