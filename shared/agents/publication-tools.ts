import { tool } from "ai";
import { z } from "zod";

export const identitySuggestionSchema = z.object({
  title: z.string().trim().min(1),
  acronym: z.string().trim(),
  rationale: z.string().trim().min(1),
});
export const descriptionSuggestionSchema = z.object({
  description: z.string().trim().min(1),
  shortDescription: z.string().trim(),
  rationale: z.string().trim().min(1),
});
export const keywordSuggestionSchema = z.object({
  tags: z.array(z.string().trim().min(1)).min(3).max(8),
  rationale: z.string().trim().min(1),
});
export const licenseSuggestionSchema = z.object({
  license: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
});
export const temporalSuggestionSchema = z.object({
  frequency: z.string().trim().optional(),
  temporalStart: z.string().trim().optional(),
  temporalEnd: z.string().trim().optional(),
  rationale: z.string().trim().min(1),
});
export const spatialSuggestionSchema = z.object({
  spatialCoverage: z.string().trim().optional(),
  spatialGranularity: z.string().trim().optional(),
  rationale: z.string().trim().min(1),
});

/** Chaque tool correspond à une étape visible de l’accompagnement. */
export const publicationTools = {
  suggest_identity: tool({
    description: "Première étape uniquement : propose un titre précis utilisant le vocabulaire de recherche et un éventuel acronyme. L’acronyme peut être vide.",
    inputSchema: identitySuggestionSchema,
    outputSchema: identitySuggestionSchema,
    execute: async input => input,
  }),
  suggest_descriptions: tool({
    description: "Deuxième étape uniquement : propose une description détaillée sans inventer d’information. Propose une description courte seulement si le brouillon contient déjà un titre et une description d’au moins 200 caractères ; sinon renvoie une chaîne vide.",
    inputSchema: descriptionSuggestionSchema,
    outputSchema: descriptionSuggestionSchema,
    execute: async input => input,
  }),
  suggest_keywords: tool({
    description: "Troisième étape uniquement : propose entre 3 et 8 mots-clés français décrivant les thèmes et usages. Exclure les termes génériques et les noms de formats.",
    inputSchema: keywordSuggestionSchema,
    outputSchema: keywordSuggestionSchema,
    execute: async input => input,
  }),
  suggest_license: tool({
    description: "Quatrième étape uniquement : recommande par défaut la Licence Ouverte 2.0, en rappelant que l’utilisateur doit confirmer les droits et les conditions de réutilisation.",
    inputSchema: licenseSuggestionSchema,
    outputSchema: licenseSuggestionSchema,
    execute: async input => input,
  }),
  suggest_temporal_metadata: tool({
    description: "Cinquième étape uniquement : propose la fréquence indicative et la couverture temporelle quand elles sont déductibles. Ne pas confondre couverture et dates du fichier ; omettre les valeurs incertaines.",
    inputSchema: temporalSuggestionSchema,
    outputSchema: temporalSuggestionSchema,
    execute: async input => input,
  }),
  suggest_spatial_metadata: tool({
    description: "Sixième étape uniquement : propose la couverture territoriale et le niveau géographique le plus fin présent dans les données. Omettre les valeurs incertaines.",
    inputSchema: spatialSuggestionSchema,
    outputSchema: spatialSuggestionSchema,
    execute: async input => input,
  }),
  consult_publication_guide: tool({
    description: "Consulte le guide officiel data.gouv.fr pour répondre à une question sur une règle officielle de publication.",
    inputSchema: z.object({ question: z.string().trim().min(1), goal: z.string().trim().optional() }),
    outputSchema: z.unknown(),
  }),
};
