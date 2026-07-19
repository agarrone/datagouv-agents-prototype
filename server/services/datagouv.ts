import type { z } from "zod";
import type {
  datasetMetadataOutputSchema,
} from "~~/shared/agents/exploration-tools";

type DatasetMetadata = z.infer<typeof datasetMetadataOutputSchema>;

interface DatagouvDatasetResponse {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  page?: string;
  license?: string | null;
  last_update?: string | null;
  last_modified?: string | null;
  organization?: {
    name?: string;
  } | null;
  quality?: {
    score?: number;
  } | null;
  resources?: Array<{
    id?: string;
    title?: string;
    format?: string | null;
    url?: string | null;
    extras?: {
      "analysis:parsing:parquet_url"?: string | null;
    } | null;
  }>;
}

const apiBaseUrl = "https://www.data.gouv.fr/api/1";

function licenseLabel(license?: string | null) {
  if (!license) return "Licence non renseignée";
  if (license === "lov2") {
    return "Licence Ouverte / Open Licence version 2.0";
  }
  return license;
}

export async function fetchDatasetMetadata(
  reference: string,
): Promise<DatasetMetadata> {
  const response = await fetch(
    `${apiBaseUrl}/datasets/${encodeURIComponent(reference)}/`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(
      `Les métadonnées data.gouv.fr répondent ${response.status}.`,
    );
  }

  const dataset = await response.json() as DatagouvDatasetResponse;
  const id = dataset.id ?? reference;
  const slug = dataset.slug ?? reference;

  return {
    id,
    slug,
    title: dataset.title ?? "Jeu de données",
    description: dataset.description ?? "",
    organization:
      dataset.organization?.name ?? "Producteur non renseigné",
    license: licenseLabel(dataset.license),
    page:
      dataset.page ?? `https://www.data.gouv.fr/datasets/${slug}`,
    lastUpdate: dataset.last_update ?? dataset.last_modified ?? null,
    qualityScore: dataset.quality?.score ?? null,
    resources: (dataset.resources ?? []).map((resource, index) => {
      const format = resource.format?.trim().toUpperCase() || "FICHIER";
      return {
        id: resource.id ?? `resource-${index}`,
        title: resource.title?.trim() || "Ressource sans titre",
        format,
        url: resource.url ?? null,
        parquetUrl:
          resource.extras?.["analysis:parsing:parquet_url"]
          ?? (format === "PARQUET" ? resource.url ?? null : null),
      };
    }),
  };
}
