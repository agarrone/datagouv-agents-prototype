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

## État

Le dépôt contient le socle du jalon 0 et une page de laboratoire. Le prochain
jalon consiste à valider le streaming AI SDK, les tools exécutés dans le
navigateur et DuckDB-WASM sur une ressource Parquet fixe.
