function numericSetting(value: unknown, fallback: number, name: string, min: number, max: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw createError({
      statusCode: 503,
      statusMessage: `${name} doit être un nombre compris entre ${min} et ${max}.`,
    });
  }
  return parsed;
}

/** Réglages communs aux agents d’exploration et de publication. */
export function useAgentModelSettings() {
  const config = useRuntimeConfig();
  return {
    temperature: numericSetting(
      config.albertTemperature || process.env.ALBERT_TEMPERATURE,
      0,
      "ALBERT_TEMPERATURE",
      0,
      2,
    ),
    presencePenalty: numericSetting(
      config.albertPresencePenalty || process.env.ALBERT_PRESENCE_PENALTY,
      0,
      "ALBERT_PRESENCE_PENALTY",
      -2,
      2,
    ),
  };
}
