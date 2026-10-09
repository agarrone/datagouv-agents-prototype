<script setup lang="ts">
const tools = [
  ["Métadonnées", "Consulte la fiche publique du jeu de données sur data.gouv.fr : titre, description, producteur, licence, dates et ressources disponibles. Cet outil répond aux questions sur le contexte de publication, sans analyser les valeurs du fichier."],
  ["Structure", "Inspecte la ressource chargée pour identifier ses colonnes, leurs types, le nombre de lignes et quelques valeurs d’exemple. L’assistant s’en sert pour comprendre les champs disponibles avant de préparer un calcul."],
  ["SQL", "Prépare puis exécute une requête en lecture seule avec DuckDB dans le navigateur. Le résultat indique les colonnes obtenues, le nombre de lignes, un aperçu des valeurs et les éventuelles limites appliquées."],
  ["Vue du tableau", "Propose d’utiliser une requête SQL réussie comme nouvelle vue de l’explorateur, par exemple pour filtrer une région ou trier des résultats. L’utilisateur voit la proposition et doit confirmer avant que le tableau change."],
  ["Graphique", "Transforme un résultat SQL vérifié en graphique à barres, courbe, aire, secteurs ou nuage de points. Le titre, la description, les axes, les séries et la source restent visibles et vérifiables."],
  ["Carte", "Construit une carte à partir de coordonnées, de géométries ou d’identifiants de régions et départements. L’outil signale les lignes qui ne peuvent pas être placées ou appariées."],
  ["Clarification", "Suspend la réponse lorsque plusieurs interprétations modifieraient réellement le résultat. Les choix possibles sont alors proposés sous forme de boutons afin que l’utilisateur décide avant la poursuite de l’analyse."],
];

const summaryLinks = [
  ["architecture", "Architecture générale"],
  ["circulation", "Données échangées"],
  ["tools", "Outils de l’assistant"],
  ["modeles", "Modèles IA"],
  ["securite", "Garde-fous"],
  ["limites", "Limites techniques"],
];

useSeoMeta({
  title: "Fonctionnement technique — Prototype data.gouv.fr",
  description: "Une présentation accessible de l’architecture, des traitements et des garde-fous de l’assistant.",
});
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <div class="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:py-14">
      <nav class="self-start lg:sticky lg:top-14" aria-label="Sommaire de la documentation technique">
        <NuxtLink class="text-[12px] font-medium text-[#000091] underline underline-offset-4 hover:text-[#1212ff]" to="/documentation">Retour à la documentation</NuxtLink>
        <p class="mt-8 text-[12px] font-medium text-[#555555]">Sommaire</p>
        <ol class="mt-3 space-y-2 text-[12px] leading-5">
          <li v-for="link in summaryLinks" :key="link[0]"><a class="hover:text-[#000091]" :href="`#${link[0]}`">{{ link[1] }}</a></li>
        </ol>
      </nav>

      <div class="min-w-0 max-w-[60rem]">
        <header class="pb-10">
          <p class="text-[13px] font-medium text-[#555555]">Documentation technique simplifiée</p>
          <h1 class="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">Comment fonctionne l’assistant ?</h1>
          <p class="mt-5 max-w-3xl text-[18px] leading-7 text-[#555555]">Le prototype associe un modèle de langage à des outils contrôlés par l’application. Le modèle choisit les opérations ; l’application exécute les calculs et affiche leurs résultats.</p>
        </header>

        <DocumentationSection id="architecture" title="Architecture générale">
          <div class="grid gap-px overflow-hidden border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-2">
            <div class="bg-white p-4"><h3 class="text-[13px] font-semibold">Dans le navigateur</h3><p class="mt-2 text-[13px] leading-6 text-[#555555]">Chargement du fichier, moteur DuckDB, requêtes SQL, tableau, graphiques et cartes.</p></div>
            <div class="bg-white p-4"><h3 class="text-[13px] font-semibold">Sur le serveur</h3><p class="mt-2 text-[13px] leading-6 text-[#555555]">Préparation du contexte, appel au modèle, accès aux métadonnées et enregistrement des feedbacks.</p></div>
          </div>
          <p>Le fichier complet n’est pas envoyé au modèle. L’assistant demande à l’application d’exécuter les opérations nécessaires, puis utilise les résultats obtenus pour répondre.</p>
        </DocumentationSection>

        <DocumentationSection id="circulation" title="Quelles données sont échangées ?">
          <p>Le modèle reçoit la question, l’historique de la conversation, le nom de la ressource, son schéma et les résultats utiles des outils. Ces résultats sont limités afin d’éviter l’envoi de volumes inutiles.</p>
          <p>La ressource publique reste traitée localement dans le navigateur. Les secrets nécessaires pour appeler Albert API restent côté serveur.</p>
          <p>Un feedback transmet la question, la réponse, l’évaluation et le contexte de la ressource. Le formulaire complémentaire est facultatif.</p>
        </DocumentationSection>

        <DocumentationSection id="tools" title="Quels outils peut utiliser l’assistant ?">
          <dl class="space-y-1">
            <div v-for="tool in tools" :key="tool[0]" class="grid gap-1 py-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-[13px] font-semibold text-[#161616]">{{ tool[0] }}</dt>
              <dd class="text-[13px] leading-6 text-[#555555]">{{ tool[1] }}</dd>
            </div>
          </dl>
          <p>Une requête doit réussir avant d’alimenter une vue, un graphique ou une carte. Chaque visualisation reste ainsi reliée à un résultat calculé et vérifiable.</p>
        </DocumentationSection>

        <DocumentationSection id="modeles" title="Quels modèles sont utilisés ?">
          <p>Les modèles sont accessibles par Albert API. GPT-OSS-120B est sélectionné par défaut et Mistral Medium 3.5 peut être choisi dans l’interface pour réaliser des comparaisons.</p>
          <p>Changer de modèle peut modifier la formulation, la vitesse, le choix des outils et la qualité des requêtes. Les calculs restent néanmoins exécutés par les mêmes outils contrôlés par l’application.</p>
        </DocumentationSection>

        <DocumentationSection id="securite" title="Quels garde-fous sont appliqués ?">
          <ul>
            <li>Les requêtes SQL sont limitées à la lecture.</li>
            <li>Le nombre d’étapes et d’opérations est borné pour éviter les boucles.</li>
            <li>Un changement de ressource invalide les résultats calculés précédemment.</li>
            <li>Les métadonnées et valeurs sont traitées comme des données, jamais comme des instructions.</li>
            <li>Les demandes trop nombreuses sont limitées par session et par empreinte IP quotidienne, sans conserver l’adresse IP brute.</li>
            <li>Deux réponses peuvent être produites simultanément par session et les compteurs expirent sous 48 heures.</li>
            <li>Les erreurs distinguent autant que possible le fournisseur IA, la connexion, le SQL, DuckDB et la visualisation.</li>
          </ul>
        </DocumentationSection>

        <DocumentationSection id="limites" title="Limites techniques actuelles">
          <ul>
            <li>Seules les ressources disposant d’une version Parquet compatible peuvent être explorées.</li>
            <li>Les conversations ne sont pas persistées.</li>
            <li>Les réponses des modèles restent variables et doivent être évaluées sur des cas réels.</li>
            <li>Le suivi agrégé des usages, des erreurs, des performances et des coûts reste à compléter.</li>
            <li>Ce prototype n’est pas encore intégré à cdata ou udata.</li>
          </ul>
        </DocumentationSection>

        <footer class="py-8 text-[13px]">
          <NuxtLink class="font-medium text-[#000091] underline underline-offset-4" to="/">Tester l’assistant</NuxtLink>
        </footer>
      </div>
    </div>
  </main>
</template>
