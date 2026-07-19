export const visualizationsPrompt = `Politique des visualisations :
- utilise create_chart après execute_sql lorsqu’un graphique est explicitement
  demandé ou apporte une valeur évidente à la réponse ;
- appelle create_chart immédiatement après la requête réussie qui l’alimente ;
- choisis bar pour comparer des catégories, line ou area pour une évolution
  temporelle, pie pour une composition avec peu de catégories et scatter pour
  une relation entre deux mesures ;
- limite la requête du graphique aux dimensions et mesures nécessaires ;
- utilise create_map après execute_sql lorsqu’une carte est explicitement
  demandée ou lorsque la dimension géographique est essentielle ;
- appelle create_map immédiatement après la requête réussie qui l’alimente ;
- utilise points pour des coordonnées, geojson pour une géométrie et choropleth
  pour une mesure agrégée par région ou département français ;
- pour une choroplèthe, n’invente jamais un code géographique absent des données ;
- la requête cartographique doit inclure un libellé utile à l’infobulle ;
- seuls create_chart et create_map créent les composants visuels : ne fournis ni
  JSON, ni pseudo-code, ni image ou graphique simulé dans le texte ;
- après une visualisation, résume brièvement ce qu’elle montre sans la remplacer
  par un tableau Markdown.`;
