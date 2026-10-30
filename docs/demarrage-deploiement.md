# Démarrer et déployer le prototype

Guide vérifié contre le code du dépôt le 20 octobre 2026. Il décrit un déploiement
Node/Nitro ; il ne décrit pas la configuration de l’hébergement actuellement utilisé,
qui n’est pas versionnée ici. Le dépôt ne fournit ni Dockerfile ni pipeline CI/CD.

## 1. Installer et lancer en local

Pré-requis : Git, Node.js **22.19.0 minimum**, pnpm **10.12.1**, un navigateur
récent prenant en charge WebAssembly et les Web Workers. `.nvmrc` sélectionne Node 22.

```bash
git clone https://github.com/agarrone/datagouv-agents-prototype.git
cd datagouv-agents-prototype
# Si nvm est installé :
nvm install
nvm use
node --version
pnpm --version
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Ne recopier `.env.example` que si `.env` n’existe pas déjà. Installer ou sélectionner
pnpm 10.12.1 avec le gestionnaire utilisé par l’équipe si la commande est absente
ou si sa version diffère. Le lockfile doit rester inchangé lors de l’installation.

Ouvrir <http://localhost:3000>. Pour changer de port : `pnpm dev --port 3001`.
Nuxt charge `.env` en développement. Ne jamais committer ce fichier.

Sans Albert, le tableau, les filtres et la console SQL restent utilisables.
Les exemples réels et la recherche demandent un accès réseau au catalogue et aux
fichiers Parquet. Une réponse générée par le modèle demande la configuration ci-dessous.

Pour une recette locale du tableau sans dépendance au catalogue, utiliser les
fixtures des tests Playwright : elles sont déjà dans `public/fixtures/datasets.parquet`.
La commande `pnpm fixture:generate` permet de les régénérer volontairement.

## 2. Configuration serveur

Les variables ci-dessous sont lues côté serveur, par `runtimeConfig` ou par repli
vers `process.env`. Elles ne doivent pas être placées dans une configuration publique.

| Variable | Rôle et comportement |
| --- | --- |
| `ALBERT_API_URL` | URL de base de l’API compatible OpenAI fournie par l’équipe Albert, avec le chemin requis par le fournisseur ; ne pas ajouter arbitrairement `/chat/completions` |
| `ALBERT_API_KEY` | Clé d’accès Albert |
| `ALBERT_MODEL` | Modèle de repli si aucun choix n’est transmis ; par exemple `gpt-oss-120b`, sous réserve de disponibilité sur le compte |
| `ALBERT_TEMPERATURE` | Nombre de 0 à 2 ; défaut 0 |
| `ALBERT_PRESENCE_PENALTY` | Nombre de −2 à 2 ; défaut 0 |
| `RATE_LIMIT_SECRET` | Secret long et aléatoire dédié à la signature de session et à l’empreinte IP ; configurer explicitement pour une instance partagée |
| `ALBERT_DAILY_REQUEST_LIMIT` | Entier positif : seuil applicatif à 80 % de cette valeur ; absent, nul ou invalide, aucun plafond quotidien global n’est appliqué |

Exemple de génération locale du secret, à conserver dans le gestionnaire de secrets :

```bash
openssl rand -hex 32
```

L’interface envoie explicitement le modèle sélectionné, GPT-OSS-120B par défaut.
Modifier seulement `ALBERT_MODEL` ne change donc pas le choix initial de l’interface.
La liste autorisée et le défaut se trouvent dans `shared/agents/models.ts`.
Sans secret dédié, le code utilise la clé Albert, puis un secret éphémère en dernier
recours : ces replis ne sont pas une configuration d’exploitation à privilégier.

Les clés équivalentes Nuxt sont notamment `NUXT_ALBERT_API_URL`,
`NUXT_ALBERT_API_KEY`, `NUXT_ALBERT_MODEL`, `NUXT_ALBERT_TEMPERATURE`,
`NUXT_ALBERT_PRESENCE_PENALTY`, `NUXT_RATE_LIMIT_SECRET` et
`NUXT_ALBERT_DAILY_REQUEST_LIMIT`. Utiliser une seule convention par environnement ;
une valeur `runtimeConfig` non vide prend priorité sur le repli sans préfixe.

### Paramètres qui ne sont pas encore configurables par environnement

| Service | Emplacement actuel |
| --- | --- |
| API publique de production data.gouv.fr | `server/services/datagouv.ts` |
| Destination des évaluations de réponses Grist | `server/routes/nuxt-api/feedback.post.ts` |
| Formulaires d’avis général et de bêta-test | `app/components/PrototypeBanner.vue`, `app/components/exploration/ConversationFeedbackPrompt.vue` |
| Contours géographiques 2025 | `server/routes/nuxt-api/boundaries.get.ts` |
| Styles cartographiques | `app/components/exploration/AgentMap.client.vue` |
| URL publique et image de partage du prototype | `nuxt.config.ts` |
| Guide MCP de l’expérience de publication | `server/routes/nuxt-api/agents/publication.post.ts` |

Un déploiement de préproduction ne sépare pas automatiquement ces destinations.
Adapter ces valeurs avant d’y recueillir des retours de test. Les formulaires de
la galerie `/design` peuvent eux aussi envoyer de vrais retours.

## 3. Vérifier une version avant livraison

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
```

Les tests unitaires sont locaux. Les tests d’exploration navigateur remplacent
les API catalogue par des fixtures et n’appellent pas le modèle. Le test du bandeau
ouvre toutefois des formulaires externes dans une iframe, sans les soumettre.
Playwright lance le serveur sur le port 3000 et peut réutiliser un serveur existant
hors CI : arrêter ce serveur pour être certain de tester la version courante.

Le test d’intégration Grist est **distinct et écrit réellement un enregistrement** :

```bash
RUN_GRIST_INTEGRATION_TEST=1 FEEDBACK_TEST_BASE_URL=http://localhost:3000 pnpm test:integration:feedback
```

Il exige une application démarrée et un accès réseau à Grist. L’enregistrement
porte la mention `[TEST D’INTÉGRATION]` ; prévoir sa suppression dans Grist.
Ne pas intégrer cette commande aux contrôles ordinaires sans destination dédiée.

## 4. Construire et démarrer le serveur de production

Le produit nécessite un serveur : un hébergement des seuls fichiers statiques
ou `pnpm generate` ne suffit pas pour les routes agent et feedback.

Construction explicite pour Node :

```bash
pnpm install --frozen-lockfile
NITRO_PRESET=node-server pnpm build
```

Livrer **tout le répertoire `.output/`**, notamment les fichiers publics, les
workers et le WASM. Le serveur démarre depuis la racine de la livraison :

```bash
NODE_ENV=production NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs
```

Les variables de la section 2 doivent être injectées par l’hébergeur ou le
superviseur au démarrage. Le serveur construit ne charge pas automatiquement
le `.env` du projet. Pour une vérification locale du build avec un `.env` existant :

```bash
NODE_ENV=production NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node --env-file=.env .output/server/index.mjs
```

`127.0.0.1` convient si le proxy est sur la même machine. Dans un conteneur ou
sur un réseau de service, définir l’adresse d’écoute adaptée, par exemple `0.0.0.0`.
Utiliser le superviseur de l’équipe pour le redémarrage automatique et la collecte
des journaux. `pnpm preview` sert à prévisualiser un build, pas à configurer sa supervision.

### Proxy et réseau

- Exposer le site en HTTPS ; les cookies de session sont `Secure` en production.
- Transmettre les réponses de `/nuxt-api/agents/*` en streaming, sans mise en
  tampon ni cache. Tester l’arrivée progressive des morceaux de réponse.
- Prévoir un délai proxy cohérent avec les appels modèle de 120 s et l’attente
  locale pouvant atteindre 30 s. Un tour peut se poursuivre sur plusieurs appels
  HTTP, avec un budget applicatif de 240 s.
- Préserver l’origine publique vue par l’application. La route feedback compare
  `Origin` avec l’origine reconstruite de la requête ; tester ce contrôle derrière
  le vrai proxy plutôt que le désactiver.
- Écraser les en-têtes IP transmis par un client non fiable : le quota lit
  `X-Forwarded-For`. Protéger aussi la taille du corps HTTP avant son traitement.
- Vérifier que la politique CSP autorise les workers et WASM nécessaires, les
  fichiers Parquet et les dépendances cartographiques. Vérifier CORS et les lectures
  partielles sur les hébergements réels des ressources.
- Le serveur doit accéder à Albert, au catalogue, à Grist et aux contours ;
  le navigateur accède aux Parquet, aux fonds de carte et aux formulaires intégrés.
  L’expérience de publication utilise également le guide MCP externe.

### Limites d’exploitation actuelles

Les quotas, la concurrence et la file sont **en mémoire par processus**. Le seuil
80 % n’est ni un compteur fournisseur synchronisé, ni un budget en tokens. Les
limites repartent à zéro au redémarrage et se multiplient avec les instances.
Ne pas présenter ce mécanisme comme un plafond distribué garanti.

Le dépôt n’implémente pas de contrôle de disponibilité dédié, de persistance des
conversations, de désactivation centralisée de l’IA, ni de métriques agrégées.
Les expériences dashboard et publication restent accessibles dans le build :
leur absence de lien depuis l’accueil ne les désactive pas.

## 5. Recette après déploiement

1. Ouvrir `/`, `/documentation`, `/documentation/technique` et `/design` ; vérifier
   les assets, polices et erreurs de chargement. Ne pas envoyer de feedback de test
   depuis la galerie vers une destination de collecte réelle.
2. Sélectionner une ressource publique compatible, charger le tableau et exécuter
   `SELECT COUNT(*) AS nombre FROM data` dans la console SQL.
3. Avec un compte Albert configuré, poser une question qui nécessite un calcul ;
   vérifier streaming, résultat SQL et reprise après outil. Cette étape consomme
   le quota réel du fournisseur.
4. Tester un graphique, l’arrêt d’une réponse et un changement de ressource.
5. Sur mobile, vérifier l’ouverture plein écran, la fermeture et l’accès au champ
   de question ; compléter avec un appareil réel pour le clavier virtuel.
6. Sur une destination de feedback dédiée, envoyer une évaluation et vérifier
   qu’une seule ligne contient note, contexte et commentaire éventuel.

Une page HTTP 200 prouve seulement que le serveur répond, pas qu’Albert, DuckDB
ou Grist fonctionnent. Conserver commit, version de prompt et résultat de recette
avec la livraison, sans enregistrer les secrets.

## 6. Dépannage et retour arrière

| Symptôme | Vérifications |
| --- | --- |
| Tableau disponible, assistant indisponible | Variables présentes dans le processus de production, clé Albert, URL de base et modèle autorisé |
| Aucune réponse progressive | Mise en tampon/cache du proxy, délais d’attente, erreurs réseau |
| Ressource refusée ou illisible | Identifiants et URL attestés par le catalogue, disponibilité API, CORS, format Parquet et mémoire navigateur ; une panne catalogue peut actuellement apparaître comme un refus |
| Feedback refusé en 403 | Correspondance entre origine du navigateur et origine reconstruite derrière le proxy |
| Feedback en 502 | Destination Grist, accès réseau et réponse du service |
| Erreur 429 | Distinguer quota Albert et limites locales grâce à l’erreur structurée ; consulter la configuration et le nombre de processus |
| Worker ou WASM introuvable | Livraison complète de `.output`, chemins des assets et politique CSP |
| Conversation perdue au rechargement | Comportement actuel : historique non persisté |

Pour revenir à la version précédente, restaurer l’artefact `.output` précédent
avec sa configuration compatible et relancer le service via le superviseur.
Aucune migration de base de conversations n’est nécessaire ; les feedbacks déjà
écrits dans Grist ne sont pas annulés. Le redémarrage réinitialise les compteurs
locaux. Vérifier de nouveau le tableau et une réponse après retour arrière.

## 7. Documents associés

- [README](../README.md) : périmètre fonctionnel et commandes rapides.
- [Architecture](architecture-exploration.md) : couches, invariants et limites chiffrées.
- [Passation cdata / udata](passage-udata-cdata.md) : décisions et travaux d’intégration.
