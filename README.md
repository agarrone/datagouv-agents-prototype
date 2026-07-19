# Prototype des agents data.gouv.fr

Prototype Vue autonome destiné à expérimenter deux assistants :

- exploration de données ;
- aide à la publication.

Ce dépôt n’est pas une intégration à `datagouv/cdata` ou
`opendatateam/udata`. Il en reprend certaines conventions publiques afin de
faciliter un éventuel portage ultérieur.

## Principes

- Nuxt, Vue et TypeScript strict ;
- AI SDK avec un fournisseur OpenAI-compatible configurable ;
- exécution locale de DuckDB-WASM prévue pour les données et le SQL ;
- contrats Zod entre modèle, outils et interface ;
- adaptateurs isolant catalogue, publication, authentification et télémétrie ;
- aucune écriture réelle dans data.gouv.fr depuis le prototype.

## Démarrage

```bash
cp .env.example .env
pnpm install
pnpm dev
```

L’interface fonctionne sans fournisseur IA. Les appels d’agent nécessiteront
ensuite les trois variables documentées dans `.env.example`.

## Vérifications

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Structure

- `app/` : pages et composants Vue ;
- `server/agents/` : provider et orchestration serveur ;
- `shared/` : types et schémas transportables ;
- `adapters/` : frontières avec les services externes ;
- `tests-unit/` : règles et contrats isolés.

## Configuration de l’agent

Le prototype utilise Vercel AI Gateway par défaut :

```dotenv
NUXT_AI_GATEWAY_API_KEY=
NUXT_AI_GATEWAY_MODEL=openai/gpt-5.4-mini
```

Dans un déploiement Vercel, `AI_GATEWAY_API_KEY` ou le jeton OIDC fourni par
Vercel sont également reconnus. Le modèle peut être remplacé sans modifier le
code.

Un endpoint OpenAI-compatible reste disponible comme solution de repli avec
`NUXT_AI_BASE_URL`, `NUXT_AI_API_KEY` et `NUXT_AI_MODEL`. Aucun secret n’est
envoyé au navigateur.

Pour faciliter le déploiement du prototype existant, les noms historiques
`ALBERT_API_URL`, `ALBERT_API_KEY` et `ALBERT_MODEL` sont aussi reconnus
directement.

## Spike d’exploration

La page `/laboratoire/exploration` valide actuellement :

- le chargement d’une fixture Parquet locale ;
- DuckDB-WASM et son Worker exclusivement dans le navigateur ;
- l’inspection typée du schéma ;
- l’exécution bornée de SQL en lecture seule ;
- les tools client `inspect_schema` et `execute_sql` ;
- la réinjection automatique de leurs résultats dans AI SDK ;
- une réponse réellement streamée par une route Nitro.

La fixture peut être régénérée avec :

```bash
pnpm fixture:generate
```

Le prochain jalon consiste à tester le parcours avec Albert configuré, puis à
extraire les composants conversationnels avant d’ajouter d’autres capacités.
