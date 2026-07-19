import type { ChartSpec, MapSpec } from "../types/exploration";

export function chartRequiredFields(spec: ChartSpec) {
  return [spec.xField, ...spec.series.map(series => series.field)];
}

export function mapRequiredFields(spec: MapSpec) {
  const fields = [spec.labelField, spec.valueField];
  if (spec.type === "points") {
    fields.push(spec.latitudeField, spec.longitudeField);
  } else if (spec.type === "geojson") {
    fields.push(spec.geojsonField);
  } else {
    fields.push(spec.dataKey);
  }
  return [...new Set(fields.filter((field): field is string => Boolean(field)))];
}
