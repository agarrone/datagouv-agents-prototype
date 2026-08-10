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
  { size: "10 px", role: "Micro-information", class: "text-[10px]" },
  { size: "11 px", role: "Métadonnée et action compacte", class: "text-[11px]" },
  { size: "12 px", role: "Libellé d’interface", class: "text-[12px]" },
  { size: "13 px", role: "Corps de l’assistant", class: "text-[13px]" },
  { size: "15 px", role: "Introduction et sous-titre", class: "text-[15px]" },
  { size: "22 px", role: "Titre de contenu", class: "text-[22px]" },
];

const designRisks = [
  {
    level: "Élevé",
    title: "Couleurs non sémantiques",
    detail: "Les composants emploient encore de nombreuses valeurs hexadécimales directes. Des gris très proches et plusieurs variantes de bleu peuvent dériver indépendamment.",
  },
  {
    level: "Moyen",
    title: "Échelle typographique très fragmentée",
    detail: "Les tailles 10, 11, 12, 13, 14 et 15 px coexistent. À faible contraste, la différence de rôle entre deux niveaux voisins devient difficile à percevoir.",
  },
  {
    level: "Moyen",
    title: "Surfaces et rayons concurrents",
    detail: "Cartes, tools, messages, champs et panneaux mélangent plusieurs rayons, bordures et fonds sans nomenclature de variantes partagée.",
  },
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
    level: "Faible",
    title: "Iconographie et tailles",
    detail: "Remix Icon est cohérent globalement, mais les tailles varient entre 12 px et 20 px et certaines icônes décoratives portent une surface tandis que d’autres restent nues.",
  },
];
</script>

<template>
  <main class="min-h-screen bg-[#f6f6f6] text-[#161616]">
    <header class="border-b border-[#c6c6c6] bg-white px-5 py-8 md:px-10">
      <div class="mx-auto max-w-[90rem]">
        <NuxtLink class="inline-flex items-center gap-1 text-xs text-[#000091] underline" to="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-base leading-none" />
          Retour au prototype
        </NuxtLink>
        <p class="mt-8 text-xs font-medium uppercase tracking-[0.08em] text-[#000091]">Référence visuelle</p>
        <h1 class="mt-2 text-balance text-3xl font-bold md:text-5xl">Composants des agents</h1>
        <p class="mt-4 max-w-2xl text-pretty text-sm leading-6 text-[#666]">
          Inventaire vivant des composants utilisés dans l’explorateur. Cette page permet
          de comparer leur hiérarchie, leurs états et leur cohérence.
        </p>
      </div>
    </header>

    <div class="mx-auto grid max-w-[90rem] gap-12 px-5 py-10 md:px-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav class="self-start lg:sticky lg:top-6" aria-label="Sections de la page">
        <p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">Sommaire</p>
        <ul class="mt-3 space-y-2 text-xs">
          <li><a class="hover:text-[#000091]" href="#fondations">Fondations</a></li>
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
          <li><a class="font-medium text-[#ce0500] hover:text-[#000091]" href="#audit">Points de vigilance</a></li>
        </ul>
      </nav>

      <div class="min-w-0 space-y-16">
        <section id="fondations">
          <header class="mb-6">
            <p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">01</p>
            <h2 class="mt-1 text-2xl font-bold">Fondations</h2>
          </header>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="color in [
                ['Bleu France', '#000091'],
                ['Fond assistant', '#EBEDFF'],
                ['Succès', '#18753C'],
                ['Erreur', '#E1000F'],
              ]"
              :key="color[1]"
              class="overflow-hidden rounded-md border border-[#ddd] bg-white"
            >
              <div class="h-20" :style="{ backgroundColor: color[1] }" />
              <div class="p-3 text-xs"><strong>{{ color[0] }}</strong><code class="mt-1 block text-[#666]">{{ color[1] }}</code></div>
            </div>
          </div>
          <div class="mt-4 rounded-md border border-[#ddd] bg-white p-5">
            <p class="text-3xl font-bold">Marianne</p>
            <p class="mt-2 text-sm text-[#666]">Police principale pour le produit et les visualisations.</p>
            <code class="mt-5 block font-mono text-sm">SELECT * FROM data LIMIT 10</code>
          </div>
          <div class="mt-4 overflow-hidden rounded-md border border-[#ddd] bg-white">
            <div
              v-for="sample in typographySamples"
              :key="sample.size"
              class="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-4 border-b border-[#eee] px-4 py-3 last:border-b-0"
            >
              <code class="text-[11px] text-[#666]">{{ sample.size }}</code>
              <p :class="sample.class"><strong class="font-medium">{{ sample.role }}</strong> · Portez ce vieux whisky au juge blond qui fume.</p>
            </div>
          </div>
        </section>

        <section id="actions">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">02</p><h2 class="mt-1 text-2xl font-bold">Actions et suggestions</h2></header>
          <div class="rounded-md border border-[#ddd] bg-white p-5">
            <div class="flex flex-wrap items-center gap-3">
              <button class="agent-focusable agent-pressable h-7 rounded-sm bg-[#000091] px-2.5 text-[11px] font-medium text-white">Action principale</button>
              <button class="agent-focusable agent-pressable h-7 rounded-sm border border-[#000091] px-2.5 text-[11px] font-medium text-[#000091]">Action secondaire</button>
              <button class="agent-focusable agent-pressable h-7 rounded-sm px-2.5 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]">Action tertiaire</button>
              <button disabled class="h-7 rounded-sm bg-[#929292] px-2.5 text-[11px] font-medium text-white">Désactivée</button>
              <ExplorationMessageActions content="Exemple de réponse à copier." />
            </div>
            <div class="mt-6 flex max-w-2xl flex-wrap gap-2">
              <ExplorationSuggestion>Explique-moi le contenu de ce jeu de données</ExplorationSuggestion>
              <ExplorationSuggestion>Quelles sont les colonnes disponibles ?</ExplorationSuggestion>
            </div>
          </div>
        </section>

        <section id="etats">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">03</p><h2 class="mt-1 text-2xl font-bold">États, alertes et feedback</h2></header>
          <div class="grid gap-3 xl:grid-cols-2">
            <ExplorationStatusMessage title="Information" message="Un contexte utile sans bloquer le parcours." tone="info" />
            <ExplorationStatusMessage title="Opération terminée" message="Les données sont maintenant disponibles." tone="success" />
            <ExplorationStatusMessage title="Vérification nécessaire" message="Le résultat peut contenir des valeurs manquantes." tone="warning" />
            <ExplorationStatusMessage title="Action impossible" message="La ressource n’a pas pu être chargée. Réessayez." tone="error" />
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#666]">Actions de réponse · état initial</p>
              <ExplorationMessageActions class="mt-2" content="Réponse de démonstration à copier ou évaluer." />
            </div>
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="text-[11px] font-medium uppercase tracking-[0.05em] text-[#666]">Usage du modèle</p>
              <div class="mt-2 flex items-center gap-3">
                <ExplorationTokenUsage :usage="designUsage" />
                <span class="text-[11px] text-[#666]">Cliquer sur l’icône pour afficher le détail.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="mouvement">
          <header class="mb-6">
            <p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">04</p>
            <h2 class="mt-1 text-balance text-2xl font-bold">Mouvement et interaction</h2>
            <p class="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#666]">
              Les animations donnent du contexte sans ralentir la lecture. Elles restent
              courtes, interrompables et sont neutralisées lorsque le mouvement est réduit.
            </p>
          </header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="text-xs font-medium text-[#161616]">Densité de l’interface desktop</p>
              <dl class="mt-4 divide-y divide-[#e5e5e5] text-xs">
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Chips de suggestion</dt>
                  <dd class="tabular-nums font-medium">28 px minimum</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Actions iconiques</dt>
                  <dd class="tabular-nums font-medium">24 à 28 px</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Pression</dt>
                  <dd class="tabular-nums font-medium">Échelle 0,96 · 150 ms</dd>
                </div>
              </dl>
              <div class="mt-5">
                <p class="mb-2 text-[11px] text-[#666]">Cliquer pour auditer Copier → Copié</p>
                <ExplorationMessageActions content="Réponse utilisée pour auditer le changement d’icône." />
              </div>
            </div>
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="text-xs font-medium text-[#161616]">Temporalité</p>
              <dl class="mt-4 divide-y divide-[#e5e5e5] text-xs">
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Échange progression → résumé</dt>
                  <dd class="tabular-nums font-medium">150 ms · ease-in-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Entrée d’un message ou panneau</dt>
                  <dd class="tabular-nums font-medium">250 ms · smooth-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Changement d’icône</dt>
                  <dd class="tabular-nums font-medium">250 ms · ease-in-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Accordéon</dt>
                  <dd class="tabular-nums font-medium">250 ms · smooth-out</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Réflexion Unicode</dt>
                  <dd class="tabular-nums font-medium">80 ms · dna</dd>
                </div>
              </dl>
              <p class="mt-5 text-pretty text-[11px] leading-5 text-[#666]">
                Une échelle commune pilote les mouvements. Les transitions ciblent uniquement
                les propriétés nécessaires et respectent la préférence de mouvement réduit.
              </p>
            </div>
            <div class="rounded-md border border-[#ddd] bg-white p-5 xl:col-span-2">
              <p class="text-xs font-medium text-[#161616]">États en mouvement</p>
              <div class="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <p class="mb-2 text-[11px] text-[#666]">Réflexion en cours</p>
                  <ExplorationAgentThinking />
                </div>
                <div>
                  <p class="mb-2 text-[11px] text-[#666]">Ouverture et fermeture</p>
                  <ExplorationAgentDisclosure
                    icon="ri-tools-line"
                    title="2 outils utilisés"
                  >
                    <p class="text-[11px] leading-5 text-[#666]">
                      Inspection du schéma et exécution SQL.
                    </p>
                  </ExplorationAgentDisclosure>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="conversation">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">05</p><h2 class="mt-1 text-2xl font-bold">Conversation</h2></header>
          <div class="mb-4 grid gap-4 xl:grid-cols-2">
            <div class="overflow-hidden rounded-md border border-[#ddd] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
              <p class="border-b border-[#e5e5e5] bg-white/70 px-4 py-3 text-[11px] font-medium text-[#666]">
                Empty state · Ressource à charger
              </p>
              <div class="h-[24rem] p-4">
                <ExplorationAgentEmptyState
                  :ready="false"
                  resource-title="Catalogue des données de data.gouv.fr"
                />
              </div>
            </div>
            <div class="overflow-hidden rounded-md border border-[#ddd] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
              <p class="border-b border-[#e5e5e5] bg-white/70 px-4 py-3 text-[11px] font-medium text-[#666]">
                Empty state · Assistant prêt
              </p>
              <div class="h-[24rem] p-4">
                <ExplorationAgentEmptyState ready />
              </div>
            </div>
          </div>
          <div class="overflow-hidden rounded-md border border-[#c6c6c6] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
            <ExplorationAgentPanelHeader />
            <div class="space-y-6 p-6">
              <div class="ml-auto max-w-[80%] rounded-[14px_14px_3px_14px] bg-[#eee] px-4 py-3 text-[13px]">Quels sont les jeux de données les plus consultés ?</div>
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
          <div class="mt-4 min-h-[34rem] overflow-hidden rounded-md border border-[#c6c6c6] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
            <ExplorationAgentPanelHeader v-model="designSqlMode" />
            <ExplorationSqlConsole :ready="false" />
          </div>
        </section>

        <section id="tools">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">06</p><h2 class="mt-1 text-2xl font-bold">Raisonnement et tools</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="mb-4 text-xs font-medium text-[#666]">Pendant l’exécution</p>
              <ExplorationAgentProgress
                :steps="[
                  { label: 'Inspection du schéma', status: 'complete' },
                  { label: 'Exécution de la requête SQL', status: 'active' },
                  { label: 'Synthèse des résultats', status: 'pending' },
                ]"
              />
            </div>
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="mb-3 text-xs font-medium text-[#666]">Après l’exécution</p>
              <ExplorationAgentDisclosure icon="ri-brain-line" title="Analyse terminée · 2 étapes" open>
                <p class="pb-2 text-[11px] leading-5 text-[#666]">
                  Le schéma a été vérifié : 30 colonnes pour 7 283 lignes. Une requête a été exécutée pour classer les résultats par nombre de vues. Le résultat contient 10 lignes.
                </p>
                <ol class="space-y-1.5 border-t border-[#e5e5e5] pt-2">
                  <ExplorationAgentToolTrace
                    description="Lecture de la structure de la table chargée."
                    :details="[{ label: 'Colonnes', value: '30 colonnes disponibles' }]"
                    icon="ri-table-line"
                    label="Inspection du schéma"
                    summary="7 283 lignes · 30 colonnes"
                  />
                  <ExplorationAgentToolTrace
                    description="Classer les résultats par nombre de vues."
                    :details="[{ label: 'Colonnes', value: 'title, metric.views' }]"
                    icon="ri-terminal-box-line"
                    label="Exécution de la requête SQL"
                    sql="SELECT * FROM data LIMIT 10"
                    summary="10 lignes · 42 ms"
                  />
                  <ExplorationAgentToolTrace
                    description="La première syntaxe a été ajustée avant une nouvelle tentative réussie."
                    error
                    :details="[{ label: 'Correction', value: 'Nom de colonne protégé par des guillemets' }]"
                    icon="ri-error-warning-line"
                    label="Ajustement SQL"
                    summary="Erreur récupérée · non bloquante"
                  />
                </ol>
              </ExplorationAgentDisclosure>
            </div>
          </div>
        </section>

        <section id="saisie">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">07</p><h2 class="mt-1 text-2xl font-bold">Saisie, contexte et ressources</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="overflow-hidden rounded-md border border-[#ddd] bg-white">
              <p class="border-b border-[#eee] px-4 py-3 text-[11px] font-medium text-[#666]">Sélection initiale</p>
              <ExplorationResourcePicker
                :error="null"
                :loading="false"
                :resources="explorationResources.slice(0, 3)"
                :selected="selectedResource"
                @select="selectedResource = $event"
              />
            </div>
            <div class="space-y-4">
              <div class="rounded-md border border-[#ddd] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
                <p class="mb-3 text-[11px] font-medium text-[#666]">Compositeur · prêt</p>
                <ExplorationAgentComposer
                  v-model="composerValue"
                  :disabled="false"
                  resource-organization="data.gouv.fr"
                  resource-title="Catalogue des données de data.gouv.fr"
                  :responding="false"
                  :usage="designUsage"
                />
              </div>
              <div class="rounded-md border border-[#ddd] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
                <p class="mb-3 text-[11px] font-medium text-[#666]">Compositeur · modification</p>
                <ExplorationAgentComposer
                  v-model="editingComposerValue"
                  :disabled="false"
                  editing
                  resource-organization="data.gouv.fr"
                  resource-title="Catalogue des données de data.gouv.fr"
                  :responding="false"
                />
              </div>
              <div class="rounded-md border border-[#ddd] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))] p-4">
                <p class="mb-3 text-[11px] font-medium text-[#666]">Compositeur · réponse en cours</p>
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
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">08</p><h2 class="mt-1 text-2xl font-bold">Console SQL et blocs de code</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="mb-3 text-[11px] font-medium text-[#666]">Coloration syntaxique · ouvert</p>
              <ExplorationCodeBlock code="SELECT title, organization, &quot;metric.views&quot;\nFROM data\nWHERE organization = 'data.gouv.fr'\nORDER BY &quot;metric.views&quot; DESC\nLIMIT 10" language="SQL" />
            </div>
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="mb-3 text-[11px] font-medium text-[#666]">Coloration syntaxique · pliable</p>
              <ExplorationCodeBlock code="const rows = await dataset.executeSql(query)\nreturn rows.slice(0, 10)" collapsible language="TypeScript" />
            </div>
          </div>
          <div class="mt-4 overflow-hidden rounded-md border border-[#c6c6c6] bg-[linear-gradient(to_bottom,rgba(235,237,255,0.30),rgba(235,237,255,0.01))]">
            <ExplorationAgentPanelHeader v-model="designSqlMode" />
            <div class="grid gap-0 xl:grid-cols-2">
              <div class="min-h-[31rem] border-b border-[#ddd] xl:border-b-0 xl:border-r">
                <ExplorationSqlConsole :ready="false" />
              </div>
              <div class="min-h-[31rem]">
                <ExplorationSqlConsole ready />
              </div>
            </div>
          </div>
        </section>

        <section id="explorateur">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">09</p><h2 class="mt-1 text-2xl font-bold">Explorateur</h2></header>
          <div class="overflow-hidden rounded-md border border-[#ddd] bg-white">
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
              <div class="px-5 py-4 text-[12px] leading-5 text-[#3a3a3a]">Le contenu principal conserve un rythme régulier et un fond blanc.</div>
              <template #footer><span>10 lignes</span><span>42 ms</span></template>
            </ExplorationResultCard>
            <ExplorationResultCard eyebrow="Aperçu" title="Ressource chargée" description="Le header et le footer sont optionnels.">
              <div class="px-5 py-4 text-[12px] leading-5 text-[#3a3a3a]">Catalogue des données de data.gouv.fr</div>
            </ExplorationResultCard>
          </div>
        </section>

        <section id="visualisations">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">10</p><h2 class="mt-1 text-2xl font-bold">Visualisations et chargements</h2></header>
          <div class="grid gap-5 xl:grid-cols-2">
            <ExplorationVisualizationLoading kind="graphique" />
            <ExplorationVisualizationLoading kind="carte" />
          </div>
          <div class="mt-5 rounded-md border border-[#ddd] bg-white p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <p class="text-[12px] font-medium">Transition chargement → graphique</p>
                <p class="mt-0.5 text-[11px] text-[#666]">Le squelette conserve exactement la taille du composant final.</p>
              </div>
              <button class="agent-focusable agent-pressable h-7 rounded-sm border border-[#000091] px-2.5 text-[11px] font-medium text-[#000091]" type="button" @click="visualizationDemo++">Rejouer</button>
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
            <AgentMap
              :play-completion-sound="false"
              :rows="mapRows"
              source="Liste des festivals en France · Ministère de la Culture"
              :spec="mapSpec"
              :truncated="false"
            />
          </div>
        </section>

        <section id="contenu">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">11</p><h2 class="mt-1 text-2xl font-bold">Contenu long et documentation</h2></header>
          <div class="rounded-md border border-[#ddd] bg-white px-5 md:px-8">
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

        <section id="audit" class="scroll-mt-6 border-t-2 border-[#ce0500] pt-8">
          <header class="mb-6">
            <p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#ce0500]">Audit de cohérence</p>
            <h2 class="mt-1 text-2xl font-bold">Éléments susceptibles de poser problème</h2>
            <p class="mt-2 max-w-3xl text-[13px] leading-6 text-[#555]">
              Cette liste décrit les écarts observables dans l’implémentation actuelle. Elle sert de backlog de design system : elle ne signifie pas que chaque différence doit être supprimée.
            </p>
          </header>
          <ol class="overflow-hidden rounded-md border border-[#c6c6c6] bg-white">
            <li
              v-for="(risk, index) in designRisks"
              :key="risk.title"
              class="grid gap-3 border-b border-[#e5e5e5] px-4 py-4 last:border-b-0 md:grid-cols-[2rem_5rem_minmax(0,1fr)] md:items-start"
            >
              <span class="font-mono text-[11px] text-[#777]">{{ String(index + 1).padStart(2, '0') }}</span>
              <span
                class="w-fit rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="risk.level === 'Élevé' ? 'bg-[#fef4f4] text-[#ce0500]' : risk.level === 'Moyen' ? 'bg-[#fff4f3] text-[#a55800]' : 'bg-[#f6f6f6] text-[#666]'"
              >{{ risk.level }}</span>
              <div>
                <h3 class="text-[13px] font-semibold leading-5">{{ risk.title }}</h3>
                <p class="mt-1 max-w-3xl text-[12px] leading-5 text-[#555]">{{ risk.detail }}</p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </main>
</template>
