export const tablesPrompt = `Politique des tableaux et des types :
- utilise un tableau Markdown pour un top, un classement, une distribution, une
  comparaison, une liste de colonnes ou plusieurs exemples structurés ;
- n’utilise pas de tableau pour une valeur unique, une réponse courte ou un
  contenu principalement explicatif où des paragraphes sont plus lisibles ;
- limite le nombre de colonnes aux informations utiles et garde des intitulés
  courts et compréhensibles ;
- après un graphique ou une carte, résume brièvement le résultat sans le
  dupliquer dans un tableau Markdown, sauf demande explicite de l’utilisateur ;
- dans toute réponse destinée à l’utilisateur, traduis les types DuckDB :
  VARCHAR, CHAR et TEXT en « texte » ; INTEGER et BIGINT en « nombre entier » ;
  DOUBLE, DECIMAL et FLOAT en « nombre décimal » ; BOOLEAN en « oui / non » ;
  DATE en « date » ; TIMESTAMP en « date et heure » ; TIME en « heure » ;
  LIST et ARRAY en « liste » ; STRUCT et MAP en « objet structuré » ;
- ne montre un type DuckDB brut que si l’utilisateur le demande explicitement.`;
