# Benchmark — assistants d’exploration de données et visualisations

> État de la note : octobre 2026  
> Objet : conserver les références étudiées, les enseignements associés et les pistes à réexaminer lors des prochaines itérations du prototype.

## Pourquoi cette note existe

Le prototype data.gouv.fr ne cherche pas à reproduire un produit existant. Il combine plusieurs problèmes habituellement traités séparément : trouver une ressource, comprendre son schéma, interroger ses données, produire une restitution vérifiable et permettre à un utilisateur non spécialiste de garder le contrôle.

Les références ci-dessous ont donc été étudiées comme des sources d’inspiration partielles. Certaines sont proches par leur architecture, d’autres par leur interface ou leur manière de représenter la confiance. Aucune ne constitue à elle seule une cible à copier.

## Synthèse

| Référence | Ce qu’elle apporte principalement | Inspiration pour le prototype | Divergence principale |
| --- | --- | --- | --- |
| OKFN MCP / Data Portal | Outils spécialisés par domaine, résultats structurés, sources et glossaires | Contextualiser les tools, fournir des exemples, rendre les sources explicites | Approche orientée MCP et domaines préparés, alors que data.gouv.fr doit explorer un catalogue très hétérogène |
| PortalJS | Traitement de fichiers volumineux, Parquet distant, DuckDB dans le navigateur | Ne charger que les octets nécessaires et distinguer stockage, catalogue et calcul | Framework de portail, pas expérience conversationnelle complète |
| Microsoft Data Formulator | Exploration visuelle conversationnelle, fils d’analyse, édition directe des graphiques | Faire du résultat un objet éditable et conserver les bifurcations de l’analyse | Produit analytique généraliste, plus complexe que notre parcours d’exploration ciblé |
| Civic AI Tools | Provenance, traces, résultats publiables et vérifiables | Relier réponse, appels de tools et sources ; pouvoir exporter une preuve de calcul | Niveau de signature et de publication trop ambitieux pour le prototype actuel |
| dbt Charts | Même représentation structurée pour l’agent, le formulaire et le code | SQL + spécification déclarative comme source de vérité commune | Pensé pour des projets data gouvernés et versionnés, pas pour une ressource publique ponctuelle |
| udata / cdata | Modèle du catalogue data.gouv.fr, ressources, métadonnées et intégration cible | Rester compatible avec les objets métier et les contraintes de data.gouv.fr | Le prototype exécute encore une partie de la logique localement et n’est pas intégré au produit |
| Ancien assistant data.gouv.fr | Parcours, feedback, suggestions, métadonnées et première expérience d’exploration | Conserver les acquis UX utiles tout en clarifiant les contrats techniques | Architecture antérieure moins isolée et moins structurée autour des tools |
| Airtable Interfaces / Notion | Composition directe, édition contextuelle, passage création–édition | Distinguer assistant global, sélection d’un bloc et édition manuelle | Références de composition de tableaux de bord, pas d’analyse fiable de données publiques |

## 1. OKFN MCP et Data Portal

### Ce qui a été observé

L’[OKFN MCP Platform](https://mcp.okfn.org/docs/) poursuit deux objectifs centraux : calculer les réponses à partir de données officielles plutôt que de la mémoire du modèle, et permettre de retrouver la source de chaque résultat.

Son architecture repose sur des plugins limités à un domaine de données cohérent. Un plugin décrit les jeux de données, les questions auxquelles ils peuvent répondre et les tools disponibles. Les résultats séparent :

- un texte destiné au modèle ;
- des données structurées destinées directement à l’interface ;
- les sources utilisées ;
- éventuellement des tableaux et graphiques.

Le retour d’expérience OKFN insiste notamment sur :

- l’intérêt de fournir au modèle des exemples de requêtes plutôt que seulement des règles abstraites ;
- la difficulté persistante de produire du SQL fiable ;
- la valeur de calculer certains indicateurs en amont plutôt que de demander au modèle de les recomposer ;
- l’injection d’un glossaire métier officiel dans le contexte des tools ;
- la nécessité de ne pas exiger des utilisateurs le vocabulaire technique de la visualisation, comme « carte choroplèthe » ;
- la synchronisation stricte entre les données affichées et le contexte connu par l’assistant ;
- le traitement explicite des questions vides, vagues ou hors sujet ;
- la prise en compte des langues et des écarts entre vocabulaire courant, métadonnées et noms de colonnes.

### Ce que nous pouvons reprendre

1. Enrichir progressivement le contexte avec des définitions issues des métadonnées et, lorsque cela existe, d’un vocabulaire métier.
2. Ajouter des exemples SQL ciblés sur DuckDB et sur les structures réellement rencontrées.
3. Normaliser la sortie de chaque tool : résultat technique, résumé pour le modèle, avertissements, sources et données d’affichage.
4. Faire afficher les données structurées par l’application sans demander au modèle de les retranscrire.
5. Évaluer l’exactitude des appels de tools séparément de la qualité rédactionnelle de la réponse.

### Ce que nous ne devons pas copier directement

data.gouv.fr est un catalogue généraliste. Il n’est pas réaliste de préparer immédiatement un plugin et un glossaire expert pour chaque domaine. Une première approche pourrait utiliser :

- les métadonnées du jeu de données ;
- le schéma de la ressource ;
- quelques profils génériques ;
- puis des extensions métier uniquement sur les domaines à fort usage.

Le MCP peut devenir une interface d’interopérabilité, mais il ne remplace pas le moteur local DuckDB ni les contrats internes de l’agent.

## 2. PortalJS et le passage à l’échelle des données

### Ce qui a été observé

Le guide [Scaling Data de PortalJS](https://www.portaljs.com/docs/guides/scaling-data) distingue l’emplacement des données de la manière de les interroger. Les ressources peuvent être embarquées, stockées à distance ou conservées chez leur producteur. Pour les fichiers volumineux, le navigateur interroge directement du Parquet distant et ne récupère que les octets nécessaires.

PortalJS formalise également deux choix distincts :

- le niveau de stockage ou de référencement de la ressource ;
- le moteur de lecture, simple prévisualisation ou DuckDB.

### Ce que nous avons déjà repris

- Parquet distant comme format privilégié ;
- DuckDB-WASM pour garder le calcul dans le navigateur ;
- séparation entre catalogue, ressource et moteur de requête ;
- chargement des données à la demande plutôt qu’incorporation au site.

### Pistes à conserver

- mesurer les octets réellement transférés et le temps de première requête ;
- ajouter une stratégie explicite selon la taille et le format de la ressource ;
- prévoir un fallback serveur lorsque DuckDB-WASM ou le navigateur ne peuvent pas traiter la ressource ;
- distinguer dans les erreurs un problème de catalogue, de fichier distant, de format et de moteur de calcul.

PortalJS répond surtout au transport et au calcul. Il apporte peu sur le dialogue, la clarification ou l’évaluation de la réponse produite.

## 3. Microsoft Data Formulator

### Ce qui a été observé

[Data Formulator](https://github.com/microsoft/data-formulator) combine langage naturel et manipulation directe. Sa proposition intéressante n’est pas uniquement de produire un graphique : elle conserve une mémoire des données, permet de poursuivre une analyse, de revenir à une étape antérieure et de créer une branche alternative sans perdre le contexte initial.

Les visualisations sont des objets éditables. L’utilisateur peut partir d’une intention en langage naturel, puis corriger directement la restitution. Les travaux récents du projet renforcent les connecteurs, les espaces persistants, les recommandations de graphiques, les thèmes et la continuité du contexte.

### Ce que nous pouvons reprendre

1. Représenter une analyse comme une suite d’états vérifiables, et pas uniquement comme une conversation linéaire.
2. Autoriser une bifurcation : essayer une autre hypothèse sans détruire le premier résultat.
3. Conserver la relation entre jeu de données, transformation, requête et visualisation.
4. Permettre de modifier directement une spécification générée par l’assistant.
5. Montrer clairement quelle source et quel résultat sont actifs lorsque l’utilisateur poursuit la conversation.

### Divergence

Notre priorité est une expérience simple intégrée à data.gouv.fr. Reprendre immédiatement les fils d’analyse, les espaces persistants et les multiples connecteurs conduirait à fabriquer un outil analytique généraliste. L’idée de branche doit d’abord être validée par les usages.

## 4. Civic AI Tools

### Ce qui a été observé

[Civic AI Tools](https://github.com/npstorey/civic-ai-tools) traite l’analyse comme un enregistrement pouvant être inspecté et vérifié. Le projet relie la question, les tools, les sources, la trace d’exécution et l’artefact final. Il explore également la signature, l’horodatage, les journaux de transparence et les paquets de preuve reproductibles.

### Ce que nous pouvons reprendre à court terme

- un identifiant de corrélation par réponse et par tool ;
- une provenance portée par les résultats des tools, pas reconstruite uniquement dans l’interface ;
- la version du modèle, des prompts et du prototype dans les traces ;
- un export lisible de la question, du SQL, des sources et du résultat ;
- une distinction claire entre résultat calculé, interprétation du modèle et avertissement.

### Ce qui peut attendre

La signature cryptographique, la publication dans un registre et la reproduction sous forme de notebook répondent à un niveau d’assurance supérieur à celui nécessaire aux premiers tests utilisateurs. Ils redeviennent pertinents si data.gouv.fr permet un jour de publier ou de citer une analyse produite par l’assistant.

## 5. dbt Charts et les visualisations conçues pour le chat

### Ce qui a été observé

Le billet [Charts built for Chat](https://dbtcharts.com/blog/charts-built-for-chat/) propose une source de vérité structurée où :

- SQL décrit les données à afficher ;
- une spécification déclarative décrit la visualisation ;
- le texte reste en Markdown ;
- les filtres sont des variables ;
- l’agent, l’éditeur visuel et le code modifient le même objet ;
- un validateur peut signaler les problèmes de lisibilité avant le rendu.

Cette idée correspond directement aux réflexions menées dans l’expérimentation de tableaux de bord : l’assistant et l’édition manuelle ne doivent pas produire deux formats concurrents.

### Ce que nous pouvons reprendre

1. Définir un contrat canonique `requête SQL + spécification + métadonnées` pour chaque graphique ou carte.
2. Faire modifier ce même contrat par l’agent et par les formulaires.
3. Valider la spécification avant affichage et conserver le bloc lorsqu’elle est invalide.
4. Ajouter des avertissements de conception : trop de catégories, labels illisibles, axes incohérents, carte sans couverture suffisante.
5. Versionner séparément le brouillon et la dernière configuration enregistrée.

### Divergence

dbt Charts part de modèles gouvernés dans un projet data. Le prototype part souvent d’une ressource inconnue dont le schéma et la qualité ne sont découverts qu’au chargement. Nos contrôles doivent donc inclure la fiabilité de la donnée, pas seulement celle de la spécification graphique.

## 6. udata, cdata et l’écosystème data.gouv.fr

### Ce qui a été observé

L’étude des visualisations historiques d’udata et du fonctionnement de cdata rappelle que la visualisation est toujours rattachée à des objets métier : jeu de données, ressource, organisation, format, métadonnées et permissions.

L’ancien prototype d’assistant a également apporté plusieurs éléments réutilisés ou adaptés :

- page de métadonnées proche de data.gouv.fr ;
- navigation entre ressources ;
- suggestions de questions ;
- clarification sous forme de chips ;
- feedback détaillé ;
- source des graphiques et cartes ;
- interface d’exploration desktop et mobile ;
- attention particulière aux tableaux Markdown.

### Enseignement principal

L’assistant ne doit pas devenir une couche indépendante du produit. Son contexte doit être dérivé de l’état réel de data.gouv.fr et ses sorties doivent rester compatibles avec les modèles métier susceptibles d’être repris plus tard dans cdata ou udata.

Cela justifie la séparation actuelle entre :

- le moteur de données ;
- l’explorateur prototype ;
- l’agent et ses tools ;
- les composants de visualisation.

## 7. Airtable Interfaces et Notion

### Ce qui a été observé

Ces produits ont surtout servi de références pour les expérimentations de composition :

- page directement éditable ;
- blocs sélectionnables ;
- panneau contextuel pour l’élément actif ;
- séparation entre vue lecteur et vue éditeur ;
- ajout d’un graphique par intention, puis réglages manuels ;
- grille et redimensionnement ;
- assistant global conservant le contexte du bloc sélectionné.

### Enseignement principal

Il faut distinguer trois espaces qui coopèrent :

1. l’assistant global ;
2. le document ou tableau de bord ;
3. l’éditeur manuel du bloc sélectionné.

Ils ne doivent pas se superposer ni conserver des états concurrents. L’assistant reçoit le contexte du bloc actif, mais l’utilisateur doit pouvoir modifier ce bloc sans passer par une nouvelle conversation.

Ces enseignements concernent principalement les expérimentations de tableaux de bord. Ils ne doivent pas complexifier l’agent d’exploration avant validation du besoin.

## 8. Principes transversaux issus du benchmark

### 8.1 Le modèle ne doit pas être la base de données

Les valeurs factuelles doivent provenir d’un calcul exécuté. Le modèle choisit une démarche, produit ou corrige une requête et interprète un résultat borné.

### 8.2 Une visualisation est un objet, pas une image

Elle possède au minimum :

- une source et une ressource ;
- une requête vérifiée ;
- une spécification ;
- un titre et une description ;
- une provenance ;
- des avertissements ;
- un état de validation.

### 8.3 Le contexte affiché doit être le contexte utilisé

Le jeu de données, la ressource, la vue filtrée et l’éventuel bloc sélectionné doivent rester synchronisés entre l’interface, le moteur local et le modèle.

### 8.4 L’interface ne doit pas exposer le jargon comme préalable

L’utilisateur peut demander « une carte montrant le nombre de festivals par région ». L’agent peut déterminer qu’une choroplèthe est adaptée, mais l’utilisateur n’a pas à connaître ce terme.

### 8.5 Le langage naturel et l’édition manuelle doivent converger

Ils doivent modifier le même contrat sous-jacent. Sans cela, les changements deviennent imprévisibles et impossibles à comparer ou à sauvegarder.

### 8.6 La provenance est une donnée de premier niveau

La source, le SQL et les étapes techniques doivent être conservés dès l’exécution. Les reconstruire après coup à partir du texte de la réponse produit une provenance incomplète.

### 8.7 La qualité doit être évaluée par couche

Une réponse peut être bien rédigée mais reposer sur un mauvais tool, un SQL faux ou une visualisation trompeuse. L’évaluation doit distinguer : compréhension, choix du tool, exécution, résultat, visualisation et explication.

## 9. Pistes classées pour les prochaines itérations

### À expérimenter prochainement

- exemples SQL adaptés aux structures fréquentes ;
- contrat de résultat commun incluant sources et avertissements ;
- synchronisation vérifiable du contexte actif ;
- validation des spécifications de graphiques et cartes ;
- glossaire léger dérivé des métadonnées ;
- traces par tool avec modèle, durée et version de prompt ;
- benchmark multilingue minimal, au moins français et anglais ;
- suggestions exprimées dans le vocabulaire de l’utilisateur.

### À tester avec les utilisateurs avant de développer

- fils d’analyse et bifurcations ;
- édition manuelle d’un résultat de l’assistant ;
- export d’une analyse complète ;
- orientation automatique vers une autre ressource ;
- persistance et reprise d’une conversation ;
- composition de rapports ou tableaux de bord.

### À conserver comme horizon

- plugins métier spécialisés ;
- couche sémantique de métriques et définitions gouvernées ;
- publication reproductible d’une analyse ;
- signature et registre de provenance ;
- interopérabilité MCP avec d’autres catalogues et assistants.

## 10. Questions encore ouvertes

- Jusqu’où enrichir automatiquement le contexte sans saturer le modèle ?
- Quels domaines justifient un glossaire ou un plugin spécialisé ?
- Quel niveau de provenance est attendu pour une simple réponse, puis pour une analyse partagée ?
- Faut-il permettre les bifurcations ou privilégier une conversation strictement linéaire ?
- Quel contrat de visualisation pourra être repris à la fois par l’explorateur, cdata et les futurs tableaux de bord ?
- Quand une transformation doit-elle rester du SQL généré à la demande, et quand doit-elle devenir un indicateur prédéfini ?
- Comment évaluer une visualisation au-delà de sa validité technique : lisibilité, choix du type, risques d’interprétation ?

## Références principales

- [OKFN MCP Platform](https://mcp.okfn.org/docs/)
- [Construction de plugins OKFN](https://mcp.okfn.org/docs/plugins/)
- [Contrat de résultats des tools OKFN](https://mcp.okfn.org/docs/plugins/tool-results/)
- [PortalJS — Scaling Data](https://www.portaljs.com/docs/guides/scaling-data)
- [Microsoft Data Formulator](https://github.com/microsoft/data-formulator)
- [Civic AI Tools](https://github.com/npstorey/civic-ai-tools)
- [dbt Charts — Charts built for Chat](https://dbtcharts.com/blog/charts-built-for-chat/)
- [Visualisations udata](https://github.com/opendatateam/udata/tree/main/udata/core/visualizations)
- [cdata](https://github.com/datagouv/cdata)

## Références à documenter davantage

Certaines inspirations ont été évoquées au cours des échanges sans produire encore une analyse suffisamment traçable : expériences internationales non précisément identifiées, détails de l’ancien dépôt sur certains prompts et retours informels d’utilisateurs. Elles ne sont volontairement pas présentées ici comme des conclusions acquises. Cette section pourra être complétée lorsque les sources et les observations auront été retrouvées.
