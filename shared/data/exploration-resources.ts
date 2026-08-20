export interface ExplorationResource {
  id: string;
  datasetReference: string;
  title: string;
  organization: string;
  parquetUrl: string;
  resourceName?: string;
}

export interface DatagouvResourceChoice {
  id: string;
  title: string;
  format: string;
  parquetUrl: string;
}

export interface DatagouvDatasetResource {
  id: string;
  title: string;
  format: string;
  url: string | null;
  parquetUrl: string | null;
}

function parquetFileName(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).pathname.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

/**
 * Retrouve la ressource data.gouv.fr derrière une URL Parquet Hydra.
 * Une même analyse peut être exposée par plusieurs domaines, son nom de
 * fichier (l'identifiant de ressource) est donc plus stable que l'URL entière.
 */
export function findMatchingDatasetResource(
  resources: DatagouvDatasetResource[],
  resource: Pick<ExplorationResource, "id" | "parquetUrl">,
) {
  const parquetName = parquetFileName(resource.parquetUrl);
  return resources.find(item =>
    item.id === resource.id
    || item.parquetUrl === resource.parquetUrl
    || Boolean(parquetName && parquetFileName(item.parquetUrl) === parquetName),
  );
}

/**
 * Choisit la ressource initiale d'un jeu de données. Une sélection explicite
 * (identifiant data.gouv.fr ou nom transmis par le sélecteur) est conservée ;
 * sinon l'explorateur ouvre la première ressource réellement exploitable.
 */
export function findInitialDatasetResource(
  resources: DatagouvDatasetResource[],
  resource: ExplorationResource,
) {
  const explicitIdMatch = resources.find(item => item.id === resource.id);
  if (explicitIdMatch?.parquetUrl) return explicitIdMatch;

  if (resource.resourceName?.trim()) {
    const explicitResourceMatch = findMatchingDatasetResource(resources, resource);
    if (explicitResourceMatch?.parquetUrl) return explicitResourceMatch;
  }

  return resources.find(item => Boolean(item.parquetUrl));
}

export function resourceContextName(resource: Pick<ExplorationResource, "resourceName">) {
  return resource.resourceName?.trim() || "Nom de la ressource non disponible";
}

export interface DatagouvDatasetPageMetadata {
  id: string;
  slug: string;
  title: string;
  acronym: string | null;
  description: string;
  page: string;
  license: string;
  lastUpdate: string | null;
  qualityScore: number | null;
  organization: {
    name: string;
    logo: string | null;
    page: string | null;
  };
  metrics: {
    views: number;
    downloads: number;
    reuses: number;
    discussions: number;
  };
  resourceCount: number;
  communityResourceCount: number;
}

export interface DatagouvDatasetChoice {
  id: string;
  slug: string;
  title: string;
  organization: string;
  resources: DatagouvResourceChoice[];
}

export const explorationResources: ExplorationResource[] = [
  {
    id: "catalogue-datagouv",
    datasetReference: "catalogue-des-donnees-de-data-gouv-fr",
    title: "Catalogue des données de data.gouv.fr",
    organization: "data.gouv.fr",
    parquetUrl:
      "https://hydra.s3.rbx.io.cloud.ovh.net/parquet/f868cca6-8da1-4369-a78d-47463f19a9a3.parquet",
  },
  {
    id: "repertoire-elus",
    datasetReference: "repertoire-national-des-elus-1",
    title: "Répertoire national des élus",
    organization: "Ministère de l’Intérieur",
    parquetUrl:
      "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/2876a346-d50c-4911-934e-19ee07b0e503.parquet",
  },
  {
    id: "carte-loyers",
    datasetReference:
      "carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2022",
    title:
      "Carte des loyers — Indicateurs de loyers d’annonce par commune en 2022",
    organization: "Ministère de la Transition écologique",
    parquetUrl:
      "https://hydra.s3.rbx.io.cloud.ovh.net/parquet/dfb542cd-a808-41e2-9157-8d39b5c24edb.parquet",
  },
  {
    id: "statistiques-dvf",
    datasetReference: "statistiques-dvf",
    title: "Statistiques DVF",
    organization: "data.gouv.fr",
    parquetUrl:
      "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/851d342f-9c96-41c1-924a-11a7a7aae8a6.parquet",
  },
  {
    id: "petitions-assemblee",
    datasetReference: "petitions-de-lassemblee-nationale",
    title: "Pétitions de l’Assemblée nationale",
    organization: "data.gouv.fr",
    parquetUrl:
      "https://hydra.s3.rbx.io.cloud.ovh.net/parquet/c94c9dfe-23eb-45aa-acd1-7438c4e977db.parquet",
  },
  {
    id: "logements-vacants",
    datasetReference:
      "logements-vacants-du-parc-prive-par-commune-departement-region-france-de-2020-a-2026",
    title:
      "Logements vacants du parc privé par commune, département, région et France, de 2020 à 2026",
    organization: "Ministère de la Transition écologique",
    parquetUrl:
      "https://hydra.s3.rbx.io.cloud.ovh.net/parquet/41744167-0321-4e22-8e4f-6974522d5185.parquet",
  },
  {
    id: "festivals-france",
    datasetReference: "liste-des-festivals-en-france",
    title: "Liste des festivals en France",
    organization: "Ministère de la Culture",
    parquetUrl:
      "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/47ac11c2-8a00-46a7-9fa8-9b802643f975.parquet",
  },
  {
    id: "radars-fixes",
    datasetReference: "liste-des-radars-fixes-en-france",
    title: "Liste des radars fixes en France",
    organization: "Ministère de l’Intérieur",
    parquetUrl:
      "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/17f7cfd9-a5fe-4b6a-9f5d-3625feaa396e.parquet",
  },
  {
    id: "vitesses-voitures-radars",
    datasetReference:
      "jeux-de-donnees-des-vitesses-relevees-par-les-voitures-radars-a-conduite-externalisee",
    title:
      "Vitesses relevées par les voitures radars à conduite externalisée — 2023",
    organization: "Ministère de l’Intérieur",
    parquetUrl:
      "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/756ff540c1160325916332c2570c54bf.parquet",
  },
];
