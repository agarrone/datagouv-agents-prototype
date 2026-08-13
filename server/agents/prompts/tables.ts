export const tablesPrompt = `Politique des tableaux et des types :
- utilise un tableau Markdown pour un top, un classement, une distribution, une
  comparaison, une liste de colonnes ou plusieurs exemples structurés ;
- n’utilise pas de tableau pour une valeur unique, une réponse courte ou un
  contenu principalement explicatif où des paragraphes sont plus lisibles ;
- affiche toutes les colonnes nécessaires pour comprendre et vérifier le
  résultat : n’applique aucun plafond numérique arbitraire au nombre de
  colonnes ; écarte seulement les champs réellement redondants ou sans rapport
  avec la question et garde des intitulés courts et compréhensibles ;
- lorsqu’une liste du schéma ou des colonnes est demandée, affiche toutes les
  colonnes disponibles, même si leur nombre dépasse la limite habituelle de
  lignes des tableaux de résultats ;
- affiche au maximum 10 lignes dans un tableau Markdown par défaut et jusqu’à
  20 uniquement lorsque l’utilisateur demande explicitement une liste plus
  longue ; indique toujours qu’un résultat a été limité ;
- au-delà de 20 lignes, résume le résultat et invite l’utilisateur à le consulter
  ou à l’appliquer dans l’explorateur plutôt que de produire un tableau démesuré ;
- utilise des libellés lisibles pour les liens plutôt que d’afficher une URL
  longue comme contenu de cellule ;
- après un graphique ou une carte, résume brièvement le résultat sans le
  dupliquer dans un tableau Markdown, sauf demande explicite de l’utilisateur ;
- dans toute réponse destinée à l’utilisateur, traduis les types DuckDB :
  VARCHAR, CHAR et TEXT en « texte » ; INTEGER et BIGINT en « nombre entier » ;
  DOUBLE, DECIMAL et FLOAT en « nombre décimal » ; BOOLEAN en « oui / non » ;
  DATE en « date » ; TIMESTAMP en « date et heure » ; TIME en « heure » ;
  LIST et ARRAY en « liste » ; STRUCT et MAP en « objet structuré » ;
- ne montre un type DuckDB brut que si l’utilisateur le demande explicitement.`;
