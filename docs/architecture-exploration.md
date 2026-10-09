# Architecture du prototype d’exploration

## Objectif

Maintenir une frontière explicite entre le code réutilisable de l’assistant et
les interfaces expérimentales du prototype.

## Couches

| Couche | Responsabilité | Reprise envisagée |
| --- | --- | --- |
| `server/agents` | Orchestration, fournisseur, limites et prompts | Oui |
| `shared/agents` | Contrats des tools et visualisations | Oui |
| `shared/sql` | Validation des requêtes en lecture seule | Oui, après durcissement |
| `app/composables/useDatasetEngine.client.ts` | Exécution locale DuckDB et état de la ressource | À arbitrer avec cdata |
| `app/composables/useExplorationToolRuntime.client.ts` | Pont entre AI SDK et moteur de données | Oui |
| `app/components/exploration` | Interface de l’assistant et de l’explorateur | Partiellement |
| `app/pages/laboratoire/exploration.vue` | Assemblage propre au prototype | Non |
| `app/pages/experiences` | Expérimentations isolées | Non |

## Invariants

1. Une requête SQL doit réussir avant d’alimenter une visualisation.
2. Une visualisation référence l’identifiant exact de son exécution SQL.
3. Les exécutions DuckDB sont sérialisées sur la connexion active.
4. Un changement de ressource invalide les requêtes et résultats précédents.
5. Les expériences peuvent réutiliser les contrats publics, mais ne doivent pas
   modifier le comportement de l’agent d’exploration.
6. Les limites agentiques et la version des prompts sont centralisées.

## Contrat d’un résultat SQL

`DatasetQueryResult` transporte un `executionId`. Un graphique ou une carte
ajoute `sourceExecutionId`, ce qui rend le lien de provenance vérifiable sans
dépendre d’une simple notion de « dernier résultat » dans l’interface.

## Règle de modification

Toute évolution d’un contrat partagé doit être couverte par les tests unitaires
et vérifiée sur le parcours d’exploration avant d’être utilisée dans une page
expérimentale.

## Stratégie de test

- Les tests unitaires vérifient les contrats, les budgets de tools, les prompts
  et le runtime sans navigateur.
- Les tests Playwright vérifient le chemin réel Vue → DuckDB-WASM → interface à
  partir d’une ressource Parquet locale.
- Le parcours navigateur minimal couvre le chargement des données, l’exécution
  SQL, l’application d’une vue filtrée et son retour à l’état initial.
- L’appel au fournisseur IA reste hors de ce test déterministe ; il doit être
  évalué séparément avec un protocole de prompts et des traces d’observabilité.
