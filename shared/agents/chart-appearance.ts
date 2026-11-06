export const chartColorPalettes = {
  france: {
    label: "France",
    colors: ["#000091", "#E1000F", "#18753C", "#A558A0"],
  },
  ocean: {
    label: "Océan",
    colors: ["#417DC4", "#009081", "#6A6AF4", "#00A95F"],
  },
  illustration: {
    label: "Illustration",
    colors: ["#000091", "#E4794A", "#18753C", "#A558A0", "#A26859", "#66673D"],
  },
  warm: {
    label: "Chaleureuse",
    colors: ["#E4794A", "#FDCF41", "#A55800", "#CE614A"],
  },
  soft: {
    label: "Douce",
    colors: ["#8585F6", "#E18B76", "#34CB6A", "#D1B781"],
  },
} as const;

export type ChartPalettePreset = keyof typeof chartColorPalettes;
export type ChartPaletteChoice = ChartPalettePreset | "custom";

export type ChartLegendPosition = "top" | "bottom" | "left" | "right";
export type ChartValueFormat = "number" | "percent" | "currency";
export type ChartSizeChoice = "small" | "medium" | "large";
export type ChartOpacityChoice = "light" | "medium" | "strong";

/**
 * Product-level chart styling contract shared by the assistant, manual editor
 * and ECharts renderer. It intentionally exposes a small, stable subset of
 * ECharts instead of leaking raw ECharts options into saved visualizations.
 */
export interface ChartAppearance {
  orientation?: "horizontal" | "vertical";
  palette?: string[];
  showLegend?: boolean;
  legendPosition?: ChartLegendPosition;
  showValues?: boolean;
  valueFormat?: ChartValueFormat;
  valuePrecision?: number;
  valueMin?: number;
  valueMax?: number;
  /** @deprecated Read for visualizations saved before valueMin/valueMax. */
  yMin?: number;
  /** @deprecated Read for visualizations saved before valueMin/valueMax. */
  yMax?: number;
  unit?: string;
  unitPosition?: "prefix" | "suffix";
  barWidth?: ChartSizeChoice;
  roundedBars?: boolean;
  lineSmooth?: boolean;
  showPoints?: boolean;
  lineWidth?: ChartSizeChoice;
  areaOpacity?: ChartOpacityChoice;
  pieShape?: "pie" | "donut";
  pieLabelContent?: "value" | "percent" | "category_percent";
  pieLabelPosition?: "inside" | "outside";
  pointSize?: ChartSizeChoice;
  pointOpacity?: ChartOpacityChoice;
}

export function isChartPalettePreset(value: string): value is ChartPalettePreset {
  return value in chartColorPalettes;
}
