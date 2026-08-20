# Assistant d’exploration de données — prototype data.gouv.fr

Prototype autonome d’un assistant conversationnel capable d’explorer des
ressources tabulaires publiées sur data.gouv.fr.

L’utilisateur choisit une ressource, consulte son tableau, puis pose des
questions en français. L’assistant peut inspecter le schéma, exécuter du SQL en
lecture seule, répondre à partir des résultats, proposer une nouvelle vue du
tableau et produire des graphiques ou des cartes.

Ce dépôt sert à éprouver le fonctionnement et l’interface de cet assistant. Il
n’est pas intégré à [`datagouv/cdata`](https://github.com/datagouv/cdata) ni à
[`opendatateam/udata`](https://github.com/opendatateam/udata), et n’écrit aucune
donnée sur data.gouv.fr.

## Ce que le prototype permet de tester

- sélection d’exemples, recherche dans le catalogue data.gouv.fr ou collage direct de l’URL d’un jeu de données ;
- choix parmi les ressources Parquet compatibles du jeu de données sélectionné ;
- chargement et interrogation des données dans le navigateur avec DuckDB-WASM ;
- trois questions de départ fixes et deux suggestions générées localement à partir du schéma de la ressource ;
- conversation streamée avec un modèle appelé par Vercel AI SDK ;
- tableaux Markdown pleine largeur pour les classements, comparaisons, distributions et listes structurées, avec toutes les colonnes utiles et les types DuckDB traduits en français ;
- inspection du schéma et exécution de requêtes SQL DuckDB en lecture seule ;
- console SQL avec coloration syntaxique, autocomplétion et diagnostic ;
- proposition de filtres, tris ou vues à appliquer au tableau après confirmation ;
- graphiques ECharts : barres, courbes, aires, secteurs et nuages de points ;
- cartes MapLibre : points, GeoJSON et choroplèthes françaises ;
- fallbacks cartographiques prudents : alias uniques validés, ambiguïtés bloquées, lignes rejetées signalées et regroupement des gros volumes de points ;
- fonds vectoriels OpenMapTiles distribués par data.gouv.fr ;
- raisonnement observable en français, distinct des traces techniques repliables des outils utilisés ;
- progression continue entre planification, tools, interprétation et rédaction, sans doublon entre deux reprises automatiques ;
- erreurs intermédiaires masquées lorsqu’une tentative ultérieure du même tool réussit ;
- évaluation utile ou inutile envoyée vers Grist, formulaire détaillé prérempli et sollicitation unique après six questions ;
- galerie exhaustive des composants et états visuels du prototype.

## Pages

| Route | Rôle |
| --- | --- |
| `/` | Présentation du prototype et choix de la ressource |
| `/laboratoire/exploration?resource=…` | Explorateur, assistant et console SQL |
| `/documentation` | Fonctionnement expliqué aux utilisateurs |
| `/documentation/technique` | Architecture, outils, prompts et limites |
| `/design` | Inventaire des composants, états et visualisations |

## Architecture

Le calcul sur le fichier reste autant que possible dans le navigateur :

1. la page charge la ressource Parquet dans DuckDB-WASM ;
2. le serveur Nitro transmet la conversation et les instructions au modèle ;
3. le modèle appelle des outils aux contrats Zod explicites ;
4. les outils de données sont exécutés côté navigateur sur la table `data` ;
5. leurs sorties bornées sont réinjectées dans la conversation ;
6. le modèle poursuit son travail, dans une limite globale de cinq étapes ;
7. Vue affiche la réponse, le raisonnement observable, les traces des outils et les éventuelles
   visualisations.

La ressource complète n’est donc pas envoyée spontanément au modèle. Celui-ci
reçoit le contexte courant, le schéma et les résultats nécessaires à la réponse.

### Outils de l’agent

| Outil | Exécution | Fonction |
| --- | --- | --- |
| `request_clarification` | interface | Suspend l’analyse et présente 2 à 4 choix cliquables à l’utilisateur |
| `get_dataset_metadata` | serveur | Lit les métadonnées publiques du jeu de données via l’API data.gouv.fr |
| `inspect_schema` | navigateur | Retourne les colonnes, types, nombre de lignes et un échantillon |
| `execute_sql` | navigateur | Exécute une requête `SELECT` ou `WITH` bornée sur DuckDB |
| `propose_explorer_view` | navigateur | Propose une vue du tableau et attend la confirmation de l’utilisateur |
| `create_chart` | navigateur | Construit un graphique à partir du dernier résultat SQL vérifié |
| `create_map` | navigateur | Construit une carte à partir du dernier résultat SQL vérifié |

## Stack

- Nuxt 4, Vue 3 et TypeScript strict ;
- Vercel AI SDK 7 et AI SDK Vue ;
- Vercel AI Gateway ou fournisseur OpenAI-compatible, dont Albert ;
- DuckDB-WASM pour le SQL local ;
- ECharts pour les graphiques ;
- MapLibre GL et les fonds OpenMapTiles de data.gouv.fr pour les cartes ;
- CodeMirror 6 pour la console SQL ;
- Tailwind CSS 4 pour l’interface ;
- Zod pour les contrats de données ;
- Vitest pour les tests unitaires.

## Installation locale

Pré-requis : Node.js 22 ou plus récent et pnpm 10.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Le site est alors disponible sur <http://localhost:3000>.

La page et les données peuvent être consultées sans fournisseur IA. Une
configuration de modèle est nécessaire pour obtenir une réponse de l’assistant.

## Configuration du modèle

### Vercel AI Gateway

```dotenv
NUXT_AI_GATEWAY_API_KEY=
NUXT_AI_GATEWAY_MODEL=openai/gpt-5.4-mini
```

Sur Vercel, `AI_GATEWAY_API_KEY` et le jeton OIDC fourni par la plateforme sont
également reconnus. Les secrets restent côté serveur.

### Fournisseur OpenAI-compatible

```dotenv
NUXT_AI_BASE_URL=
NUXT_AI_API_KEY=
NUXT_AI_MODEL=
```

Les noms historiques `ALBERT_API_URL`, `ALBERT_API_KEY` et `ALBERT_MODEL` sont
également pris en charge.

## Sécurité et données

- seules les requêtes uniques commençant par `SELECT` ou `WITH` sont acceptées ;
- les instructions d’écriture ou d’administration DuckDB sont refusées ;
- une requête doit réussir avant d’alimenter une vue, un graphique ou une carte ;
- les résultats transmis au modèle sont limités ;
- les clés de fournisseur ne sont jamais envoyées au navigateur ;
- les questions et réponses évaluées sont envoyées à Grist avec le contexte de
  la ressource, sans identité utilisateur demandée.

## Structure du dépôt

```text
app/
  components/exploration/   composants de conversation, SQL et visualisation
  composables/              moteur DuckDB, runtime des outils et sons
  pages/                    accueil, explorateur, documentation et design
server/
  agents/                   fournisseur, orchestration et prompts spécialisés
  routes/nuxt-api/          agent, contours géographiques et feedback
  services/                 accès à l’API publique data.gouv.fr
shared/
  agents/                   définitions des outils et contrats de visualisation
  data/                     catalogue des ressources proposées
  schemas/                  schémas Zod partagés
  sql/                      validation du SQL en lecture seule
  types/                    types de l’explorateur et des messages
tests-unit/                 tests des contrats, prompts, outils et garde-fous
```

## Vérifications

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Limites actuelles

- la liste des ressources compatibles est définie dans le code ;
- les conversations et résultats ne sont pas persistés ;
- la boucle de l’agent est limitée à cinq étapes ;
- le nom du modèle affiché dans l’interface n’est pas encore relié à la
  configuration effective ;
- les erreurs sont structurées et attribuées au fournisseur IA, au prototype,
  à DuckDB ou aux services externes ; leur mesure agrégée en production reste à
  mettre en place ;
- il n’existe pas encore de protocole d’évaluation automatique des réponses ;
- l’assistant de publication reste une expérience distincte et non référencée
  depuis l’accueil.

Pour le détail du comportement et des choix techniques, consulter directement
les pages `/documentation` et `/documentation/technique` du prototype.
