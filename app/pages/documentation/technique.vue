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
  { name: "propose_explorer_view", runs: "Navigateur + utilisateur", input: "Requête déjà vérifiée, titre et justification.", output: "Vue appliquée, colonnes, nombre de lignes et troncature.", implementation: "Affiche une confirmation. La vue ne remplace le tableau qu’après un clic utilisateur." },
  { name: "create_chart", runs: "Navigateur", input: "Type, titre, axe et jusqu’à quatre séries.", output: "Jusqu’à 1 000 lignes provenant du dernier SQL vérifié.", implementation: "Contrôle les champs demandés puis réalise le rendu avec ECharts." },
  { name: "create_map", runs: "Navigateur", input: "Spécification points, GeoJSON ou choroplèthe.", output: "Jusqu’à 5 000 lignes provenant du dernier SQL vérifié.", implementation: "Contrôle les champs puis réalise le rendu avec MapLibre et les contours administratifs nécessaires." },
];

const promptLayers = [
  ["Identité et preuves", "Définit le rôle de l’assistant, la table locale et l’interdiction de répondre sans résultat attesté.", "server/agents/prompts/identity.ts"],
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
        <p>La boucle est bornée par <code>isStepCount(5)</code>. Une réponse complexe doit donc partager ces cinq étapes entre inspections, corrections SQL, visualisation et réponse finale.</p>
      </DocumentationSection>

      <DocumentationSection id="model" eyebrow="Génération" title="Fournisseur et modèle" description="Le choix du fournisseur est réalisé côté serveur, sans exposer de clé au navigateur.">
        <dl class="grid gap-px overflow-hidden border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-2">
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Priorité 1</dt><dd class="mt-1 text-[13px]">Vercel AI Gateway avec clé explicite</dd></div>
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Priorité 2</dt><dd class="mt-1 text-[13px]">Endpoint OpenAI-compatible, dont Albert</dd></div>
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Priorité 3</dt><dd class="mt-1 text-[13px]">Jeton OIDC fourni par Vercel</dd></div>
          <div class="bg-white p-4"><dt class="text-[11px] uppercase text-[#555555]">Modèle Gateway par défaut</dt><dd class="mt-1 font-mono text-[13px]">openai/gpt-5.4-mini</dd></div>
        </dl>
        <p>Les variables historiques <code>ALBERT_API_URL</code>, <code>ALBERT_API_KEY</code> et <code>ALBERT_MODEL</code> sont reconnues pour faciliter les déploiements existants.</p>
        <p>La puce visible dans l’interface affiche encore <code>gpt-oss-120b</code> de manière statique. Elle devra être reliée à la configuration effective pour éviter une divergence entre interface et backend.</p>
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
        <p>Une requête doit avoir été exécutée avec succès avant de pouvoir être appliquée à l’explorateur ou utilisée comme source d’une visualisation.</p>
      </DocumentationSection>

      <DocumentationSection id="visualizations" eyebrow="Rendu" title="Graphiques et cartes" description="Les visualisations sont toujours construites à partir du dernier résultat SQL vérifié.">
        <p><strong>Graphiques :</strong> ECharts prend en charge barres, courbes, aires, secteurs et nuages de points, avec jusqu’à quatre séries et 1 000 lignes.</p>
        <p><strong>Cartes :</strong> MapLibre prend en charge des coordonnées, une géométrie GeoJSON ou une jointure par région ou département français, dans une limite de 5 000 lignes.</p>
        <p>Les champs demandés par la spécification sont comparés aux colonnes du résultat SQL. Une visualisation est refusée si un champ manque. Le loader conserve la taille du composant final et reste visible au moins 900 ms.</p>
      </DocumentationSection>

      <DocumentationSection id="feedback" eyebrow="Amélioration continue" title="Mécanisme de feedback" description="Chaque réponse peut recevoir une évaluation utile ou inutile.">
        <ol><li>L’utilisateur choisit un pouce sous une réponse.</li><li>La route serveur valide le contenu avec Zod et vérifie l’origine de la requête.</li><li>Le signal est envoyé à Grist avec la question, la réponse, la ressource, le jeu de données, le nom de la ressource, le modèle déclaré et la date.</li><li>L’interface indique le succès ou permet de réessayer en cas d’échec.</li></ol>
        <p>Le prototype n’envoie pas d’identité, mais le texte de la question et de la réponse fait partie du retour.</p>
      </DocumentationSection>

      <DocumentationSection id="prompts" eyebrow="Instructions" title="Organisation des prompts" description="Les instructions sont découpées par responsabilité afin de rester lisibles, testables et portables.">
        <div class="grid gap-2">
          <article v-for="layer in promptLayers" :key="layer[0]" class="border border-[#e5e5e5] px-4 py-3">
            <h3 class="text-[13px] font-semibold text-[#161616]">{{ layer[0] }}</h3>
            <p class="mt-1 text-[13px] leading-6">{{ layer[1] }}</p>
            <code class="mt-2 inline-block text-[11px]">{{ layer[2] }}</code>
          </article>
        </div>
        <p>À chaque requête, ces couches sont assemblées avec le contexte actif : titre, producteur, références, ressource et schéma déjà chargé. Les contenus complets restent versionnés dans les fichiers indiqués plutôt que publiés automatiquement par une route publique.</p>
      </DocumentationSection>

      <DocumentationSection id="limits" eyebrow="État du prototype" title="Limites connues et travaux à poursuivre" description="Ces éléments doivent être pris en compte pendant une démonstration ou un test utilisateur.">
        <ul><li>Le catalogue de ressources compatibles est encore défini dans le code.</li><li>La conversation et les résultats ne sont pas persistés.</li><li>La limite de cinq étapes peut être courte après plusieurs corrections SQL.</li><li>Le libellé du modèle dans l’interface n’est pas encore dynamique.</li><li>Les erreurs fournisseur restent volontairement simplifiées pour l’utilisateur.</li><li>Il n’existe pas encore de protocole d’évaluation automatique des réponses.</li><li>L’assistant de publication et les intégrations futures data.gouv.fr ne sont pas encore implémentés.</li></ul>
      </DocumentationSection>

      <footer class="border-t border-[#e5e5e5] py-8 text-[13px]">
        <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/">Tester l’assistant</NuxtLink>
      </footer>
      </div>
    </div>
  </main>
</template>
