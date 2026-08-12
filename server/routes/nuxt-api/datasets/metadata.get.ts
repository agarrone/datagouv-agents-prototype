import { fetchDatasetPageMetadata } from "~~/server/services/datagouv";

export default defineEventHandler(async (event) => {
  const reference = getQuery(event).dataset;
  const value = typeof reference === "string" ? reference.trim() : "";
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: "Jeu de données manquant." });
  }

  try {
    return { dataset: await fetchDatasetPageMetadata(value) };
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Les informations du jeu de données sont momentanément indisponibles.",
    });
  }
});
