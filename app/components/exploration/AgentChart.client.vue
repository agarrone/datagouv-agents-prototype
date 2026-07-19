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
import { CanvasRenderer } from "echarts/renderers";
import type {
  ChartSpec,
  DatasetRow,
} from "~~/shared/types/exploration";

const props = defineProps<{
  spec: ChartSpec;
  rows: DatasetRow[];
  truncated: boolean;
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
  TooltipComponent,
]);

const chartElement = ref<HTMLElement | null>(null);
let chart: EChartsType | undefined;
let resizeObserver: ResizeObserver | undefined;

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
      color: "#161616",
    },
    tooltip: {
      trigger: props.spec.type === "pie" ? "item" : "axis",
      backgroundColor: "#ffffff",
      borderColor: "#929292",
      borderWidth: 1,
      padding: 12,
      textStyle: {
        color: "#161616",
        fontFamily: "Marianne, Arial, sans-serif",
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
}

onMounted(() => {
  renderChart();
  if (chartElement.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
});

watch(
  () => [props.spec, props.rows],
  renderChart,
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<template>
  <figure class="border border-[#ddd] bg-white">
    <header class="border-b border-[#ddd] px-5 py-4">
      <h3 class="font-bold">{{ spec.title }}</h3>
      <p class="mt-1 text-sm leading-6 text-[#666]">
        {{ spec.description }}
      </p>
    </header>
    <div ref="chartElement" class="h-80 w-full" />
    <figcaption
      class="flex items-center justify-between gap-4 border-t border-[#ddd] px-5 py-3 text-xs text-[#666]"
    >
      <span>{{ rows.length }} points affichés</span>
      <span v-if="truncated">Résultat limité aux 1 000 premiers points</span>
      <span v-else>Données calculées localement</span>
    </figcaption>
  </figure>
</template>
