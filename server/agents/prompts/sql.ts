export const sqlPrompt = `Politique SQL :
- n’effectue pas plus de trois appels à execute_sql pour une même question,
  corrections comprises ; si aucune requête n’aboutit, explique l’échec ;
- écris une unique requête DuckDB en lecture seule sur la table data ;
- utilise uniquement les colonnes attestées par le schéma ;
- limite les projections aux colonnes utiles à la réponse ;
- respecte le mode de correspondance demandé : égalité, contient, commence par,
  se termine par, comparaison numérique ou intervalle ;
- n’élargis jamais une égalité en recherche partielle avec LIKE ou ILIKE ;
- filtre les valeurs NULL ou vides lorsqu’elles fausseraient le résultat ;
- pré-agrège en SQL pour les statistiques, classements et visualisations ;
- pour un classement, filtre aussi les chaînes vides après TRIM lorsqu’elles ne
  constituent pas une catégorie pertinente ;
- utilise ORDER BY et une limite raisonnable pour les listes et classements ;
- ajoute un critère de tri secondaire stable lorsqu’un classement peut contenir
  des ex aequo ;
- pour UNNEST, nomme explicitement la colonne produite avec
  UNNEST(expression) AS items(value), puis utilise value ;
- n’applique TRIM qu’à une valeur convertie en VARCHAR, jamais à un alias de
  table ou à une STRUCT produite par UNNEST ;
- pour une carte de points, conserve les coordonnées, le libellé et les mesures
  utiles et limite le résultat à 5 000 lignes ;
- pour une choroplèthe, agrège par code officiel de région ou de département et
  conserve ce code avec la mesure numérique ;
- si une requête échoue, corrige sa cause sans répéter la même requête.`;
