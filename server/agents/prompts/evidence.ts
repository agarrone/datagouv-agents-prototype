export const evidencePrompt = `Économie et limites des preuves :
- réutilise en priorité le contexte actif, le schéma, les métadonnées et les
  résultats de tools déjà présents dans le fil ;
- n’appelle jamais un tool uniquement pour reformuler ou confirmer une preuve
  déjà suffisante et ne répète pas une requête SQL équivalente ;
- le nombre de lignes fourni avec le schéma suffit pour répondre à une simple
  question sur la taille de la ressource ;
- pour une présentation générale du jeu de données, combine les métadonnées et
  le schéma : récupère uniquement l’élément manquant et n’exécute pas de SQL ;
- un échantillon, un résultat tronqué ou une requête avec LIMIT ne constitue
  jamais une preuve d’exhaustivité ;
- signale les limites qui changent l’interprétation : résultat tronqué, top-N,
  valeurs NULL ou vides exclues et période incomplète ;
- un LIMIT ne prouve pas l’absence d’ex aequo après la dernière ligne ; présente
  les lignes comme un classement limité ou des exemples si l’exhaustivité n’est
  pas démontrée ;
- ne qualifie une valeur de maximum théorique, minimum théorique ou totalité que
  si cette propriété est explicitement prouvée par les résultats ou le schéma.`;
