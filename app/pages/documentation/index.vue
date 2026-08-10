<script setup lang="ts">
const tools = [
  ["Lire les métadonnées", "Consulte le titre, la description, le producteur, la licence et les ressources publiques du jeu de données sur data.gouv.fr."],
  ["Inspecter la structure", "Identifie les colonnes, leurs types, le nombre de lignes et un petit échantillon avant toute analyse."],
  ["Interroger les données", "Génère et exécute une requête SQL DuckDB en lecture seule sur la ressource sélectionnée."],
  ["Proposer une vue", "Prépare un filtre, un tri ou une transformation du tableau, puis attend votre confirmation avant de l’appliquer."],
  ["Créer un graphique", "Transforme un résultat SQL vérifié en graphique ECharts lorsque cette représentation est utile ou demandée."],
  ["Créer une carte", "Produit une carte de points, de géométries ou par territoires français avec MapLibre."],
];

useSeoMeta({
  title: "Comprendre l’assistant d’exploration — Prototype data.gouv.fr",
  description: "Fonctionnement, outils et limites du prototype d’assistant d’exploration de données.",
});
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <div class="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 lg:py-12">
      <NuxtLink class="text-[13px] font-medium text-[#000091] underline underline-offset-4 hover:text-[#1212ff]" to="/">
        Retour au choix du jeu de données
      </NuxtLink>

      <header class="mt-10 border-b border-[#ddd] pb-10">
        <p class="text-[13px] font-medium text-[#666]">Documentation du prototype</p>
        <h1 class="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">Comprendre l’assistant d’exploration</h1>
        <p class="mt-5 text-[17px] leading-7 text-[#3a3a3a]">Cette expérimentation étudie comment une conversation en langage naturel peut aider à comprendre, interroger et représenter les données publiées sur data.gouv.fr.</p>
        <NuxtLink class="mt-6 inline-flex h-9 items-center border border-[#000091] px-3 text-[12px] font-medium text-[#000091] hover:bg-[#ececfe]" to="/documentation/technique">
          Consulter le fonctionnement technique détaillé
        </NuxtLink>
      </header>

      <DocumentationSection title="Pourquoi cette expérimentation ?">
        <p>Un fichier tabulaire peut être difficile à aborder : colonnes peu explicites, formats techniques ou besoin d’écrire une requête. L’assistant est placé à côté du tableau pour permettre de partir d’une question ordinaire et d’obtenir une réponse appuyée sur des opérations vérifiables.</p>
        <p>Le service reste un prototype autonome. Il prépare une éventuelle intégration future à data.gouv.fr, mais ne dépend pas aujourd’hui de son interface ni de son système de publication.</p>
      </DocumentationSection>

      <DocumentationSection title="Comment fonctionne une réponse ?">
        <ol>
          <li>L’assistant interprète la demande et repère les ambiguïtés éventuelles.</li>
          <li>Il choisit la preuve la plus légère : métadonnées, schéma ou requête SQL.</li>
          <li>Les opérations sur les données sont exécutées localement dans votre navigateur.</li>
          <li>Il rédige sa réponse uniquement à partir des résultats obtenus.</li>
          <li>Un graphique, une carte ou une vue du tableau peut ensuite être produit si cela répond à la demande.</li>
        </ol>
        <p>La section « Analyse terminée » décrit les opérations observables. Elle ne révèle pas une chaîne de pensée interne du modèle.</p>
      </DocumentationSection>

      <DocumentationSection title="Les outils disponibles">
        <ul>
          <li v-for="tool in tools" :key="tool[0]"><strong class="text-[#161616]">{{ tool[0] }} :</strong> {{ tool[1] }}</li>
        </ul>
      </DocumentationSection>

      <DocumentationSection title="Le modèle utilisé">
        <p>Le prototype peut fonctionner avec Vercel AI Gateway ou avec un service compatible avec l’API OpenAI, notamment Albert. Le fournisseur et le modèle sont configurés côté serveur et peuvent évoluer sans modifier l’interface.</p>
        <p>Le modèle ne reçoit pas spontanément l’intégralité du fichier. Il reçoit le contexte de la ressource, puis demande à l’application d’exécuter les outils nécessaires.</p>
      </DocumentationSection>

      <DocumentationSection title="Données et confidentialité">
        <p>Les ressources proposées sont publiques. Leur version Parquet est téléchargée et interrogée dans le navigateur avec DuckDB-WASM. Les requêtes sont limitées à la lecture et ne modifient jamais la ressource d’origine.</p>
        <p>Lorsque vous évaluez une réponse, la question, la réponse et le contexte du jeu de données sont envoyés à une table Grist afin d’améliorer le prototype. Aucune identité n’est demandée. Évitez néanmoins de saisir des informations personnelles ou sensibles.</p>
      </DocumentationSection>

      <DocumentationSection title="Limites à garder en tête">
        <ul>
          <li>Le modèle peut mal interpréter une colonne, une période ou une unité.</li>
          <li>Une requête correcte peut néanmoins répondre imparfaitement à l’intention initiale.</li>
          <li>Les résultats bornés peuvent masquer des lignes supplémentaires ou des ex æquo.</li>
          <li>Les cartes dépendent de la qualité des coordonnées et des identifiants géographiques.</li>
          <li>La conversation n’est pas conservée après le rechargement de la page.</li>
          <li>Les résultats importants doivent être vérifiés avant toute réutilisation.</li>
        </ul>
      </DocumentationSection>

      <footer class="border-t border-[#ddd] py-8 text-[13px]">
        <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/">Tester l’assistant</NuxtLink>
      </footer>
    </div>
  </main>
</template>
