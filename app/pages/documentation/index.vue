<script setup lang="ts">
const tools = [
  ["Lire les métadonnées", "Consulte le titre, la description, le producteur, la licence et les ressources publiques du jeu de données sur data.gouv.fr."],
  ["Inspecter la structure", "Identifie les colonnes, leurs types, le nombre de lignes et un petit échantillon avant toute analyse."],
  ["Interroger les données", "Génère et exécute une requête SQL DuckDB en lecture seule sur la ressource sélectionnée."],
  ["Proposer une vue", "Prépare un filtre, un tri ou une transformation du tableau, puis attend votre confirmation avant de l’appliquer."],
  ["Créer un graphique", "Transforme un résultat SQL vérifié en graphique ECharts lorsque cette représentation est utile ou demandée."],
  ["Créer une carte", "Produit une carte de points, de géométries ou par territoires français avec MapLibre."],
];

const summaryLinks = [
  ["pourquoi", "Pourquoi cette expérimentation ?"],
  ["fonctionnement", "Comment fonctionne une réponse ?"],
  ["tools", "Les outils disponibles"],
  ["modele", "Le modèle utilisé"],
  ["donnees", "Données et confidentialité"],
  ["limites", "Limites à garder en tête"],
];

useSeoMeta({
  title: "Comprendre l’assistant d’exploration — Prototype data.gouv.fr",
  description: "Fonctionnement, outils et limites du prototype d’assistant d’exploration de données.",
});
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <div class="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:py-14">
      <nav class="self-start lg:sticky lg:top-6" aria-label="Sommaire de la documentation">
        <NuxtLink class="text-[12px] font-medium text-[#000091] underline underline-offset-4 hover:text-[#1212ff]" to="/">
          Retour à l’accueil
        </NuxtLink>
        <p class="mt-8 text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">Sommaire</p>
        <ol class="mt-3 space-y-2 text-[12px] leading-5">
          <li v-for="link in summaryLinks" :key="link[0]"><a class="hover:text-[#000091]" :href="`#${link[0]}`">{{ link[1] }}</a></li>
        </ol>
      </nav>

      <div class="min-w-0 max-w-[60rem]">

      <header class="border-b border-[#e5e5e5] pb-10">
        <p class="text-[13px] font-medium text-[#555555]">Documentation du prototype</p>
        <h1 class="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">Comprendre l’assistant d’exploration</h1>
        <p class="mt-5 text-[18px] leading-7 text-[#555555]">Cette expérimentation étudie comment une conversation en langage naturel peut aider à comprendre, interroger et représenter les données publiées sur data.gouv.fr.</p>
        <NuxtLink class="mt-6 inline-flex h-9 items-center border border-[#000091] px-3 text-[12px] font-medium text-[#000091] hover:bg-[#ececfe]" to="/documentation/technique">
          Consulter le fonctionnement technique détaillé
        </NuxtLink>
      </header>

      <DocumentationSection id="pourquoi" title="Pourquoi cette expérimentation ?">
        <p>Un fichier tabulaire peut être difficile à aborder : colonnes peu explicites, formats techniques ou besoin d’écrire une requête. L’assistant est placé à côté du tableau pour permettre de partir d’une question ordinaire et d’obtenir une réponse appuyée sur des opérations vérifiables.</p>
        <p>Le service reste un prototype autonome. Il prépare une éventuelle intégration future à data.gouv.fr, mais ne dépend pas aujourd’hui de son interface ni de son système de publication.</p>
      </DocumentationSection>

      <DocumentationSection id="fonctionnement" title="Comment fonctionne une réponse ?">
        <p>Depuis l’accueil, vous pouvez choisir un exemple, rechercher un jeu de données dans le catalogue data.gouv.fr ou coller l’URL de sa page. Le prototype ne propose que les ressources disposant d’une version Parquet compatible et permet de choisir la ressource lorsqu’il en existe plusieurs.</p>
        <p>Après la sélection, une fiche rappelle le titre, la description, le producteur, la licence et la date de mise à jour du jeu de données. L’explorateur apparaît ensuite dans une boîte distincte avec sa navigation de ressources, son tableau et le panneau assistant. Le bouton « Poser une question » reste actif tant que ce panneau est ouvert, y compris dans la console SQL ; le mode plein écran étend l’espace de travail à toute la fenêtre.</p>
        <p>Une fois la ressource chargée, trois questions générales sont complétées par deux suggestions calculées localement à partir de son schéma. Elles privilégient une dimension textuelle utile, puis une mesure numérique, une date ou une seconde dimension, en écartant les identifiants et champs techniques.</p>
        <p>Les résultats naturellement structurés — classements, comparaisons, distributions, listes de colonnes ou exemples — sont présentés sous forme de tableaux étendus à la largeur de la réponse. Ils conservent toutes les colonnes nécessaires à la compréhension et à la vérification du résultat, sans plafond arbitraire. Une demande sur le schéma affiche toutes les colonnes disponibles. Les types techniques DuckDB sont traduits en français et un espacement distingue clairement le tableau du texte qui le suit.</p>
        <ol>
          <li>L’assistant interprète la demande et repère les ambiguïtés éventuelles.</li>
          <li>Il choisit la preuve la plus légère : métadonnées, schéma ou requête SQL.</li>
          <li>Les opérations sur les données sont exécutées localement dans votre navigateur.</li>
          <li>Il rédige sa réponse uniquement à partir des résultats obtenus.</li>
          <li>Un graphique, une carte ou une vue du tableau peut ensuite être produit si cela répond à la demande.</li>
        </ol>
        <p>Un seul suivi accompagne toute la réponse : il commence par la planification puis évolue au même emplacement vers l’analyse, l’utilisation des outils, l’interprétation et la rédaction. Une fois la réponse terminée, « Raisonnement » rappelle précisément ce que l’assistant a compris, les champs retenus et les vérifications réalisées, en français et sans recopier la question. Il reste présent lorsque le contexte déjà chargé suffit et qu’aucun nouvel outil n’est nécessaire. Une section distincte « Outils utilisés » conserve, lorsqu’il y en a, les requêtes, spécifications et résultats techniques vérifiables, sans révéler la chaîne de pensée interne du modèle.</p>
        <p>Une erreur intermédiaire n’est pas présentée comme définitive tant que l’assistant peut encore corriger son travail. Si la réponse s’arrête, le message distingue une erreur de connexion, de fournisseur IA, de requête SQL, de lecture DuckDB ou de visualisation. Il propose alors de réessayer, recharger la ressource ou préciser la demande ; le détail technique reste disponible dans une section repliable.</p>
      </DocumentationSection>

      <DocumentationSection id="tools" title="Les outils disponibles">
        <ul>
          <li v-for="tool in tools" :key="tool[0]"><strong class="text-[#161616]">{{ tool[0] }} :</strong> {{ tool[1] }}</li>
        </ul>
      </DocumentationSection>

      <DocumentationSection id="modele" title="Le modèle utilisé">
        <p>Le prototype utilise actuellement <strong>GPT-OSS-120B</strong>. Ce modèle est mis à disposition par <strong>Albert API</strong>, qui est le fournisseur d’accès aux modèles et non un modèle. La clé Albert n’est jamais exposée au navigateur.</p>
        <p>Le modèle ne reçoit pas spontanément l’intégralité du fichier. Il reçoit le contexte de la ressource, puis demande à l’application d’exécuter les outils nécessaires.</p>
      </DocumentationSection>

      <DocumentationSection id="donnees" title="Données et confidentialité">
        <p>Les ressources proposées sont publiques. Leur version Parquet est téléchargée et interrogée dans le navigateur avec DuckDB-WASM. Les requêtes sont limitées à la lecture et ne modifient jamais la ressource d’origine.</p>
        <p>Lorsque vous évaluez une réponse, la question, la réponse et le contexte du jeu de données sont envoyés à une table Grist afin d’améliorer le prototype. Vous pouvez ensuite ajouter un commentaire dans un formulaire prérempli. Une invitation facultative est également présentée après six questions. Aucune identité n’est demandée. Évitez néanmoins de saisir des informations personnelles ou sensibles.</p>
      </DocumentationSection>

      <DocumentationSection id="limites" title="Limites à garder en tête">
        <ul>
          <li>Le modèle peut mal interpréter une colonne, une période ou une unité.</li>
          <li>Une requête correcte peut néanmoins répondre imparfaitement à l’intention initiale.</li>
          <li>Les résultats bornés peuvent masquer des lignes supplémentaires ou des ex æquo.</li>
          <li>Les cartes en français utilisent les fonds vectoriels de data.gouv.fr : OSM Bright par défaut et Positron pour les choroplèthes. Elles dépendent de la qualité des coordonnées et des identifiants géographiques.</li>
          <li>La conversation n’est pas conservée après le rechargement de la page.</li>
          <li>Les résultats importants doivent être vérifiés avant toute réutilisation.</li>
        </ul>
      </DocumentationSection>

      <footer class="border-t border-[#e5e5e5] py-8 text-[13px]">
        <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/">Tester l’assistant</NuxtLink>
      </footer>
      </div>
    </div>
  </main>
</template>
