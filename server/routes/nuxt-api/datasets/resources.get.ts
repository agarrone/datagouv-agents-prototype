import { fetchDatasetMetadata } from "~~/server/services/datagouv";

export default defineEventHandler(async (event) => {
  const reference = getQuery(event).dataset;
  const value = typeof reference === "string" ? reference.trim() : "";
  if (!value) throw createError({ statusCode: 400, statusMessage: "Jeu de données manquant." });

  try {
    const dataset = await fetchDatasetMetadata(value);
    return {
      resources: dataset.resources.map(resource => ({
        id: resource.id,
        title: resource.title,
        format: resource.format,
        url: resource.url,
        parquetUrl: resource.parquetUrl,
      })),
    };
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Les ressources du jeu de données sont momentanément indisponibles.",
    });
  }
});
