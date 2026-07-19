const boundaryUrls = {
  regions:
    "https://object.data.gouv.fr/contours-administratifs/2025/geojson/regions-1000m.geojson",
  departments:
    "https://object.data.gouv.fr/contours-administratifs/2025/geojson/departements-1000m.geojson",
} as const;

export default defineEventHandler(async (event) => {
  const level = getQuery(event).level;
  if (level !== "regions" && level !== "departments") {
    throw createError({
      statusCode: 400,
      statusMessage: "Niveau géographique inconnu.",
    });
  }

  try {
    const response = await fetch(boundaryUrls[level]);
    if (!response.ok) {
      throw new Error(`La source de contours répond ${response.status}.`);
    }
    setResponseHeaders(event, {
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "content-type": "application/geo+json; charset=utf-8",
      "x-data-source": "data.gouv.fr/contours-administratifs/2025/1000m",
    });
    return await response.text();
  } catch (reason) {
    throw createError({
      statusCode: 502,
      statusMessage: reason instanceof Error
        ? reason.message
        : "Les contours administratifs sont indisponibles.",
    });
  }
});
