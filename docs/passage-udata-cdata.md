# Préparer la reprise de l’assistant dans cdata / udata

Analyse du 20 octobre 2026, sur le commit local `faa37ee`.

Cette note porte sur l’assistant d’exploration actuellement testé. Elle distingue les constats du dépôt, les recommandations et les décisions à prendre avec l’équipe de reprise. Aucun comportement applicatif n’a été modifié.

## Orientation proposée

Reprendre progressivement l’assistant dans cdata, en conservant initialement son orchestration TypeScript côté serveur et son calcul DuckDB dans le navigateur. Utiliser udata comme autorité sur les jeux de données, les ressources et, si nécessaire, les droits d’accès.

Cette proposition évite de conditionner l’intégration à une réécriture du moteur agentique. Elle reste à arbitrer selon les contraintes d’exploitation : routes Nitro dans cdata, service Node séparé ou implémentation Python côté udata.

Les sources publiques consultées confortent la proximité technique : cdata utilise Nuxt 4, possède un système de composants et une configuration Albert ; udata repose sur Python/Flask. Cela ne démontre pas que le streaming agentique est déjà pris en charge par leur infrastructure. Les versions publiques consultées doivent être rapprochées des branches réellement déployées.

Sources :

- [Dépendances de cdata](https://github.com/datagouv/cdata/blob/main/package.json)
- [Configuration de cdata](https://github.com/datagouv/cdata/blob/main/nuxt.config.ts)
- [Dépendances de udata](https://github.com/opendatateam/udata/blob/main/pyproject.toml)

## Ce que l’équipe reprend réellement

Le navigateur charge un Parquet, expose une table `data` dans DuckDB-WASM et exécute les outils de calcul. Le serveur Nitro transmet les messages à Albert, pilote les appels d’outils et récupère les métadonnées du catalogue. Les résultats locaux repartent vers le serveur puis le modèle. Le calcul local ne signifie donc pas que toutes les données restent dans le navigateur.

| Ensemble | État constaté | Reprise proposée |
| --- | --- | --- |
| `shared/agents`, `shared/schemas`, `shared/types` | Contrats typés, schémas Zod, limites de conversation | Conserver et versionner les contrats utiles à l’exploration |
| `server/agents/prompts`, `exploration-config.ts` | Instructions découpées et version de prompt explicite | Reprendre avec scénarios d’évaluation |
| `server/routes/nuxt-api/agents/exploration.post.ts` | Orchestration et streaming AI SDK, dépendances Nitro | Adapter au serveur retenu ; portage nécessaire si Python |
| `useExplorationToolRuntime.client.ts` | Interface `ExplorationToolDataset` injectée | Bon point d’entrée pour brancher un moteur de données différent |
| `useDatasetEngine.client.ts` | DuckDB, état global au module, file de requêtes, résultats vérifiés | Reprendre après validation du cycle de vie et des performances |
| `app/components/exploration` | Interface riche, graphiques, cartes, console | Sélectionner et adapter aux composants cdata |
| `app/pages/laboratoire/exploration.vue` | 847 lignes mêlant transport, conversation, feedback et assemblage | Extraire un contrôleur de conversation et une interface intégrable |
| `adapters/` | Interfaces minimales, sans intégration concrète observée | Ne pas considérer ces fichiers comme une intégration déjà réalisée |
| Pages d’expériences, routes dashboard/publication | Fonctionnalités annexes présentes | Exclure du premier périmètre et de son déploiement |

Points solides à préserver : sérialisation des requêtes DuckDB, validation SQL, taille bornée des conversations, erreurs structurées, confirmation des vues proposées, lien `executionId` / `sourceExecutionId` entre calcul et visualisation, tests de contrats et de provenance.

## Décisions à obtenir lors de la réunion

| Décision | Proposition de départ | Conséquence à clarifier |
| --- | --- | --- |
| Périmètre initial | Une ressource publique tabulaire disposant d’un Parquet | Pas de multi-ressources ni de publication dans cette reprise |
| Entrée dans cdata | Depuis une ressource compatible, avec son contexte déjà connu | Choisir page, panneau ou dialogue avec l’équipe produit |
| Serveur IA | Étudier d’abord les routes Nitro de cdata | Valider durée des requêtes, streaming, charge et responsabilité opérationnelle |
| Moteur de données | Garder DuckDB-WASM pour le pilote | Vérifier la coexistence avec les aperçus cdata et les usages de Tabular API |
| Accès | Décider explicitement anonyme ou connecté | Détermine sessions, quotas et contrôles d’accès |
| Conservation | Pas d’historique persistant pour le premier lot, sauf besoin confirmé | Définir séparément conservation des feedbacks et traces |
| Modèle et budget | Un modèle de référence évalué ; comparaison en environnement de test | Propriétaire du compte Albert, quota et budget en tokens |
| Reprise | Un responsable cdata, un responsable serveur/infra et un responsable produit | Qui valide les prompts, traite les incidents et décide l’ouverture |

L’accès à des ressources privées serait un chantier distinct : l’attestation actuelle par l’API publique ne constitue pas un contrôle des permissions utilisateur.

## Actions prioritaires

P0 : avant ouverture au-delà du pilote. P1 : pendant l’intégration et avant généralisation. P2 : après stabilisation, selon les retours.

| Priorité | Action concrète et preuve attendue | Pilotage proposé |
| --- | --- | --- |
| P0 | Fixer le périmètre et le partage cdata / udata / serveur IA dans une décision d’architecture courte. Décrire également ce qui reste expérimental. | Référents techniques + produit |
| P0 | Réaliser une tranche complète en préproduction : ressource cdata → question → outil navigateur → reprise du stream → réponse sourcée. Vérifier arrêt et déconnexion derrière le vrai proxy. | cdata + infra |
| P0 | Remplacer les compteurs et la file en mémoire de `rate-limit.ts` par un mécanisme cohérent entre instances, avec opérations atomiques. Tester deux instances et un redémarrage. | Serveur + infra |
| P0 | Valider à l’exécution les messages, rôles, parties et sorties d’outils reçus ; borner le corps avant son chargement complet. Tester les requêtes malformées et les continuations falsifiées. | Serveur |
| P0 | Ne pas fonder un plafond de dépense uniquement sur l’historique et `turnStartedAt` fournis par le navigateur. Définir un budget serveur par session/tour, ou une garantie équivalente. | Serveur |
| P0 | Rendre configurables catalogue, feedback, formulaires et services annexes ; prévoir des destinations distinctes pour local, préproduction et production. | Développement + infra |
| P0 | Définir les flux de données vers Albert et Grist : champs, destinataires, accès, durée de conservation, suppression et information utilisateur. Vérifier aussi les contenus dans les journaux d’erreur. | Produit + responsables données |
| P0 | Mettre en place activation progressive et désactivation d’urgence côté serveur et interface. Vérifier qu’un arrêt de l’IA conserve l’accès aux données. | cdata + infra |
| P1 | Extraire la gestion de conversation de la page et injecter contexte de ressource, transport et moteur. Tester montage, démontage et changement rapide de ressource. | cdata |
| P1 | Brancher les métadonnées sur les clients API et types cdata. Ajouter délais d’attente, cache adapté et erreurs distinctes pour panne catalogue / ressource refusée. | cdata + udata |
| P1 | Définir l’éligibilité : Parquet disponible, CORS compatible, volume supporté, ressource mise à jour ou supprimée. Afficher une explication exploitable si l’assistant est indisponible. | Données + produit |
| P1 | Renforcer le confinement SQL et les limites de calcul ; tester requêtes coûteuses, lectures externes et interruption réelle du worker. Documenter les capacités autorisées. | Moteur de données |
| P1 | Adapter les composants au design system, traiter focus, clavier, annonces du streaming, mobile et alternatives textuelles aux cartes/graphiques. Réaliser une vérification d’accessibilité. | Front + design |
| P1 | Aligner les versions de dépendances et mesurer le poids chargé à l’ouverture. Charger DuckDB, cartes, graphiques et éditeur à la demande. | Front |
| P1 | Instrumenter latence, erreurs par source, consommations, abandons, succès des outils et version des prompts ; éviter les conversations complètes dans les métriques ordinaires. | Serveur + produit |
| P1 | Ajouter une CI et des tests du protocole complet avec modèle simulé ; compléter par une évaluation contrôlée du modèle réel. | Équipe de reprise |
| P1 | Transférer exploitation et accès : dépôt, licence, compte Albert, hébergement, secrets, Grist, documentation et procédure de retour arrière. | Référent sortant + entrant |
| P2 | Décider historique, partage, export de conversation, multi-ressources et autres assistants à partir des usages observés. | Produit |

## Points techniques à ne pas perdre dans la reprise

### Limites et protection du serveur

`server/agents/rate-limit.ts` stocke les compteurs dans des `Map` et la file dans un tableau. Le plafond « global » est donc local au processus et disparaît à son redémarrage. Il compte des requêtes techniques, pas directement des tokens ni un coût. Les reprises après outils produisent plusieurs appels pour une question.

L’empreinte IP utilise `xForwardedFor: true` : l’infrastructure doit garantir la provenance de cet en-tête. Exiger un secret de session stable et dédié en production plutôt que s’appuyer sur le repli vers la clé Albert ou un secret généré.

Les types TypeScript de `readBody` ne valident pas les messages à l’exécution. Le contexte ressource est validé par Zod, mais le contrôle explicite des messages observé est principalement structurel et volumétrique. Les limites de tour reconstruisent une partie de l’état depuis le client : elles sont utiles au fonctionnement normal, mais ne doivent pas être assimilées à un contrôle serveur incontournable.

Vérifier aussi la libération de capacité si la préparation des messages échoue après acquisition d’un emplacement, ainsi que la propagation effective d’une annulation au fournisseur.

### Catalogue et identité de la ressource

`server/services/datagouv.ts` fixe l’API à `https://www.data.gouv.fr/api/1`. Le service atteste la ressource par ses métadonnées et accepte aussi des correspondances de noms de fichier entre deux anciens domaines Hydra. Faire valider cette règle par l’équipe données ; privilégier une résolution canonique des identifiants et URL.

Les appels catalogue observés n’ont pas de délai d’attente explicite. La vérification de ressource est refaite à chaque requête d’exploration ; une indisponibilité est ramenée à un refus 403 dans cette route. Distinguer refus et panne, et éviter de multiplier inutilement les lectures pendant les reprises d’outils.

Le README dit encore que la liste des ressources compatibles est définie dans le code, alors que le service sait découvrir les Parquet depuis les métadonnées. Clarifier la différence entre exemples prédéfinis et éligibilité réelle.

### DuckDB et calcul local

La validation SQL utilise des expressions régulières avec une liste de capacités refusées. C’est un garde-fou utile, pas une preuve de confinement exhaustif. Ne pas réutiliser cette seule protection si l’exécution SQL est déplacée vers un serveur.

Le moteur utilise un état global au module. Son nettoyage attend la fin de la file de requêtes ; vérifier qu’une requête longue ne bloque pas indéfiniment l’arrêt ou le changement de ressource. Le chargement réutilise la ressource lorsque son identifiant est inchangé : prévoir aussi l’invalidation lorsqu’un fichier est mis à jour sous le même identifiant.

Autre test concret à ajouter : `normalizeValue` convertit les `bigint` en `Number`. Définir la représentation des grands entiers pour éviter les pertes de précision.

Valider en préproduction les workers, fichiers WASM, politique CSP, CORS et requêtes HTTP partielles avec les hébergements réels. Mesurer plusieurs tailles de fichiers sur un poste modeste et sur mobile. Une limite de lignes retournées ne borne pas à elle seule le temps de calcul.

### Interface et dépendances

Le prototype possède ses propres styles et composants. La proximité Nuxt/Vue facilite la reprise mais ne garantit ni compatibilité immédiate des versions ni conformité au design system.

Les fichiers publics de cdata consultés indiquent Node 24 minimum et Nuxt `~4.4.8`, contre Node `>=22.19.0` et Nuxt `4.5.1` ici. Aligner sur la branche d’intégration ; ne pas imposer une mise à jour globale de cdata pour reprendre l’assistant.

Conserver le contrat de streaming AI SDK tant que le client utilise `DefaultChatTransport`, ou définir un transport adapté. Un endpoint JSON classique ne remplace pas ce protocole. Tester les reprises après outils, les clarifications et les propositions en attente.

## Préserver les tests utilisateurs pendant la passation

1. Identifier une version de référence du prototype et consigner les changements de prompt, modèle et interface.
2. Conserver le prototype de test disponible pendant l’intégration ; séparer les retours du prototype de ceux de cdata.
3. Transformer les cas réels en scénarios reproductibles : ressource, question, résultat attendu, échec rencontré, priorité.
4. Évaluer les réponses selon exactitude du résultat, SQL, provenance, représentation graphique, pertinence des clarifications, temps et coût.
5. Réintégrer les correctifs utiles sur les deux versions selon une règle explicite, pour éviter leur divergence.

La version du prompt est déjà renvoyée dans les messages. En revanche, les champs Grist construits dans `server/services/feedback.ts` ne contiennent ni cette version ni celle de l’application. Ajouter ces identifiants pour interpréter les retours pendant la migration.

## Validation et conditions de passage

Vérifications exécutées lors de cette analyse :

- `pnpm test` : **22 fichiers, 120 tests réussis**.
- `pnpm typecheck` : **réussi**.
- `pnpm lint` : **réussi**.

Le build et les tests navigateur n’ont pas été relancés dans cette analyse. Aucun appel réel à Albert et aucune écriture dans Grist n’ont été effectués. Les tests Playwright lus couvrent notamment chargement, SQL, application de vue et présentation mobile ; ils ne démontrent pas le fonctionnement complet de la boucle IA sur l’infrastructure cible.

Avant un pilote intégré, exiger :

- un parcours complet dans cdata en préproduction et un test d’annulation ;
- un changement de ressource sans réutilisation de résultat précédent ;
- des quotas cohérents entre instances et une saturation contrôlée ;
- un service désactivable sans bloquer l’exploration des données ;
- une séparation des configurations et feedbacks entre environnements ;
- un corpus d’évaluation issu des tests utilisateurs, avec seuils validés par l’équipe ;
- un responsable nommé pour les incidents et une procédure de retour arrière.

## Proposition de réunion de reprise — 60 minutes

| Durée | Sujet | Résultat attendu |
| --- | --- | --- |
| 10 min | Démonstration d’une réussite et d’un échec réel | Périmètre et limites partagés |
| 15 min | Flux navigateur / serveur / Albert / catalogue | Décision sur l’hébergement de l’orchestration |
| 15 min | Insertion dans cdata et moteur de données | Point d’entrée, contrats et réutilisation retenus |
| 10 min | Quotas, données transmises, exploitation | Responsables et prérequis du pilote |
| 10 min | Lots, tests utilisateurs et bascule | Premier ticket complet et critères d’acceptation |

Ordre de livraison proposé : décision d’architecture → tranche complète en préproduction → durcissement et adaptation UI → pilote intégré → généralisation après évaluation. Estimer les charges avec l’équipe après la tranche complète, particulièrement si elle choisit un portage Python.
