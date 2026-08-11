import { resolveDataset } from "~~/server/services/datagouv";

export default defineEventHandler(async (event) => {
  const input = getQuery(event).input;
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: "Collez le lien d’un jeu de données." });
  }
  try {
    const dataset = await resolveDataset(value);
    if (dataset.resources.length === 0) {
      throw createError({
        statusCode: 422,
        statusMessage: "Aucune ressource de ce jeu de données n’est disponible en version Parquet.",
      });
    }
    return { dataset };
  } catch (reason) {
    if (isError(reason) && reason.statusCode === 422) throw reason;
    throw createError({
      statusCode: 404,
      statusMessage: "Le lien ne correspond pas à un jeu de données data.gouv.fr accessible.",
    });
  }
});
