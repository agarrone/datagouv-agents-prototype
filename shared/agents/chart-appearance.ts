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

export function isChartPalettePreset(value: string): value is ChartPalettePreset {
  return value in chartColorPalettes;
}
