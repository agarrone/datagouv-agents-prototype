<script setup lang="ts">
const phases = [
  ["1. Charger", "Le navigateur télécharge la ressource Parquet, initialise DuckDB-WASM et conserve son schéma en mémoire."],
  ["2. Planifier", "Le modèle interprète la demande, décide s’il faut clarifier et choisit les outils nécessaires."],
  ["3. Exécuter", "Les tools serveur ou navigateur produisent des preuves structurées, puis leurs sorties sont réinjectées dans la conversation."],
  ["4. Poursuivre", "AI SDK relance automatiquement l’agent après un tool local, dans une limite globale de cinq étapes."],
  ["5. Restituer", "Le modèle rédige une réponse concise et peut demander une visualisation ou proposer une vue de l’explorateur."],
];

const tools = [
  { name: "request_clarification", runs: "Interface + utilisateur", input: "Question courte et deux à quatre choix distincts.", output: "Choix explicite de l’utilisateur.", implementation: "Suspend l’analyse, affiche les choix sous forme de suggestions cliquables, puis reprend automatiquement avec la précision retenue." },
  { name: "get_dataset_metadata", runs: "Serveur", input: "Contexte du jeu de données actif.", output: "Titre, description, producteur, licence, qualité, dates et ressources.", implementation: "Interroge l’API publique data.gouv.fr. Il ne lit pas les valeurs de la ressource." },
  { name: "inspect_schema", runs: "Navigateur", input: "Table DuckDB locale data.", output: "Nombre de lignes, colonnes, types et échantillon.", implementation: "Utilise DuckDB-WASM et réutilise le schéma chargé au démarrage." },
  { name: "execute_sql", runs: "Navigateur", input: "Requête DuckDB et objectif explicite.", output: "Colonnes, 100 premières lignes, troncature et durée.", implementation: "Valide puis exécute une unique requête SELECT ou WITH en lecture seule." },
  { name: "propose_explorer_view", runs: "Navigateur + utilisateur", input: "Requête en lecture seule, titre et justification.", output: "Vue appliquée, colonnes, nombre de lignes et troncature.", implementation: "Prévisualise et vérifie la requête, puis affiche une confirmation. La vue ne remplace le tableau qu’après un clic utilisateur." },
  { name: "create_chart", runs: "Navigateur", input: "Type, titre, axe et jusqu’à quatre séries.", output: "Jusqu’à 1 000 lignes provenant du dernier SQL vérifié.", implementation: "Contrôle les champs demandés puis réalise le rendu avec ECharts." },
  { name: "create_map", runs: "Navigateur", input: "Spécification points, GeoJSON ou choroplèthe.", output: "Jusqu’à 5 000 lignes provenant du dernier SQL vérifié.", implementation: "Contrôle les champs puis réalise le rendu avec MapLibre et les contours administratifs nécessaires." },
];

const promptLayers = [
  ["Identité et preuves", "Définit le rôle de l’assistant, la table locale et l’interdiction de répondre sans résultat attesté.", "server/agents/prompts/identity.ts"],
  ["Périmètre", "Réévalue chaque message, refuse les demandes hors sujet et distingue une capacité pertinente mais indisponible.", "server/agents/prompts/scope.ts"],
  ["Données non fiables", "Empêche les métadonnées, colonnes, valeurs et sorties de tools d’être interprétées comme des instructions.", "server/agents/prompts/untrusted-data.ts"],
  ["Économie et limites des preuves", "Réutilise les preuves existantes et encadre l’interprétation des échantillons, top-N, limites et ex æquo.", "server/agents/prompts/evidence.ts"],
  ["Planification et clarification", "Choisit la preuve la plus légère et demande une précision lorsque plusieurs interprétations changeraient le résultat.", "server/agents/prompts/routing.ts"],
  ["Politique SQL", "Encadre les colonnes, les correspondances exactes, les agrégations, les limites et la correction des requêtes.", "server/agents/prompts/sql.ts"],
  ["Politique de l’explorateur", "Distingue une réponse conversationnelle d’une demande explicite de modification du tableau.", "server/agents/prompts/explorer.ts"],
  ["Politique des visualisations", "Détermine quand et comment créer un graphique ou une carte à partir d’un SQL réussi.", "server/agents/prompts/visualizations.ts"],
  ["Politique de réponse", "Impose le français, une réponse directe, des limites visibles et l’absence de jargon interne.", "server/agents/prompts/response.ts"],
];

const summaryLinks = [
  ["architecture", "Architecture et cycle d’une réponse"],
  ["model", "Fournisseur et modèle"],
  ["tools", "Outils disponibles"],
  ["security", "Exécution et sécurité"],
  ["visualizations", "Graphiques et cartes"],
  ["feedback", "Feedback"],
  ["prompts", "Organisation des prompts"],
  ["limits", "Limites connues"],
];

useSeoMeta({
  title: "Fonctionnement technique de l’assistant — Prototype data.gouv.fr",
  description: "Architecture, outils, modèle, sécurité, prompts et limites de l’assistant d’exploration.",
});
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <div class="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:py-14">
      <nav class="self-start lg:sticky lg:top-6" aria-label="Sommaire de la documentation technique">
        <NuxtLink class="text-[12px] font-medium text-[#000091] underline underline-offset-4 hover:text-[#1212ff]" to="/documentation">
          Retour à la documentation
        </NuxtLink>
        <p class="mt-8 text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">Sommaire</p>
        <ol class="mt-3 space-y-2 text-[12px] leading-5">
          <li v-for="link in summaryLinks" :key="link[0]"><a class="hover:text-[#000091]" :href="`#${link[0]}`">{{ link[1] }}</a></li>
        </ol>
      </nav>

      <div class="min-w-0 max-w-[60rem]">
      <header class="pb-10">
        <p class="text-[13px] font-medium text-[#555555]">Documentation technique du prototype</p>
        <h1 class="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">Comment fonctionne l’agent d’exploration ?</h1>
        <p class="mt-5 max-w-3xl text-[18px] leading-7 text-[#555555]">Cette page décrit l’implémentation actuelle : orchestration AI SDK, outils, données échangées, visualisations, feedback et garde-fous. Elle documente un prototype, pas une architecture cible définitive.</p>
      </header>

      <DocumentationSection id="architecture" eyebrow="Orchestration" title="Architecture et cycle d’une réponse" description="Le serveur appelle le modèle ; le fichier Parquet, DuckDB et les outils de données restent dans le navigateur.">
        <ol class="grid gap-2 !pl-0 !list-none">
          <li v-for="phase in phases" :key="phase[0]" class="border-l-2 border-[#000091] bg-[#f6f6f6] px-4 py-3">
            <strong class="text-[14px] text-[#161616]">{{ phase[0] }}</strong>
            <p class="mt-1 text-[13px] leading-6">{{ phase[1] }}</p>
          </li>
        </ol>
        <p>La page Vue utilise <code>useChat</code> et <code>DefaultChatTransport</code>. La route Nitro appelle <code>streamText</code>. Après chaque tool local, sa sortie est ajoutée au message et AI SDK relance automatiquement l’agent.</p>
        <p>Au chargement de la page, une route dédiée lit en parallèle les métadonnées publiques du jeu de données pour construire sa fiche de contexte. Cette présentation reste indépendante du moteur DuckDB, de l’explorateur et du panneau assistant. Les deux recherches de l’explorateur utilisent une primitive visuelle commune afin d’éviter leur divergence.</p>
        <p>La boucle est bornée par <code>isStepCount(5)</code>. Une réponse complexe doit donc partager ces cinq étapes entre inspections, corrections SQL, visualisation et réponse finale.</p>
        <p>L’interface dérive quatre phases observables des messages AI SDK : planification avant le premier tool, utilisation des tools pendant leurs appels, interprétation après leurs sorties et rédaction dès que le texte final commence à arriver. Un identifiant de message assistant actif garantit qu’un seul état de progression est affiché. Une temporisation de 700 ms absorbe les passages transitoires à <code>ready</code> entre une sortie locale et la reprise automatique suivante.</p>
        <p>Le raisonnement visible est une synthèse déterministe des actions observables : intention comprise, contexte consulté, nombre de calculs, colonnes du résultat et représentation choisie. Il n’expose pas la chaîne de pensée privée du modèle. Les formulations descriptives des tools sont demandées en français et écartées de cette synthèse lorsqu’elles semblent être en anglais. Les traces techniques restent séparées dans « Outils utilisés ».</p>
        <p>Les erreurs de tool restent transitoires tant que le statut global est <code>submitted</code> ou <code>streaming</code>. Une erreur remplacée par une sortie réussie ultérieure du même tool est retirée à la fois des traces et de la zone de visualisation finale.</p>
      </DocumentationSection>

      <DocumentationSection id="model" eyebrow="Génération" title="Fournisseur et modèle" description="Le choix du fournisseur est réalisé côté serveur, sans exposer de clé au navigateur.">
        <dl class="grid gap-px overflow-hidden border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-2">
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Fournisseur d’accès</dt><dd class="mt-1 text-[13px]">Albert API</dd></div>
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Protocole</dt><dd class="mt-1 text-[13px]">Compatible avec l’API OpenAI</dd></div>
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Configuration</dt><dd class="mt-1 font-mono text-[13px]">ALBERT_API_URL · ALBERT_API_KEY</dd></div>
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Modèle actuel</dt><dd class="mt-1 font-mono text-[13px]">GPT-OSS-120B</dd></div>
        </dl>
        <p>Albert API est l’unique fournisseur d’accès aux modèles du prototype. Le modèle actuellement retenu est GPT-OSS-120B et la variable <code>ALBERT_MODEL</code> contient l’identifiant attendu par Albert pour y accéder. Aucun chemin de repli vers Vercel AI Gateway ou son jeton OIDC n’est activé. La puce de l’interface affiche bien le modèle, et son tooltip précise le fournisseur.</p>
      </DocumentationSection>

      <DocumentationSection id="tools" eyebrow="Capacités" title="Outils disponibles" description="Le modèle choisit un tool, mais son contrat Zod et son exécution restent sous le contrôle de l’application.">
        <div class="grid gap-3">
          <article v-for="tool in tools" :key="tool.name" class="border border-[#e5e5e5] p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-mono text-[13px] font-semibold text-[#000091]">{{ tool.name }}</h3>
              <span class="bg-[#f6f6f6] px-2 py-0.5 text-[11px] text-[#555555]">{{ tool.runs }}</span>
            </div>
            <dl class="mt-3 space-y-1.5 text-[13px] leading-6">
              <div><dt class="inline font-semibold text-[#161616]">Entrée : </dt><dd class="inline">{{ tool.input }}</dd></div>
              <div><dt class="inline font-semibold text-[#161616]">Sortie : </dt><dd class="inline">{{ tool.output }}</dd></div>
              <div><dt class="inline font-semibold text-[#161616]">Implémentation : </dt><dd class="inline">{{ tool.implementation }}</dd></div>
            </dl>
          </article>
        </div>
      </DocumentationSection>

      <DocumentationSection id="security" eyebrow="Garde-fous" title="Exécution, données transmises et sécurité" description="Le prototype sépare le calcul local, l’orchestration serveur et le rendu de l’interface.">
        <div class="grid gap-6 sm:grid-cols-2">
          <div><h3 class="font-semibold text-[#161616]">Dans le navigateur</h3><ul class="mt-2"><li>Ressource Parquet et instance DuckDB-WASM.</li><li>Schéma, requêtes SQL et résultats bornés.</li><li>Tableau, console SQL, ECharts et MapLibre.</li><li>Historique courant de la conversation.</li></ul></div>
          <div><h3 class="font-semibold text-[#161616]">Envoyé au modèle</h3><ul class="mt-2"><li>Question et historique de la conversation.</li><li>Contexte de la ressource et schéma chargé.</li><li>Appels d’outils et sorties nécessaires.</li><li>Erreurs SQL utiles à une éventuelle correction.</li></ul></div>
        </div>
        <p>Le validateur SQL accepte une seule requête commençant par <code>SELECT</code> ou <code>WITH</code>. Il refuse notamment INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, COPY, ATTACH, INSTALL, LOAD, CALL et PRAGMA.</p>
        <p>Une requête doit avoir été exécutée avec succès avant de pouvoir être appliquée à l’explorateur ou utilisée comme source d’une visualisation. Le prompt demande au modèle de ne pas dépasser trois essais SQL par question ; la route serveur impose aussi ce plafond en retirant réellement <code>execute_sql</code> des tools disponibles une fois le budget consommé.</p>
        <p>Les métadonnées, noms de colonnes, valeurs, échantillons et sorties de tools sont explicitement traités comme des données non fiables. Le contexte actif est sérialisé dans un bloc délimité afin qu’une instruction malveillante contenue dans une ressource ne soit pas confondue avec une instruction système.</p>
        <p>Les erreurs finales utilisent un contrat structuré commun. L’interface affiche l’origine, un code stable, une éventuelle référence fournisseur et une action adaptée ; le détail technique nettoyé reste dans un élément <code>details</code> replié. Les quotas temporaires (<code>ai_rate_limit</code>), quotas de compte, problèmes d’authentification, limites de contexte, réponses tronquées, limites d’étapes du prototype, erreurs SQL, DuckDB et visualisation sont distingués.</p>
        <p>Pour un retour HTTP 429, le serveur conserve <code>Retry-After</code> et l’identifiant de requête quand le fournisseur les transmet. Le bouton de nouvelle tentative reste désactivé pendant le délai indiqué. Une fin <code>length</code> est présentée comme une limite de longueur, tandis que l’arrêt après cinq étapes avec des tools encore attendus est attribué à la limite du prototype plutôt qu’au quota de tokens.</p>
      </DocumentationSection>

      <DocumentationSection id="visualizations" eyebrow="Rendu" title="Graphiques et cartes" description="Les visualisations sont toujours construites à partir du dernier résultat SQL vérifié.">
        <p><strong>Graphiques :</strong> ECharts prend en charge barres, courbes, aires, secteurs et nuages de points, avec jusqu’à quatre séries et 1 000 lignes.</p>
        <p><strong>Cartes :</strong> MapLibre prend en charge des coordonnées, une géométrie GeoJSON ou une jointure par région ou département français, dans une limite de 5 000 lignes. Les libellés privilégient le français ; les styles officiels de <code>openmaptiles.geo.data.gouv.fr</code> fournissent OSM Bright par défaut et Positron pour les choroplèthes.</p>
        <p>Avant le rendu, un nom de colonne manquant n’est remplacé que si un alias unique correspond au rôle attendu et aux valeurs observées. Une ambiguïté interrompt la création. La carte signale les coordonnées invalides et les territoires non appariés ; à partir de 100 points, les lieux proches sont regroupés selon le niveau de zoom.</p>
        <p>Les champs demandés par la spécification sont comparés aux colonnes du résultat SQL. Une visualisation est refusée si un champ manque. Le loader conserve la taille du composant final et reste visible au moins 900 ms.</p>
      </DocumentationSection>

      <DocumentationSection id="feedback" eyebrow="Amélioration continue" title="Mécanisme de feedback" description="Chaque réponse peut recevoir une évaluation utile ou inutile, complétée si nécessaire par un commentaire.">
        <ol><li>L’utilisateur choisit un pouce sous une réponse. Un tooltip précise les données transmises.</li><li>La route serveur valide le contenu avec Zod, vérifie l’origine de la requête et enregistre immédiatement l’évaluation dans Grist. L’origine fonctionnelle est conservée dans le champ de détails existant.</li><li>Quand ils sont disponibles, le nom du jeu de données, son URL data.gouv.fr et le nom de la ressource sont enregistrés dans <code>Dataset_name</code>, <code>Dataset_url</code> et <code>Ressource_name</code>.</li><li>Après l’envoi, l’interface propose d’ouvrir un formulaire Grist prérempli avec la question, la réponse, la ressource, le jeu de données, le modèle et la date.</li><li>Après six questions, une invitation unique propose également ce formulaire et préfixe la question avec « Invitation après 6 questions ».</li><li>L’interface indique le succès ou permet de réessayer en cas d’échec.</li></ol>
        <p>Le prototype n’envoie pas d’identité, mais le texte de la question et de la réponse fait partie du retour. Le formulaire détaillé reste facultatif.</p>
      </DocumentationSection>

      <DocumentationSection id="prompts" eyebrow="Instructions" title="Organisation des prompts" description="Les instructions sont découpées par responsabilité afin de rester lisibles, testables et portables.">
        <p>Les deux suggestions contextuelles de l’empty state ne sollicitent pas le modèle : une fonction déterministe inspecte les noms et types DuckDB du schéma déjà chargé. Cela rend leur apparition immédiate, reproductible et sans coût de tokens.</p>
        <p>Une politique dédiée demande un tableau Markdown pour les classements, distributions, comparaisons, listes de colonnes et exemples structurés, mais l’écarte pour une valeur unique ou une explication narrative. Elle limite les résultats à 10 lignes par défaut et 20 sur demande explicite ; les résultats plus longs sont orientés vers l’explorateur. Cette limite porte sur les lignes de données, pas sur le nombre de colonnes : toutes les colonnes nécessaires à la compréhension et à la vérification doivent être conservées.</p>
        <p>Les questions demandant simplement la liste des colonnes sont traitées sans appel au modèle : le serveur construit directement un tableau Markdown exhaustif depuis le schéma chargé et traduit les types DuckDB. Cette liste n’est plus tronquée à 20 colonnes. Le renderer stabilise les débuts de tableaux incomplets pendant le streaming, les enveloppe dans un conteneur horizontal, leur donne au minimum toute la largeur disponible et maintient un espacement lisible avec le paragraphe suivant.</p>
        <div class="grid gap-2">
          <article v-for="layer in promptLayers" :key="layer[0]" class="border border-[#e5e5e5] px-4 py-3">
            <h3 class="text-[13px] font-semibold text-[#161616]">{{ layer[0] }}</h3>
            <p class="mt-1 text-[13px] leading-6">{{ layer[1] }}</p>
            <code class="mt-2 inline-block text-[11px]">{{ layer[2] }}</code>
          </article>
        </div>
        <p>À chaque requête, ces couches sont assemblées avec le contexte actif : titre, producteur, références, ressource et schéma déjà chargé. Le périmètre est réévalué sur le dernier message à chaque tour. Une demande hors sujet reçoit un refus bref sans tool ; une demande pertinente mais non prise en charge reçoit une explication de la limite et une alternative disponible. Les contenus complets restent versionnés dans les fichiers indiqués plutôt que publiés automatiquement par une route publique.</p>
      </DocumentationSection>

      <DocumentationSection id="limits" eyebrow="État du prototype" title="Limites connues et travaux à poursuivre" description="Ces éléments doivent être pris en compte pendant une démonstration ou un test utilisateur.">
        <ul><li>La recherche dépend de la disponibilité de l’API publique data.gouv.fr et ne retourne que les jeux disposant d’une version Parquet.</li><li>La conversation et les résultats ne sont pas persistés.</li><li>La limite de cinq étapes peut être courte après plusieurs corrections SQL, même si elle est désormais identifiée explicitement dans l’interface.</li><li>Le libellé du modèle dans l’interface n’est pas encore dynamique.</li><li>Les catégories d’erreurs ne sont pas encore agrégées dans un tableau de suivi de production.</li><li>Il n’existe pas encore de protocole d’évaluation automatique des réponses.</li><li>L’assistant de publication reste une expérience autonome, sans intégration à cdata ou udata.</li></ul>
      </DocumentationSection>

      <footer class="border-t border-[#e5e5e5] py-8 text-[13px]">
        <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/">Tester l’assistant</NuxtLink>
      </footer>
      </div>
    </div>
  </main>
</template>
