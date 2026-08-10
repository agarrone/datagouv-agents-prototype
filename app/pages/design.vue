<script setup lang="ts">
import AgentChart from "../components/exploration/AgentChart.client.vue";
import AgentMap from "../components/exploration/AgentMap.client.vue";
import type { LanguageModelUsage } from "ai";
import type {
  ChartSpec,
  DatasetRow,
  MapSpec,
} from "~~/shared/types/exploration";
import { explorationResources } from "~~/shared/data/exploration-resources";

useSeoMeta({
  title: "Design system · Agents data.gouv.fr",
  description: "Inventaire des composants visuels du prototype des agents data.gouv.fr.",
});

const composerValue = ref("");
const editingComposerValue = ref("Quels sont les jeux de données les plus consultés ?");
const designSqlMode = ref<"assistant" | "sql">("sql");
const selectedResource = ref(explorationResources[0] ?? null);
const visualizationDemo = ref(0);
const designUsage = {
  inputTokens: 2840,
  outputTokens: 612,
  totalTokens: 3452,
} as LanguageModelUsage;
const chartRows: DatasetRow[] = [
  { label: "Transport", value: 128, secondary: 82 },
  { label: "Environnement", value: 104, secondary: 68 },
  { label: "Économie", value: 88, secondary: 61 },
  { label: "Santé", value: 72, secondary: 49 },
  { label: "Culture", value: 54, secondary: 38 },
];

const chartSpecs: ChartSpec[] = [
  {
    type: "bar",
    title: "Jeux de données par thématique",
    description: "Répartition des ressources les plus consultées.",
    xField: "label",
    xLabel: "Thématique",
    series: [{ field: "value", label: "Jeux de données" }],
  },
  {
    type: "line",
    title: "Évolution des consultations",
    description: "Comparaison de deux séries sur la période.",
    xField: "label",
    xLabel: "Thématique",
    series: [
      { field: "value", label: "Cette année" },
      { field: "secondary", label: "Année précédente" },
    ],
  },
  {
    type: "area",
    title: "Volume cumulé de consultations",
    description: "Une série temporelle mise en valeur par une aire.",
    xField: "label",
    xLabel: "Thématique",
    series: [{ field: "value", label: "Consultations" }],
  },
  {
    type: "pie",
    title: "Part des consultations",
    description: "Poids relatif de chaque thématique.",
    xField: "label",
    xLabel: "Thématique",
    series: [{ field: "value", label: "Consultations" }],
  },
  {
    type: "scatter",
    title: "Consultations et téléchargements",
    description: "Relation entre deux indicateurs numériques.",
    xField: "value",
    xLabel: "Consultations",
    series: [{ field: "secondary", label: "Téléchargements" }],
  },
];

const mapSpec: MapSpec = {
  type: "points",
  title: "Festivals en Île-de-France",
  description: "Quelques lieux fictifs pour auditer le rendu cartographique.",
  latitudeField: "latitude",
  longitudeField: "longitude",
  labelField: "nom",
  valueField: "frequentation",
  valueLabel: "Fréquentation",
};

const mapRows: DatasetRow[] = [
  { nom: "Paris", latitude: 48.8566, longitude: 2.3522, frequentation: 92_000 },
  { nom: "Saint-Denis", latitude: 48.9362, longitude: 2.3574, frequentation: 48_000 },
  { nom: "Versailles", latitude: 48.8014, longitude: 2.1301, frequentation: 34_000 },
  { nom: "Créteil", latitude: 48.7904, longitude: 2.4556, frequentation: 21_000 },
];

const regionMapSpec: MapSpec = {
  type: "choropleth",
  title: "Consultations par région",
  description: "Une choroplèthe régionale avec une échelle quantitative continue.",
  boundary: "france-regions",
  dataKey: "code",
  valueField: "consultations",
  labelField: "region",
  valueLabel: "Consultations",
};

const regionMapRows: DatasetRow[] = [
  { code: "11", region: "Île-de-France", consultations: 184_200 },
  { code: "84", region: "Auvergne-Rhône-Alpes", consultations: 112_400 },
  { code: "93", region: "Provence-Alpes-Côte d’Azur", consultations: 96_800 },
  { code: "75", region: "Nouvelle-Aquitaine", consultations: 82_100 },
  { code: "76", region: "Occitanie", consultations: 77_600 },
  { code: "32", region: "Hauts-de-France", consultations: 69_300 },
  { code: "44", region: "Grand Est", consultations: 61_900 },
  { code: "52", region: "Pays de la Loire", consultations: 58_700 },
  { code: "53", region: "Bretagne", consultations: 54_200 },
  { code: "27", region: "Bourgogne-Franche-Comté", consultations: 42_800 },
  { code: "28", region: "Normandie", consultations: 39_600 },
  { code: "24", region: "Centre-Val de Loire", consultations: 34_900 },
  { code: "94", region: "Corse", consultations: 12_300 },
];

const departmentMapSpec: MapSpec = {
  type: "choropleth",
  title: "Ressources par département",
  description: "Une choroplèthe départementale permettant d’auditer les petits territoires.",
  boundary: "france-departments",
  dataKey: "code",
  valueField: "ressources",
  labelField: "departement",
  valueLabel: "Ressources",
};

const departmentMapRows: DatasetRow[] = [
  { code: "75", departement: "Paris", ressources: 920 },
  { code: "13", departement: "Bouches-du-Rhône", ressources: 610 },
  { code: "69", departement: "Rhône", ressources: 540 },
  { code: "33", departement: "Gironde", ressources: 430 },
  { code: "31", departement: "Haute-Garonne", ressources: 390 },
  { code: "59", departement: "Nord", ressources: 370 },
  { code: "44", departement: "Loire-Atlantique", ressources: 310 },
  { code: "34", departement: "Hérault", ressources: 280 },
];

const tableColumns = ["title", "organization", "metric.views"];
const tableRows: DatasetRow[] = [
  { title: "Catalogue des données", organization: "data.gouv.fr", "metric.views": 182_430 },
  { title: "Répertoire national des élus", organization: "Ministère de l’Intérieur", "metric.views": 96_240 },
  { title: "Liste des festivals en France", organization: "Ministère de la Culture", "metric.views": 74_810 },
];
const schemaColumns = [
  { name: "title", type: "VARCHAR" },
  { name: "organization", type: "VARCHAR" },
  { name: "metric.views", type: "BIGINT" },
];

const typographySamples = [
  { size: "11 px", role: "Micro-information et métadonnée", class: "text-[11px]" },
  { size: "12 px", role: "Libellé d’interface", class: "text-[12px]" },
  { size: "13 px", role: "Corps de l’assistant", class: "text-[13px]" },
  { size: "15 px", role: "Introduction de composant", class: "text-[15px]" },
  { size: "18 px", role: "Chapô et sous-section", class: "text-[18px]" },
  { size: "24 px", role: "Titre de section", class: "text-2xl" },
];

const fontUsageRows = [
  {
    size: "11 px",
    role: "Micro-information et métadonnée",
    usages: "Heure, format, résumé et détail des tools, sources des visualisations, tokens, actions compactes et en-têtes de code.",
    scope: "Agent",
  },
  {
    size: "12 px",
    role: "Contrôle et libellé d’interface",
    usages: "Chips de suggestion et de ressource, accordéon de contexte, textarea, onglets, statuts, console et tableau SQL, légendes cartographiques.",
    scope: "Agent",
  },
  {
    size: "13 px",
    role: "Corps de l’assistant",
    usages: "Questions et réponses, question de clarification, titres de cartes de résultat, propositions de vue et texte principal des panneaux.",
    scope: "Agent",
  },
  {
    size: "14 px",
    role: "Texte secondaire de page",
    usages: "Avertissement de la page d’accueil, contenu courant utilisant text-sm et étapes mises en évidence dans la documentation.",
    scope: "Éditorial",
  },
  {
    size: "15 px",
    role: "Introduction de composant",
    usages: "Titre de l’empty state et titre d’introduction de la console SQL.",
    scope: "Agent",
  },
  {
    size: "18 px",
    role: "Chapô et sous-section",
    usages: "Introduction de l’accueil et de la documentation, titres « Fonds de carte » et « Cartes choroplèthes ».",
    scope: "Éditorial",
  },
  {
    size: "24 px",
    role: "Titre de section",
    usages: "Titres de sections de la documentation, de la page Design et des sélecteurs de ressources.",
    scope: "Éditorial",
  },
  {
    size: "30–48 px",
    role: "Titre de page responsive",
    usages: "Accueil, documentation et page Design : 30 ou 36 px sur petit écran, puis 42, 44 ou 48 px selon le contexte.",
    scope: "Éditorial",
  },
];

const designDecisions = [
  {
    group: "Fondations",
    title: "Typographie",
    detail: "Marianne pour l’interface, le contenu et les visualisations ; Geist Mono pour le code, SQL et les valeurs techniques.",
    rule: "Agent : 11, 12, 13 et 15 px · Éditorial : 14, 18, 24 et 30–48 px",
  },
  {
    group: "Fondations",
    title: "Pages éditoriales",
    detail: "Accueil, documentation et documentation technique partagent le même conteneur et le même rythme extérieur. Les documentations utilisent un sommaire latéral sticky.",
    rule: "Max 90 rem · Grille documentaire 12 rem + contenu · Padding 16/24 px et 40/56 px",
  },
  {
    group: "Fondations",
    title: "Couleurs neutres",
    detail: "Cinq neutres fonctionnels remplacent les gris intermédiaires et rendent chaque niveau mémorisable.",
    rule: "#161616 · #555555 · #777777 · #E5E5E5 · #F6F6F6",
  },
  {
    group: "Fondations",
    title: "Couleurs sémantiques",
    detail: "Information, succès, avertissement et erreur utilisent un fond teinté, une bordure colorée et une couleur de texte dédiée pour rester immédiatement identifiables.",
    rule: "Succès #E3FDEB / #B8FEC9 / #18753C · Erreur #FEF4F4 / #FFBDBD / #CE0500",
  },
  {
    group: "Composants",
    title: "Surfaces et rayons",
    detail: "Les surfaces ordinaires utilisent 6 px. Le code, l’éditeur et les résultats SQL conservent 2 px.",
    rule: "Stroke unique #E5E5E5 · Chips inchangées",
  },
  {
    group: "Composants",
    title: "Iconographie",
    detail: "Remix Icon Line uniquement, sans variante fill ni surface décorative autour des pictogrammes.",
    rule: "14 px compact · 16 px standard · 20 px repère majeur",
  },
  {
    group: "Assistant",
    title: "Espace conversationnel",
    detail: "Le dégradé bleu très léger distingue uniquement le panneau assistant ; les cartes et le compositeur restent blancs.",
    rule: "#EBEDFF à 30 % en haut vers 1 % en bas",
  },
  {
    group: "Assistant",
    title: "Chips et contexte",
    detail: "Suggestions, clarifications, modèle et ressource conservent leur forme compacte et leur géométrie pill historique.",
    rule: "Exception explicite aux rayons standards",
  },
  {
    group: "Assistant",
    title: "Conversation",
    detail: "La question utilise une surface grise compacte ; la réponse reste sans bulle. Copie et feedback sont placés sous la réponse, édition et copie au survol de la question.",
    rule: "Clarifications proposées sous forme de chips quand elles sont pertinentes",
  },
  {
    group: "Assistant",
    title: "Compositeur",
    detail: "La ressource utilisée est rappelée dans un accordéon compact intégré au-dessus du champ. Le modèle et sa consommation restent consultables par tooltip.",
    rule: "Le message d’avertissement reste hors de la surface du compositeur",
  },
  {
    group: "Assistant",
    title: "Tools et raisonnement",
    detail: "Chaque tool est une carte dépliable avec une clé à molette. SQL et spécifications utilisent le même composant de code avec coloration syntaxique.",
    rule: "Masquer les essais SQL en échec lorsqu’une exécution suivante réussit",
  },
  {
    group: "Mouvement",
    title: "Animations",
    detail: "Transitions courtes et fonctionnelles, spinner DNA pendant la réflexion et remplacement dimensionnellement stable des visualisations.",
    rule: "Respect systématique de prefers-reduced-motion",
  },
  {
    group: "Données",
    title: "Graphiques et cartes",
    detail: "Marianne dans les graphiques, boîtes avec header et footer, source complète et actions de copie ou plein écran.",
    rule: "Graphiques : padding 20 px · Cartes : fond OpenMapTiles sans padding interne",
  },
];

const designRisks = [
  {
    level: "Moyen",
    title: "Deux sélecteurs de ressource",
    detail: "Le sélecteur de la home et celui de l’explorateur suivent des géométries et des densités différentes pour la même action métier.",
  },
  {
    level: "Moyen",
    title: "États interactifs incomplets",
    detail: "Les états hover sont visibles ici, mais focus, chargement, erreur, désactivation et succès ne sont pas encore systématiquement définis pour chaque action.",
  },
  {
    level: "Moyen",
    title: "Palette de visualisation non tokenisée",
    detail: "Les graphiques, cartes, survols et sélections utilisent encore des couleurs métier et plusieurs nuances de bleu définies directement dans les composants.",
  },
  {
    level: "Moyen",
    title: "Expérience mobile différée",
    detail: "La densité et les dimensions actuelles ciblent d’abord le panneau desktop. Une composition mobile dédiée reste à définir et à documenter.",
  },
  {
    level: "Faible",
    title: "Chips hors palette principale",
    detail: "Les chips de ressource conservent volontairement leurs bleus historiques et leur rayon propre. Cette exception devra devenir un token si le motif se généralise.",
  },
];
</script>

<template>
  <main class="min-h-screen bg-[#f6f6f6] text-[#161616]">
    <header class="border-b border-[#e5e5e5] bg-white px-5 py-8 md:px-10">
      <div class="mx-auto max-w-[90rem]">
        <NuxtLink class="inline-flex items-center gap-1 text-xs text-[#000091] underline" to="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-base leading-none" />
          Retour au prototype
        </NuxtLink>
        <p class="mt-8 text-xs font-medium uppercase tracking-[0.08em] text-[#000091]">Référence visuelle</p>
        <h1 class="mt-2 text-balance text-3xl font-bold md:text-5xl">Composants des agents</h1>
        <p class="mt-4 max-w-2xl text-pretty text-sm leading-6 text-[#555555]">
          Inventaire vivant des composants utilisés dans l’explorateur. Cette page permet
          de comparer leur hiérarchie, leurs états et leur cohérence.
        </p>
      </div>
    </header>

    <div class="mx-auto grid max-w-[90rem] gap-12 px-5 py-10 md:px-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav class="self-start lg:sticky lg:top-6" aria-label="Sections de la page">
        <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">Sommaire</p>
        <ul class="mt-3 space-y-2 text-xs">
          <li><a class="hover:text-[#000091]" href="#fondations">Fondations</a></li>
          <li><a class="hover:text-[#000091]" href="#couleurs">Couleurs</a></li>
          <li><a class="hover:text-[#000091]" href="#surfaces">Surfaces et rayons</a></li>
          <li><a class="hover:text-[#000091]" href="#iconographie">Iconographie</a></li>
          <li><a class="hover:text-[#000091]" href="#actions">Actions</a></li>
          <li><a class="hover:text-[#000091]" href="#etats">États et feedback</a></li>
          <li><a class="hover:text-[#000091]" href="#mouvement">Mouvement</a></li>
          <li><a class="hover:text-[#000091]" href="#conversation">Conversation</a></li>
          <li><a class="hover:text-[#000091]" href="#tools">Tools</a></li>
          <li><a class="hover:text-[#000091]" href="#saisie">Saisie et contexte</a></li>
          <li><a class="hover:text-[#000091]" href="#sql">SQL et code</a></li>
          <li><a class="hover:text-[#000091]" href="#explorateur">Explorateur</a></li>
          <li><a class="hover:text-[#000091]" href="#visualisations">Visualisations</a></li>
          <li><a class="hover:text-[#000091]" href="#contenu">Contenu long</a></li>
          <li><a class="font-medium text-[#000091]" href="#decisions">Décisions</a></li>
          <li><a class="font-medium text-[#ce0500] hover:text-[#000091]" href="#audit">Points de vigilance</a></li>
        </ul>
      </nav>

      <div class="min-w-0 space-y-16">
        <section id="fondations">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">01</p>
            <h2 class="mt-1 text-2xl font-bold">Fondations</h2>
          </header>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="color in [
                ['Bleu France', '#000091'],
                ['Fond assistant', '#EBEDFF'],
                ['Succès', '#18753C'],
                ['Erreur', '#CE0500'],
              ]"
              :key="color[1]"
              class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white"
            >
              <div class="h-20" :style="{ backgroundColor: color[1] }" />
              <div class="p-3 text-xs"><strong>{{ color[0] }}</strong><code class="mt-1 block text-[#555555]">{{ color[1] }}</code></div>
            </div>
          </div>
          <div class="mt-4 rounded-md border border-[#e5e5e5] bg-white p-5">
            <p class="text-3xl font-bold">Marianne</p>
            <p class="mt-2 text-sm text-[#555555]">Police principale pour le produit et les visualisations.</p>
            <div class="mt-5 border-t border-[#f6f6f6] pt-5">
              <p class="font-mono text-2xl font-semibold">Geist Mono</p>
              <p class="mt-2 text-sm text-[#555555]">Police du code, des requêtes SQL et des valeurs techniques monospace.</p>
              <code class="mt-4 block font-mono text-sm">SELECT * FROM data LIMIT 10</code>
            </div>
          </div>
          <div class="mt-4 overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div
              v-for="sample in typographySamples"
              :key="sample.size"
              class="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-4 border-b border-[#f6f6f6] px-4 py-3 last:border-b-0"
            >
              <code class="text-[11px] text-[#555555]">{{ sample.size }}</code>
              <p :class="sample.class"><strong class="font-medium">{{ sample.role }}</strong> · Portez ce vieux whisky au juge blond qui fume.</p>
            </div>
          </div>
          <div class="mt-4 overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div class="border-b border-[#e5e5e5] px-4 py-3">
              <h3 class="text-[13px] font-semibold">Usages des tailles de fonte</h3>
              <p class="mt-1 max-w-3xl text-[11px] leading-5 text-[#555555]">
                Inventaire de référence pour suivre la hiérarchie réelle. Les tailles d’icônes sont exclues, sauf lorsque leur classe peut être confondue avec un niveau typographique.
              </p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[48rem] border-collapse text-left">
                <thead class="bg-[#f6f6f6] text-[11px] uppercase tracking-[0.05em] text-[#555555]">
                  <tr>
                    <th class="w-24 border-b border-[#e5e5e5] px-4 py-2 font-medium">Taille</th>
                    <th class="w-52 border-b border-[#e5e5e5] px-4 py-2 font-medium">Rôle</th>
                    <th class="border-b border-[#e5e5e5] px-4 py-2 font-medium">Usages actuels</th>
                    <th class="w-28 border-b border-[#e5e5e5] px-4 py-2 font-medium">Périmètre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in fontUsageRows" :key="row.size" class="align-top text-[11px] leading-5">
                    <td class="border-b border-[#f6f6f6] px-4 py-3 font-mono font-medium text-[#000091]">{{ row.size }}</td>
                    <td class="border-b border-[#f6f6f6] px-4 py-3 font-medium text-[#161616]">{{ row.role }}</td>
                    <td class="border-b border-[#f6f6f6] px-4 py-3 text-[#555555]">{{ row.usages }}</td>
                    <td class="border-b border-[#f6f6f6] px-4 py-3 text-[#555555]">{{ row.scope }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="couleurs">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Décision de design</p>
            <h2 class="mt-1 text-2xl font-bold">Système de couleurs</h2>
            <p class="mt-2 max-w-3xl text-pretty text-sm leading-6 text-[#555555]">
              La palette est réduite à cinq neutres fonctionnels. Les états d’information, de succès, d’avertissement et d’erreur disposent en complément de fonds et de bordures colorés.
            </p>
          </header>

          <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div class="border-b border-[#e5e5e5] px-4 py-3">
              <h3 class="text-[13px] font-semibold">Palette fonctionnelle recommandée</h3>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">Chaque couleur possède un rôle précis ; aucune teinte supplémentaire ne devrait être introduite sans nouveau besoin sémantique.</p>
            </div>
            <div class="grid grid-cols-2 gap-px bg-[#e5e5e5] sm:grid-cols-4 xl:grid-cols-8">
              <div
                v-for="color in [
                  ['Texte', '#161616'],
                  ['Secondaire', '#555555'],
                  ['Discret', '#777777'],
                  ['Stroke', '#E5E5E5'],
                  ['Surface', '#F6F6F6'],
                  ['Action', '#000091'],
                  ['Succès', '#18753C'],
                  ['Erreur', '#CE0500'],
                ]"
                :key="color[1]"
                class="bg-white p-3"
              >
                <div class="h-12 rounded-md border border-[#e5e5e5]" :style="{ backgroundColor: color[1] }" />
                <strong class="mt-2 block text-[11px] font-medium">{{ color[0] }}</strong>
                <code class="mt-0.5 block text-[11px] text-[#555555]">{{ color[1] }}</code>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-px overflow-hidden rounded-md border border-[#e5e5e5] bg-[#e5e5e5] xl:grid-cols-3">
            <div class="bg-white p-4">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Neutres</p>
              <p class="mt-2 text-[13px] font-semibold">5 rôles fonctionnels</p>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">Texte principal, secondaire, discret, stroke et surface. Les gris intermédiaires sont supprimés.</p>
            </div>
            <div class="bg-white p-4">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">États</p>
              <p class="mt-2 text-[13px] font-semibold">États colorés</p>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">La couleur porte le fond, la bordure, l’icône et le texte afin de renforcer la lisibilité des alertes et des feedbacks.</p>
            </div>
            <div class="bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Assistant</p>
              <p class="mt-2 text-[13px] font-semibold">Dégradé localisé</p>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">Le dégradé distingue le panneau assistant. Les cartes et le compositeur conservent une surface blanche.</p>
            </div>
          </div>
        </section>

        <section id="surfaces">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#a55800]">Décision de design</p>
            <h2 class="mt-1 text-2xl font-bold">Surfaces et rayons</h2>
            <p class="mt-2 max-w-3xl text-pretty text-sm leading-6 text-[#555555]">
              Une règle unique réduit les variations accidentelles tout en conservant une hiérarchie claire entre les cartes et leur contenu technique.
            </p>
          </header>

          <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div class="grid gap-px bg-[#e5e5e5] sm:grid-cols-3">
              <div class="bg-white p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Surface standard</p>
                <div class="mt-3 rounded-md border border-[#e5e5e5] bg-white p-3">
                  <p class="text-[13px] font-semibold">Rayon 6 px</p>
                  <p class="mt-1 text-[11px] leading-5 text-[#555555]">Cartes, tools, messages, champs, menus et panneaux.</p>
                </div>
              </div>
              <div class="bg-[#f6f6f6] p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Surface technique</p>
                <pre class="mt-3 overflow-hidden rounded-[2px] border border-[#e5e5e5] bg-white p-3 text-[11px]"><code>SELECT * FROM data;</code></pre>
                <p class="mt-2 text-[11px] leading-5 text-[#555555]">Code, éditeur et résultat SQL conservent un rayon de 2 px.</p>
              </div>
              <div class="bg-white p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Chips inchangées</p>
                <div class="mt-3 inline-flex min-h-7 items-center rounded-full border border-[#e5e5e5] px-2.5 text-[12px]">Suggestion</div>
                <p class="mt-2 text-[11px] leading-5 text-[#555555]">Les suggestions, ressources et modèles gardent leur géométrie propre.</p>
              </div>
            </div>
            <p class="border-t border-[#e5e5e5] px-4 py-3 text-[11px] leading-5 text-[#555555]">
              Stroke neutre unique : <code class="rounded-[2px] bg-[#f6f6f6] px-1 py-0.5">#E5E5E5</code>. Les couleurs sémantiques, les états actifs et la séparation structurelle du panneau restent des exceptions intentionnelles.
            </p>
          </div>
        </section>

        <section id="iconographie">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Décision de design</p>
            <h2 class="mt-1 text-2xl font-bold">Iconographie et tailles</h2>
            <p class="mt-2 max-w-3xl text-pretty text-sm leading-6 text-[#555555]">
              Une seule famille, un seul style et trois tailles suffisent à couvrir les besoins de l’assistant sans créer de hiérarchie parasite.
            </p>
          </header>

          <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div class="border-b border-[#e5e5e5] px-4 py-3">
              <h3 class="text-[13px] font-semibold">Échelle retenue</h3>
              <p class="mt-1 text-[11px] leading-5 text-[#555555]">Toutes les icônes sont nues, issues de Remix Icon Line et alignées sur l’un de ces trois niveaux.</p>
            </div>
            <div class="grid gap-px bg-[#e5e5e5] sm:grid-cols-3">
              <div class="bg-white p-4">
                <div class="flex h-9 items-center gap-3">
                  <i aria-hidden="true" class="ri-file-copy-line text-sm leading-none text-[#555555]" />
                  <span class="font-mono text-[11px] text-[#555555]">14 px</span>
                </div>
                <p class="mt-2 text-[12px] font-medium">Action compacte</p>
                <p class="mt-1 text-[11px] leading-4 text-[#555555]">Chevrons, copie, édition, feedback et détails secondaires.</p>
              </div>
              <div class="bg-white p-4">
                <div class="flex h-9 items-center gap-3">
                  <i aria-hidden="true" class="ri-terminal-line text-base leading-none text-[#555555]" />
                  <span class="font-mono text-[11px] text-[#555555]">16 px</span>
                </div>
                <p class="mt-2 text-[12px] font-medium">Contrôle standard</p>
                <p class="mt-1 text-[11px] leading-4 text-[#555555]">Onglets, boutons, statuts, contexte et actions principales.</p>
              </div>
              <div class="bg-white p-4">
                <div class="flex h-9 items-center gap-3">
                  <i aria-hidden="true" class="ri-sparkling-line text-xl leading-none text-[#000091]" />
                  <span class="font-mono text-[11px] text-[#555555]">20 px</span>
                </div>
                <p class="mt-2 text-[12px] font-medium">Repère majeur</p>
                <p class="mt-1 text-[11px] leading-4 text-[#555555]">Entrée de fonctionnalité et résultat important, avec parcimonie.</p>
              </div>
            </div>
          </div>

          <div class="mt-4 overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div class="grid gap-px bg-[#e5e5e5] md:grid-cols-3">
              <div class="bg-white p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Famille</p>
                <p class="mt-2 text-[13px] font-semibold">Remix Icon · Line</p>
                <p class="mt-1 text-[11px] leading-5 text-[#555555]">Aucune variante fill. L’état est communiqué par la couleur, le libellé ou le composant parent.</p>
              </div>
              <div class="bg-white p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Couleur</p>
                <p class="mt-2 text-[13px] font-semibold">Neutre par défaut</p>
                <p class="mt-1 text-[11px] leading-5 text-[#555555]">Gris pour l’ordinaire, bleu pour l’actif et couleurs sémantiques pour les statuts. Aucune surface décorative.</p>
              </div>
              <div class="bg-white p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Accessibilité</p>
                <p class="mt-2 text-[13px] font-semibold">Libellé ou tooltip</p>
                <p class="mt-1 text-[11px] leading-5 text-[#555555]">Une icône seule doit avoir un nom accessible et un tooltip visible ; une icône décorative reste masquée.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="actions">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">02</p><h2 class="mt-1 text-2xl font-bold">Actions et suggestions</h2></header>
          <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
            <div class="flex flex-wrap items-center gap-3">
              <button class="agent-focusable agent-pressable h-7 rounded-md bg-[#000091] px-2.5 text-[11px] font-medium text-white">Action principale</button>
              <button class="agent-focusable agent-pressable h-7 rounded-md border border-[#000091] px-2.5 text-[11px] font-medium text-[#000091]">Action secondaire</button>
              <button class="agent-focusable agent-pressable h-7 rounded-md px-2.5 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]">Action tertiaire</button>
              <button disabled class="h-7 rounded-md bg-[#777777] px-2.5 text-[11px] font-medium text-white">Désactivée</button>
              <ExplorationMessageActions content="Exemple de réponse à copier." />
            </div>
            <div class="mt-6 flex max-w-2xl flex-wrap gap-2">
              <ExplorationSuggestion>Explique-moi le contenu de ce jeu de données</ExplorationSuggestion>
              <ExplorationSuggestion>Quelles sont les colonnes disponibles ?</ExplorationSuggestion>
            </div>
            <div class="mt-6 max-w-2xl border-t border-[#f6f6f6] pt-5">
              <p class="mb-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Clarification demandée par l’assistant</p>
              <ExplorationAgentClarification
                question="Quelle période souhaitez-vous analyser ?"
                :choices="['La dernière année', 'Les cinq dernières années', 'Toute la période']"
              />
            </div>
          </div>
        </section>

        <section id="etats">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">03</p><h2 class="mt-1 text-2xl font-bold">États, alertes et feedback</h2></header>
          <div class="grid gap-3 xl:grid-cols-2">
            <ExplorationStatusMessage title="Information" message="Un contexte utile sans bloquer le parcours." tone="info" />
            <ExplorationStatusMessage title="Opération terminée" message="Les données sont maintenant disponibles." tone="success" />
            <ExplorationStatusMessage title="Vérification nécessaire" message="Le résultat peut contenir des valeurs manquantes." tone="warning" />
            <ExplorationStatusMessage title="Action impossible" message="La ressource n’a pas pu être chargée. Réessayez." tone="error" />
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Actions de réponse · état initial</p>
              <ExplorationMessageActions class="mt-2" content="Réponse de démonstration à copier ou évaluer." />
            </div>
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">Usage du modèle</p>
              <div class="mt-2 flex items-center gap-3">
                <ExplorationTokenUsage :usage="designUsage" />
                <span class="text-[11px] text-[#555555]">Cliquer sur l’icône pour afficher le détail.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="mouvement">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">04</p>
            <h2 class="mt-1 text-balance text-2xl font-bold">Mouvement et interaction</h2>
            <p class="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#555555]">
              Les animations donnent du contexte sans ralentir la lecture. Elles restent
              courtes, interrompables et sont neutralisées lorsque le mouvement est réduit.
            </p>
          </header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="text-xs font-medium text-[#161616]">Densité de l’interface desktop</p>
              <dl class="mt-4 divide-y divide-[#e5e5e5] text-xs">
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Chips de suggestion</dt>
                  <dd class="tabular-nums font-medium">28 px minimum</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Actions iconiques</dt>
                  <dd class="tabular-nums font-medium">24 à 28 px</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Pression</dt>
                  <dd class="tabular-nums font-medium">Échelle 0,96 · 150 ms</dd>
                </div>
              </dl>
              <div class="mt-5">
                <p class="mb-2 text-[11px] text-[#555555]">Cliquer pour auditer Copier → Copié</p>
                <ExplorationMessageActions content="Réponse utilisée pour auditer le changement d’icône." />
              </div>
            </div>
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="text-xs font-medium text-[#161616]">Temporalité</p>
              <dl class="mt-4 divide-y divide-[#e5e5e5] text-xs">
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Échange progression → résumé</dt>
                  <dd class="tabular-nums font-medium">150 ms · ease-in-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Entrée d’un message ou panneau</dt>
                  <dd class="tabular-nums font-medium">250 ms · smooth-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Changement d’icône</dt>
                  <dd class="tabular-nums font-medium">250 ms · ease-in-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Accordéon</dt>
                  <dd class="tabular-nums font-medium">250 ms · smooth-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#555555]">Réflexion Unicode</dt>
                  <dd class="tabular-nums font-medium">80 ms · dna</dd>
                </div>
              </dl>
              <p class="mt-5 text-pretty text-[11px] leading-5 text-[#555555]">
                Une échelle commune pilote les mouvements. Les transitions ciblent uniquement
                les propriétés nécessaires et respectent la préférence de mouvement réduit.
              </p>
            </div>
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5 xl:col-span-2">
              <p class="text-xs font-medium text-[#161616]">États en mouvement</p>
              <div class="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <p class="mb-2 text-[11px] text-[#555555]">Réflexion en cours</p>
                  <ExplorationAgentThinking />
                </div>
                <div>
                  <p class="mb-2 text-[11px] text-[#555555]">Ouverture et fermeture</p>
                  <ExplorationAgentDisclosure
                    icon="ri-tools-line"
                    title="2 outils utilisés"
                  >
                    <p class="text-[11px] leading-5 text-[#555555]">
                      Inspection du schéma et exécution SQL.
                    </p>
                  </ExplorationAgentDisclosure>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="conversation">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">05</p><h2 class="mt-1 text-2xl font-bold">Conversation</h2></header>
          <div class="mb-4 grid gap-4 xl:grid-cols-2">
            <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
              <p class="border-b border-[#e5e5e5] bg-white/70 px-4 py-3 text-[11px] font-medium text-[#555555]">
                Empty state · Ressource à charger
              </p>
              <div class="h-[24rem] p-4">
                <ExplorationAgentEmptyState
                  :ready="false"
                  resource-title="Catalogue des données de data.gouv.fr"
                />
              </div>
            </div>
            <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
              <p class="border-b border-[#e5e5e5] bg-white/70 px-4 py-3 text-[11px] font-medium text-[#555555]">
                Empty state · Assistant prêt
              </p>
              <div class="h-[24rem] p-4">
                <ExplorationAgentEmptyState ready />
              </div>
            </div>
          </div>
          <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
            <ExplorationAgentPanelHeader />
            <div class="space-y-6 p-6">
              <div class="ml-auto max-w-[80%] rounded-md bg-[#f6f6f6] px-4 py-3 text-[13px]">Quels sont les jeux de données les plus consultés ?</div>
              <div>
                <ExplorationMessageResponse :content="`Les jeux de données les plus consultés concernent principalement **les transports**, l’environnement et l’économie.\n\n- 128 jeux de données de transport\n- 104 jeux de données environnementaux`" />
                <ExplorationMessageActions content="Les jeux de données les plus consultés concernent principalement les transports." />
              </div>
              <ExplorationMessageResponse content="Je prépare une synthèse des résultats" streaming />
              <ExplorationAgentThinking />
              <div class="grid gap-2 md:grid-cols-2">
                <ExplorationStatusMessage title="Vue appliquée au tableau" message="La requête filtre désormais les lignes de l’explorateur." tone="success" />
                <ExplorationStatusMessage title="La réponse n’a pas pu être générée" message="Le service est momentanément indisponible. Réessayez." tone="error" />
              </div>
              <ExplorationResourceContext organization="data.gouv.fr" title="Catalogue des données de data.gouv.fr" />
              <ExplorationAgentComposer
                v-model="composerValue"
                :disabled="false"
                resource-organization="data.gouv.fr"
                resource-title="Catalogue des données de data.gouv.fr"
                :responding="false"
              />
            </div>
          </div>
          <div class="mt-4 min-h-[34rem] overflow-hidden rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
            <ExplorationAgentPanelHeader v-model="designSqlMode" />
            <ExplorationSqlConsole :ready="false" />
          </div>
        </section>

        <section id="tools">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">06</p><h2 class="mt-1 text-2xl font-bold">Raisonnement et tools</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="mb-4 text-xs font-medium text-[#555555]">Pendant l’exécution</p>
              <ExplorationAgentProgress
                :steps="[
                  { label: 'Inspection du schéma', status: 'complete' },
                  { label: 'Exécution de la requête SQL', status: 'active' },
                  { label: 'Synthèse des résultats', status: 'pending' },
                ]"
              />
            </div>
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="mb-3 text-xs font-medium text-[#555555]">Après l’exécution</p>
              <ExplorationAgentDisclosure icon="ri-brain-line" title="Analyse terminée · 5 étapes" open>
                <p class="pb-2 text-[11px] leading-5 text-[#555555]">
                  Le schéma a été vérifié : 30 colonnes pour 7 283 lignes. Une requête a été exécutée pour classer les résultats par nombre de vues. Le résultat contient 10 lignes.
                </p>
                <ol class="space-y-1.5 border-t border-[#e5e5e5] pt-2">
                  <ExplorationAgentToolTrace
                    description="Lecture de la structure de la table chargée."
                    :details="[{ label: 'Colonnes', value: '30 colonnes disponibles' }]"
                    label="Inspection du schéma"
                    summary="7 283 lignes · 30 colonnes"
                  />
                  <ExplorationAgentToolTrace
                    description="Classer les résultats par nombre de vues."
                    :details="[{ label: 'Colonnes', value: 'title, metric.views' }]"
                    code="SELECT * FROM data LIMIT 10"
                    code-language="SQL"
                    label="Exécution de la requête SQL"
                    open
                    summary="10 lignes · 42 ms"
                  />
                  <ExplorationAgentToolTrace
                    code-language="JSON"
                    :code="JSON.stringify(chartSpecs[0], null, 2)"
                    description="Transformer le résultat SQL en graphique à barres."
                    label="Création du graphique"
                    summary="5 lignes représentées"
                  />
                  <ExplorationAgentToolTrace
                    code-language="JSON"
                    :code="JSON.stringify(mapSpec, null, 2)"
                    description="Positionner les résultats sur une carte de points."
                    label="Création de la carte"
                    summary="4 lignes cartographiées"
                  />
                  <ExplorationAgentToolTrace
                    code="SELECT title, metric.views FROM data"
                    code-language="SQL"
                    description="La première syntaxe a été ajustée avant une nouvelle tentative réussie."
                    error
                    :details="[{ label: 'Correction', value: 'Nom de colonne protégé par des guillemets' }]"
                    label="Ajustement SQL"
                    summary="Erreur récupérée · non bloquante"
                  />
                </ol>
              </ExplorationAgentDisclosure>
            </div>
          </div>
        </section>

        <section id="saisie">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">07</p><h2 class="mt-1 text-2xl font-bold">Saisie, contexte et ressources</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
              <p class="border-b border-[#f6f6f6] px-4 py-3 text-[11px] font-medium text-[#555555]">Sélection initiale</p>
              <ExplorationResourcePicker
                :error="null"
                :loading="false"
                :resources="explorationResources.slice(0, 3)"
                :selected="selectedResource"
                @select="selectedResource = $event"
              />
            </div>
            <div class="space-y-4">
              <div class="rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
                <p class="mb-3 text-[11px] font-medium text-[#555555]">Compositeur · prêt</p>
                <ExplorationAgentComposer
                  v-model="composerValue"
                  :disabled="false"
                  resource-organization="data.gouv.fr"
                  resource-title="Catalogue des données de data.gouv.fr"
                  :responding="false"
                  :usage="designUsage"
                />
              </div>
              <div class="rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
                <p class="mb-3 text-[11px] font-medium text-[#555555]">Compositeur · modification</p>
                <ExplorationAgentComposer
                  v-model="editingComposerValue"
                  :disabled="false"
                  editing
                  resource-organization="data.gouv.fr"
                  resource-title="Catalogue des données de data.gouv.fr"
                  :responding="false"
                />
              </div>
              <div class="rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
                <p class="mb-3 text-[11px] font-medium text-[#555555]">Compositeur · réponse en cours</p>
                <ExplorationAgentComposer
                  v-model="composerValue"
                  :disabled="false"
                  resource-title="Catalogue des données de data.gouv.fr"
                  responding
                />
              </div>
            </div>
          </div>
        </section>

        <section id="sql">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">08</p><h2 class="mt-1 text-2xl font-bold">Console SQL et blocs de code</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="mb-3 text-[11px] font-medium text-[#555555]">Coloration syntaxique · ouvert</p>
              <ExplorationCodeBlock code="SELECT title, organization, &quot;metric.views&quot;\nFROM data\nWHERE organization = 'data.gouv.fr'\nORDER BY &quot;metric.views&quot; DESC\nLIMIT 10" language="SQL" />
            </div>
            <div class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <p class="mb-3 text-[11px] font-medium text-[#555555]">Coloration syntaxique · pliable</p>
              <ExplorationCodeBlock code="const rows = await dataset.executeSql(query)\nreturn rows.slice(0, 10)" collapsible language="TypeScript" />
            </div>
          </div>
          <div class="mt-4 overflow-hidden rounded-md border border-[#e5e5e5] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
            <ExplorationAgentPanelHeader v-model="designSqlMode" />
            <div class="grid gap-0 xl:grid-cols-2">
              <div class="min-h-[31rem] border-b border-[#e5e5e5] xl:border-b-0 xl:border-r">
                <ExplorationSqlConsole :ready="false" />
              </div>
              <div class="min-h-[31rem]">
                <ExplorationSqlConsole ready />
              </div>
            </div>
          </div>
        </section>

        <section id="explorateur">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">09</p><h2 class="mt-1 text-2xl font-bold">Explorateur</h2></header>
          <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <ExplorationDatasetSummary :column-count="3" :row-count="7283" />
            <ExplorationDatasetTable :columns="tableColumns" :rows="tableRows" :schema-columns="schemaColumns" show-types />
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-3">
            <ExplorationExplorerProposal
              reason="La requête conserve les colonnes du tableau et filtre uniquement les lignes concernées."
              sql="SELECT * FROM data WHERE organization = 'data.gouv.fr'"
              state="input-available"
              title="Jeux de données publiés par data.gouv.fr"
            />
            <ExplorationExplorerProposal
              reason="Le tableau affiche maintenant uniquement les lignes correspondant au filtre."
              sql="SELECT * FROM data WHERE organization = 'data.gouv.fr'"
              state="output-available"
              title="Jeux de données publiés par data.gouv.fr"
            />
            <ExplorationExplorerProposal
              error="La colonne demandée n’existe pas dans cette ressource."
              reason="La vue ne peut pas être appliquée sans correction."
              sql="SELECT * FROM data WHERE missing_column = true"
              state="output-error"
              title="Vue non appliquée"
            />
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <ExplorationResultCard eyebrow="Résultat" title="10 jeux de données correspondent au filtre" description="Un conteneur commun aux résultats structurés.">
              <div class="px-5 py-4 text-[12px] leading-5 text-[#555555]">Le contenu principal conserve un rythme régulier et un fond blanc.</div>
              <template #footer><span>10 lignes</span><span>42 ms</span></template>
            </ExplorationResultCard>
            <ExplorationResultCard eyebrow="Aperçu" title="Ressource chargée" description="Le header et le footer sont optionnels.">
              <div class="px-5 py-4 text-[12px] leading-5 text-[#555555]">Catalogue des données de data.gouv.fr</div>
            </ExplorationResultCard>
          </div>
        </section>

        <section id="visualisations">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">10</p><h2 class="mt-1 text-2xl font-bold">Visualisations et chargements</h2></header>
          <div class="grid gap-5 xl:grid-cols-2">
            <ExplorationVisualizationLoading kind="graphique" />
            <ExplorationVisualizationLoading kind="carte" />
          </div>
          <div class="mt-5 rounded-md border border-[#e5e5e5] bg-white p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <p class="text-[12px] font-medium">Transition chargement → graphique</p>
                <p class="mt-0.5 text-[11px] text-[#555555]">Le squelette conserve exactement la taille du composant final.</p>
              </div>
              <button class="agent-focusable agent-pressable h-7 rounded-md border border-[#000091] px-2.5 text-[11px] font-medium text-[#000091]" type="button" @click="visualizationDemo++">Rejouer</button>
            </div>
            <ExplorationVisualizationStage :key="visualizationDemo" kind="graphique" ready>
              <AgentChart :play-completion-sound="false" :rows="chartRows" source="Catalogue des données de data.gouv.fr · data.gouv.fr" :spec="chartSpecs[0]!" :truncated="false" />
            </ExplorationVisualizationStage>
          </div>
          <div class="mt-5 grid gap-5 xl:grid-cols-2">
            <AgentChart
              v-for="spec in chartSpecs"
              :key="spec.type"
              :play-completion-sound="false"
              :rows="chartRows"
              source="Catalogue des données de data.gouv.fr · data.gouv.fr"
              :spec="spec"
              :truncated="false"
            />
          </div>

          <div class="mt-10 border-t border-[#e5e5e5] pt-7">
            <h3 class="text-[18px] font-bold">Fonds de carte</h3>
            <p class="mt-1 max-w-2xl text-[12px] leading-5 text-[#555555]">
              Le même jeu de points est présenté sur trois fonds afin de comparer le contraste, la lisibilité des libellés et la présence visuelle des données.
            </p>
            <div class="mt-5 grid gap-5 xl:grid-cols-3">
              <div
                v-for="basemap in [
                  { id: 'standard', label: 'Standard · OpenMapTiles Bright' },
                  { id: 'light', label: 'Clair · OpenMapTiles Positron' },
                  { id: 'dark', label: 'Sombre · OpenMapTiles Dark' },
                ]"
                :key="basemap.id"
                class="min-w-0"
              >
                <p class="mb-2 text-[11px] font-medium text-[#555555]">{{ basemap.label }}</p>
                <AgentMap
                  :basemap="basemap.id"
                  :play-completion-sound="false"
                  :rows="mapRows"
                  source="Liste des festivals en France · Ministère de la Culture"
                  :spec="mapSpec"
                  :truncated="false"
                />
              </div>
            </div>
          </div>

          <div class="mt-10 border-t border-[#e5e5e5] pt-7">
            <h3 class="text-[18px] font-bold">Cartes choroplèthes</h3>
            <p class="mt-1 max-w-2xl text-[12px] leading-5 text-[#555555]">
              Deux niveaux géographiques permettent d’auditer la palette quantitative, les valeurs absentes, la légende et les tooltips.
            </p>
            <div class="mt-5 grid gap-5 xl:grid-cols-2">
              <AgentMap
                basemap="light"
                :play-completion-sound="false"
                :rows="regionMapRows"
                source="Données fictives de démonstration · data.gouv.fr"
                :spec="regionMapSpec"
                :truncated="false"
              />
              <AgentMap
                basemap="standard"
                :play-completion-sound="false"
                :rows="departmentMapRows"
                source="Données fictives de démonstration · data.gouv.fr"
                :spec="departmentMapSpec"
                :truncated="false"
              />
            </div>
          </div>
        </section>

        <section id="contenu">
          <header class="mb-6"><p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555555]">11</p><h2 class="mt-1 text-2xl font-bold">Contenu long et documentation</h2></header>
          <div class="rounded-md border border-[#e5e5e5] bg-white px-5 md:px-8">
            <DocumentationSection
              eyebrow="Comprendre"
              title="Un motif éditorial distinct de l’interface dense"
              description="Les pages de documentation utilisent une mesure de ligne, un corps et un rythme vertical plus généreux que le panneau de l’assistant."
            >
              <p>Le contenu explicatif doit rester lisible sur une page longue. Il peut contenir des liens, du <code>code en ligne</code> et des listes structurées.</p>
              <ul>
                <li>Les puces restent grises et ne concurrencent pas les liens.</li>
                <li>Les paragraphes utilisent une largeur maximale confortable.</li>
                <li>Les titres conservent une hiérarchie stable.</li>
              </ul>
            </DocumentationSection>
          </div>
        </section>

        <section id="decisions" class="scroll-mt-6 border-t-2 border-[#000091] pt-8">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Référence consolidée</p>
            <h2 class="mt-1 text-2xl font-bold">Décisions de design</h2>
            <p class="mt-2 max-w-3xl text-[13px] leading-6 text-[#555555]">
              Cette synthèse rassemble les arbitrages actés dans les sections précédentes. Elle constitue la règle à suivre pour les prochains composants du prototype.
            </p>
          </header>
          <div class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <article
              v-for="(decision, index) in designDecisions"
              :key="decision.title"
              class="grid gap-3 border-b border-[#e5e5e5] px-4 py-4 last:border-b-0 md:grid-cols-[2rem_7rem_minmax(0,1fr)] md:items-start"
            >
              <span class="font-mono text-[11px] text-[#777777]">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#555555]">{{ decision.group }}</span>
              <div>
                <h3 class="text-[13px] font-semibold leading-5">{{ decision.title }}</h3>
                <p class="mt-1 max-w-3xl text-[12px] leading-5 text-[#555555]">{{ decision.detail }}</p>
                <code class="mt-2 block w-fit rounded-[2px] bg-[#f6f6f6] px-1.5 py-1 text-[11px] leading-4 text-[#555555]">{{ decision.rule }}</code>
              </div>
            </article>
          </div>
        </section>

        <section id="audit" class="scroll-mt-6 border-t-2 border-[#ce0500] pt-8">
          <header class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[#ce0500]">Audit de cohérence</p>
            <h2 class="mt-1 text-2xl font-bold">Éléments susceptibles de poser problème</h2>
            <p class="mt-2 max-w-3xl text-[13px] leading-6 text-[#555555]">
              Cette liste décrit les écarts observables dans l’implémentation actuelle. Elle sert de backlog de design system : elle ne signifie pas que chaque différence doit être supprimée.
            </p>
          </header>
          <ol class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <li
              v-for="(risk, index) in designRisks"
              :key="risk.title"
              class="grid gap-3 border-b border-[#e5e5e5] px-4 py-4 last:border-b-0 md:grid-cols-[2rem_5rem_minmax(0,1fr)] md:items-start"
            >
              <span class="font-mono text-[11px] text-[#777777]">{{ String(index + 1).padStart(2, '0') }}</span>
              <span
                class="w-fit rounded-full bg-[#f6f6f6] px-2 py-0.5 text-[11px] font-medium"
                :class="risk.level === 'Élevé' ? 'text-[#ce0500]' : risk.level === 'Moyen' ? 'text-[#a55800]' : 'text-[#555555]'"
              >{{ risk.level }}</span>
              <div>
                <h3 class="text-[13px] font-semibold leading-5">{{ risk.title }}</h3>
                <p class="mt-1 max-w-3xl text-[12px] leading-5 text-[#555555]">{{ risk.detail }}</p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </main>
</template>
