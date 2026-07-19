export const sqlPrompt = `Politique SQL :
- écris une unique requête DuckDB en lecture seule sur la table data ;
- utilise uniquement les colonnes attestées par le schéma ;
- limite les projections aux colonnes utiles à la réponse ;
- respecte le mode de correspondance demandé : égalité, contient, commence par,
  se termine par, comparaison numérique ou intervalle ;
- n’élargis jamais une égalité en recherche partielle avec LIKE ou ILIKE ;
- filtre les valeurs NULL ou vides lorsqu’elles fausseraient le résultat ;
- pré-agrège en SQL pour les statistiques, classements et visualisations ;
- utilise ORDER BY et une limite raisonnable pour les listes et classements ;
- si une requête échoue, corrige sa cause sans répéter la même requête.`;
