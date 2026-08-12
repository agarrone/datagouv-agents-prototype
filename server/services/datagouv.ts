import type { z } from "zod";
import type {
  datasetMetadataOutputSchema,
} from "~~/shared/agents/exploration-tools";
import type {
  DatagouvDatasetChoice,
  DatagouvDatasetPageMetadata,
  DatagouvResourceChoice,
} from "~~/shared/data/exploration-resources";

type DatasetMetadata = z.infer<typeof datasetMetadataOutputSchema>;

interface DatagouvDatasetResponse {
  id?: string;
  slug?: string;
  title?: string;
  acronym?: string | null;
  description?: string | null;
  page?: string;
  license?: string | null;
  last_update?: string | null;
  last_modified?: string | null;
  organization?: {
    name?: string;
    logo_thumbnail?: string | null;
    logo?: string | null;
    page?: string | null;
  } | null;
  metrics?: {
    views?: number;
    resources_downloads?: number;
    reuses?: number;
    discussions?: number;
  } | null;
  community_resources?: unknown[];
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

function extractDatasetReference(input: string) {
  const value = input.trim();
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/datasets\/([^/]+)/);
    if (match?.[1]) return match[1];
  } catch {
    // The value may already be a dataset slug or identifier.
  }
  return value.replace(/^\/+|\/+$/g, "");
}

function parquetResources(dataset: DatagouvDatasetResponse): DatagouvResourceChoice[] {
  return (dataset.resources ?? []).flatMap((resource, index) => {
    const format = resource.format?.trim().toUpperCase() || "FICHIER";
    const parquetUrl = resource.extras?.["analysis:parsing:parquet_url"]
      ?? (format === "PARQUET" ? resource.url ?? null : null);
    return parquetUrl
      ? [{
          id: resource.id ?? `resource-${index}`,
          title: resource.title?.trim() || "Ressource sans titre",
          format,
          parquetUrl,
        }]
      : [];
  });
}

function datasetChoice(dataset: DatagouvDatasetResponse): DatagouvDatasetChoice {
  const id = dataset.id ?? "";
  return {
    id,
    slug: dataset.slug ?? id,
    title: dataset.title ?? "Jeu de données",
    organization: dataset.organization?.name ?? "Producteur non renseigné",
    resources: parquetResources(dataset),
  };
}

export async function searchDatasets(query: string): Promise<DatagouvDatasetChoice[]> {
  const params = new URLSearchParams({ q: query, page_size: "8" });
  const response = await fetch(`${apiBaseUrl}/datasets/?${params}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`La recherche data.gouv.fr répond ${response.status}.`);
  const payload = await response.json() as { data?: DatagouvDatasetResponse[] };
  return (payload.data ?? []).map(datasetChoice).filter(dataset => dataset.resources.length > 0);
}

export async function resolveDataset(input: string): Promise<DatagouvDatasetChoice> {
  const reference = extractDatasetReference(input);
  const response = await fetch(
    `${apiBaseUrl}/datasets/${encodeURIComponent(reference)}/`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Le jeu de données data.gouv.fr répond ${response.status}.`);
  return datasetChoice(await response.json() as DatagouvDatasetResponse);
}

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

export async function fetchDatasetPageMetadata(
  reference: string,
): Promise<DatagouvDatasetPageMetadata> {
  const response = await fetch(
    `${apiBaseUrl}/datasets/${encodeURIComponent(extractDatasetReference(reference))}/`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`Les métadonnées data.gouv.fr répondent ${response.status}.`);
  }

  const dataset = await response.json() as DatagouvDatasetResponse;
  const id = dataset.id ?? reference;
  const slug = dataset.slug ?? id;
  return {
    id,
    slug,
    title: dataset.title ?? "Jeu de données",
    acronym: dataset.acronym?.trim() || null,
    description: dataset.description ?? "",
    page: dataset.page ?? `https://www.data.gouv.fr/fr/datasets/${slug}/`,
    license: licenseLabel(dataset.license),
    lastUpdate: dataset.last_update ?? dataset.last_modified ?? null,
    qualityScore: dataset.quality?.score ?? null,
    organization: {
      name: dataset.organization?.name ?? "Producteur non renseigné",
      logo: dataset.organization?.logo_thumbnail ?? dataset.organization?.logo ?? null,
      page: dataset.organization?.page ?? null,
    },
    metrics: {
      views: dataset.metrics?.views ?? 0,
      downloads: dataset.metrics?.resources_downloads ?? 0,
      reuses: dataset.metrics?.reuses ?? 0,
      discussions: dataset.metrics?.discussions ?? 0,
    },
    resourceCount: dataset.resources?.length ?? 0,
    communityResourceCount: dataset.community_resources?.length ?? 0,
  };
}
