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

## Orchestration et limites actuelles

Le client utilise `DefaultChatTransport` vers `/nuxt-api/agents/exploration`.
Après l’exécution d’un outil local, il transmet son résultat et reprend la
conversation. Lorsqu’un graphique ou une carte est prêt, le client arrête la
reprise automatique : il ne renvoie pas ses centaines de lignes uniquement pour
obtenir une conclusion textuelle. Une question sur le schéma peut aussi recevoir
une réponse déterministe sans génération par le modèle.

| Limite | Valeur | Source |
| --- | --- | --- |
| Étapes dans un appel serveur | 5 | `server/agents/exploration-config.ts` |
| SQL distincts par question | 3 | Même fichier et `server/agents/tool-budget.ts` |
| Opérations par question | 8 | `exploration-config.ts` ; historique et appels en cours |
| Délai d’un appel modèle / budget de tour | 120 s / 240 s | `exploration-config.ts` |
| Question / messages transmis / corps sérialisé | 4 000 caractères / 20 messages / 512 Kio | `shared/agents/conversation-limits.ts` |
| Colonnes de schéma / sortie modèle | 300 / 4 096 tokens | Même fichier |
| Échantillon de schéma / résultat SQL agent | 5 / 20 lignes | `useDatasetEngine.client.ts` |
| Données graphique / carte | 1 000 / 5 000 lignes | Même fichier ; sorties locales de visualisation |

Les cinq étapes ne sont pas un compteur global de toute la conversation. Les
budgets par question et la durée du tour s’appuient en partie sur l’historique et
l’horodatage reçus du navigateur. Une limite de lignes retournées ne garantit pas
un temps de calcul SQL maximal. Les quotas serveur sont locaux au processus ;
voir le [guide d’exploitation](demarrage-deploiement.md).

## Résolution des ressources et feedback

Les exemples de départ viennent de `shared/data/exploration-resources.ts`.
La recherche et la résolution d’une URL consultent l’API publique ; les ressources
sont éligibles si leurs métadonnées exposent `analysis:parsing:parquet_url` ou un
fichier au format Parquet. Leur lecture dépend ensuite de l’accessibilité réseau
et du navigateur. La route agent vérifie que la ressource et son URL correspondent
aux métadonnées publiques.

L’évaluation d’une réponse ouvre un dialogue. L’envoi explicite transmet note,
question, réponse, modèle, contexte et commentaire facultatif via
`/nuxt-api/feedback` vers Grist. Fermer le dialogue sans envoyer ne crée pas de
feedback. L’invitation après six questions ouvre un formulaire d’avis général
distinct. L’historique de conversation n’est pas persisté par l’application ;
les réponses envoyées dans un feedback le sont dans Grist.

## Documentation et galerie

`/documentation` et `/documentation/technique` sont des explications destinées
aux utilisateurs, pas des procédures d’exploitation. Les procédures sont dans
ce dossier. `/design` utilise des composants réels avec des données de démonstration :
les formulaires et dépendances réseau ne sont pas tous simulés. La galerie couvre
les principaux états ; les scénarios conversationnels et la recette mobile réelle
restent à vérifier dans l’explorateur.
