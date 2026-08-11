import { searchDatasets } from "~~/server/services/datagouv";

export default defineEventHandler(async (event) => {
  const query = getQuery(event).q;
  const value = typeof query === "string" ? query.trim() : "";
  if (value.length < 2) {
    throw createError({ statusCode: 400, statusMessage: "Saisissez au moins deux caractères." });
  }
  try {
    return { datasets: await searchDatasets(value) };
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "La recherche data.gouv.fr est momentanément indisponible.",
    });
  }
});
