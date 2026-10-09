<script setup lang="ts">
const tools = [
  ["Comprendre les données", "Décrire la ressource, ses colonnes et ses principales caractéristiques."],
  ["Interroger les données", "Calculer, filtrer, trier ou comparer les valeurs avec des requêtes en lecture seule."],
  ["Modifier la vue", "Proposer un filtre ou un tri du tableau, appliqué uniquement après votre confirmation."],
  ["Créer une visualisation", "Produire un graphique ou une carte lorsque cette représentation est adaptée."],
];

const summaryLinks = [
  ["pourquoi", "Pourquoi ce prototype ?"],
  ["utilisation", "Comment l’utiliser ?"],
  ["reponse", "Comment se construit une réponse ?"],
  ["possibilites", "Ce que l’assistant peut faire"],
  ["donnees", "Données et confidentialité"],
  ["limites", "Limites à connaître"],
];

useSeoMeta({
  title: "Comprendre l’assistant d’exploration — Prototype data.gouv.fr",
  description: "Utilisation, possibilités et limites du prototype d’assistant d’exploration de données.",
});
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <div class="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:py-14">
      <nav class="self-start lg:sticky lg:top-14" aria-label="Sommaire de la documentation">
        <NuxtLink class="text-[12px] font-medium text-[#000091] underline underline-offset-4 hover:text-[#1212ff]" to="/">Retour à l’accueil</NuxtLink>
        <p class="mt-8 text-[12px] font-medium text-[#555555]">Sommaire</p>
        <ol class="mt-3 space-y-2 text-[12px] leading-5">
          <li v-for="link in summaryLinks" :key="link[0]"><a class="hover:text-[#000091]" :href="`#${link[0]}`">{{ link[1] }}</a></li>
        </ol>
      </nav>

      <div class="min-w-0 max-w-[60rem]">
        <header class="pb-10">
          <p class="text-[13px] font-medium text-[#555555]">Documentation du prototype</p>
          <h1 class="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">Comprendre l’assistant d’exploration</h1>
          <p class="mt-5 text-[18px] leading-7 text-[#555555]">Ce prototype permet de poser des questions en langage naturel sur une ressource publiée sur data.gouv.fr, puis de vérifier les opérations réalisées sur les données.</p>
          <NuxtLink class="mt-6 inline-flex h-9 items-center border border-[#000091] px-3 text-[12px] font-medium text-[#000091] hover:bg-[#ececfe]" to="/documentation/technique">Comprendre son fonctionnement technique</NuxtLink>
        </header>

        <DocumentationSection id="pourquoi" title="Pourquoi ce prototype ?">
          <p>Un fichier tabulaire peut être difficile à comprendre sans connaître ses colonnes ou savoir écrire une requête. L’assistant aide à partir d’une question ordinaire pour explorer progressivement les données.</p>
          <p>Il s’agit d’une expérimentation autonome, et non d’une fonctionnalité officielle de data.gouv.fr. Le bandeau présent sur chaque page rappelle ce statut.</p>
        </DocumentationSection>

        <DocumentationSection id="utilisation" title="Comment l’utiliser ?">
          <ol>
            <li>Choisissez un exemple, recherchez un jeu de données ou collez l’URL de sa page data.gouv.fr.</li>
            <li>Sélectionnez une ressource compatible lorsqu’il en existe plusieurs.</li>
            <li>Consultez le tableau ou posez une question à l’assistant.</li>
            <li>Vérifiez le raisonnement résumé, les outils utilisés et les éventuelles limites signalées.</li>
          </ol>
          <p>Vous pouvez également utiliser la console SQL, télécharger une vue filtrée et afficher les graphiques ou cartes en plein écran.</p>
        </DocumentationSection>

        <DocumentationSection id="reponse" title="Comment se construit une réponse ?">
          <p>L’assistant reçoit le contexte de la ressource sélectionnée et sa structure. Il choisit ensuite l’opération nécessaire : consulter les métadonnées, inspecter les colonnes ou exécuter un calcul.</p>
          <p>Le suivi indique simplement les étapes en cours. Une fois la réponse terminée, « Raisonnement » résume ce qui a été compris et vérifié. « Outils utilisés » permet de consulter les requêtes et spécifications techniques.</p>
          <p>Si une demande est ambiguë, l’assistant peut proposer plusieurs choix avant de poursuivre. Une vue du tableau n’est jamais appliquée sans confirmation.</p>
        </DocumentationSection>

        <DocumentationSection id="possibilites" title="Ce que l’assistant peut faire">
          <ul>
            <li v-for="tool in tools" :key="tool[0]"><strong class="text-[#161616]">{{ tool[0] }} :</strong> {{ tool[1] }}</li>
          </ul>
          <p>GPT-OSS-120B est sélectionné par défaut. Mistral Medium 3.5 reste disponible dans le compositeur pour comparer les comportements. Les deux modèles sont accessibles par Albert API.</p>
        </DocumentationSection>

        <DocumentationSection id="donnees" title="Données et confidentialité">
          <p>La ressource Parquet est téléchargée et interrogée dans votre navigateur. Les requêtes sont limitées à la lecture et ne modifient jamais les données d’origine.</p>
          <p>Le modèle reçoit votre question, l’historique courant, la description de la ressource et les résultats nécessaires à la réponse. Les clés d’accès au fournisseur restent sur le serveur.</p>
          <p>Si vous évaluez une réponse, la question, la réponse et le contexte de la ressource sont transmis à l’équipe pour améliorer le prototype. N’y saisissez pas d’informations personnelles ou sensibles.</p>
        </DocumentationSection>

        <DocumentationSection id="limites" title="Limites à connaître">
          <ul>
            <li>Le modèle peut mal interpréter une colonne, une période ou une unité.</li>
            <li>Une requête techniquement correcte peut répondre imparfaitement à votre intention.</li>
            <li>La qualité des cartes dépend des coordonnées et identifiants géographiques disponibles.</li>
            <li>La conversation n’est pas conservée après le rechargement de la page.</li>
            <li>Les résultats importants doivent toujours être vérifiés avant réutilisation.</li>
          </ul>
        </DocumentationSection>

        <footer class="py-8 text-[13px]">
          <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/">Tester l’assistant</NuxtLink>
        </footer>
      </div>
    </div>
  </main>
</template>
