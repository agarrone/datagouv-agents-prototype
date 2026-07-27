<script setup lang="ts">
import AgentChart from "../components/exploration/AgentChart.client.vue";
import AgentMap from "../components/exploration/AgentMap.client.vue";
import type { BrailleSpinnerName } from "unicode-animations";
import type {
  ChartSpec,
  DatasetRow,
  MapSpec,
} from "~~/shared/types/exploration";

useSeoMeta({
  title: "Design system · Agents data.gouv.fr",
  description: "Inventaire des composants visuels du prototype des agents data.gouv.fr.",
});

const composerValue = ref("");
const designSqlMode = ref<"assistant" | "sql">("sql");
const unicodeAnimations: Array<{
  name: BrailleSpinnerName;
  interval: number;
}> = [
  { name: "braille", interval: 80 },
  { name: "braillewave", interval: 100 },
  { name: "dna", interval: 80 },
  { name: "scan", interval: 70 },
  { name: "rain", interval: 100 },
  { name: "scanline", interval: 120 },
  { name: "pulse", interval: 180 },
  { name: "snake", interval: 80 },
  { name: "sparkle", interval: 150 },
  { name: "cascade", interval: 60 },
  { name: "columns", interval: 60 },
  { name: "orbit", interval: 100 },
  { name: "breathe", interval: 100 },
  { name: "waverows", interval: 90 },
  { name: "checkerboard", interval: 250 },
  { name: "helix", interval: 80 },
  { name: "fillsweep", interval: 100 },
  { name: "diagswipe", interval: 60 },
];

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
    type: "pie",
    title: "Part des consultations",
    description: "Poids relatif de chaque thématique.",
    xField: "label",
    xLabel: "Thématique",
    series: [{ field: "value", label: "Consultations" }],
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
          <li><a class="hover:text-[#000091]" href="#mouvement">Mouvement</a></li>
          <li><a class="hover:text-[#000091]" href="#conversation">Conversation</a></li>
          <li><a class="hover:text-[#000091]" href="#tools">Tools</a></li>
          <li><a class="hover:text-[#000091]" href="#explorateur">Explorateur</a></li>
          <li><a class="hover:text-[#000091]" href="#visualisations">Visualisations</a></li>
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
        </section>

        <section id="actions">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">02</p><h2 class="mt-1 text-2xl font-bold">Actions et suggestions</h2></header>
          <div class="rounded-md border border-[#ddd] bg-white p-5">
            <div class="flex flex-wrap items-center gap-3">
              <button class="agent-focusable agent-pressable min-h-10 rounded-sm bg-[#000091] px-4 py-2.5 text-xs font-medium text-white">Action principale</button>
              <button class="agent-focusable agent-pressable min-h-10 rounded-sm border border-[#000091] px-4 py-2.5 text-xs font-medium text-[#000091]">Action secondaire</button>
              <button disabled class="rounded-sm bg-[#929292] px-4 py-2.5 text-xs font-medium text-white">Désactivée</button>
              <ExplorationMessageActions content="Exemple de réponse à copier." />
            </div>
            <div class="mt-6 flex max-w-2xl flex-wrap gap-2">
              <ExplorationSuggestion>Explique-moi le contenu de ce jeu de données</ExplorationSuggestion>
              <ExplorationSuggestion>Quelles sont les colonnes disponibles ?</ExplorationSuggestion>
            </div>
          </div>
        </section>

        <section id="mouvement">
          <header class="mb-6">
            <p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">03</p>
            <h2 class="mt-1 text-balance text-2xl font-bold">Mouvement et interaction</h2>
            <p class="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#666]">
              Les animations donnent du contexte sans ralentir la lecture. Elles restent
              courtes, interrompables et sont neutralisées lorsque le mouvement est réduit.
            </p>
          </header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="text-xs font-medium text-[#161616]">Cibles interactives</p>
              <dl class="mt-4 divide-y divide-[#e5e5e5] text-xs">
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Interface dense</dt>
                  <dd class="tabular-nums font-medium">40 × 40 px minimum</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                  <dt class="text-[#666]">Mobile et tactile</dt>
                  <dd class="tabular-nums font-medium">44 × 44 px minimum</dd>
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
            <div class="rounded-md border border-[#ddd] bg-white p-5 xl:col-span-2">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <p class="text-xs font-medium text-[#161616]">Animations Unicode disponibles</p>
                <p class="text-[11px] text-[#666]">Taille de référence : 10 px</p>
              </div>
              <p class="mt-2 max-w-2xl text-pretty text-[11px] leading-5 text-[#666]">
                Comparer le mouvement, la densité et le rythme. La variante retenue pour
                l’assistant est actuellement <code>dna</code>.
              </p>
              <ul class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <li
                  v-for="animation in unicodeAnimations"
                  :key="animation.name"
                  class="min-w-0 rounded border border-[#e5e5e5] bg-[#fafafa] p-3"
                >
                  <div class="flex min-h-8 items-center overflow-x-auto text-[10px] text-[#777]">
                    <ExplorationUnicodeSpinner :name="animation.name" />
                  </div>
                  <div class="mt-2 flex items-center justify-between gap-2 border-t border-[#e5e5e5] pt-2">
                    <code class="truncate text-[11px] text-[#3a3a3a]">{{ animation.name }}</code>
                    <span class="shrink-0 text-[10px] tabular-nums text-[#777]">
                      {{ animation.interval }} ms
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="conversation">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">04</p><h2 class="mt-1 text-2xl font-bold">Conversation</h2></header>
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
                <ExplorationMessageResponse content="Les jeux de données les plus consultés concernent principalement **les transports**, l’environnement et l’économie.\n\n- 128 jeux de données de transport\n- 104 jeux de données environnementaux" />
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
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">05</p><h2 class="mt-1 text-2xl font-bold">Raisonnement et tools</h2></header>
          <div class="grid gap-4 xl:grid-cols-2">
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="mb-3 text-xs font-medium text-[#666]">États terminés</p>
              <ExplorationAgentToolStep
                title="Inspection du schéma"
                icon="ri-layout-column-line"
                state="output-available"
                input-summary="Lecture de la structure de la table chargée dans l’explorateur."
                output-summary="7 283 lignes · 30 colonnes"
                :details="[{ label: 'Table', value: 'data' }]"
                :fields="schemaColumns"
              />
              <ExplorationAgentToolStep
                title="Exécution SQL"
                icon="ri-code-s-slash-line"
                state="output-available"
                input-summary="Classer les résultats par nombre de vues"
                sql="SELECT title, &quot;metric.views&quot; FROM data ORDER BY &quot;metric.views&quot; DESC LIMIT 10"
                output-summary="10 lignes · 42 ms"
                :details="[
                  { label: 'Lignes', value: '10' },
                  { label: 'Durée', value: '42 ms' },
                  { label: 'Résultat', value: 'Complet' },
                ]"
                :fields="schemaColumns.slice(0, 2)"
              />
            </div>
            <div class="rounded-md border border-[#ddd] bg-white p-5">
              <p class="mb-3 text-xs font-medium text-[#666]">En cours et erreur</p>
              <ExplorationAgentToolStep icon="ri-code-s-slash-line" title="Exécution SQL" state="input-available" input-summary="Calcul de la distribution" />
              <ExplorationAgentToolStep icon="ri-map-2-line" title="Création de la carte" state="output-error" error="Les coordonnées géographiques sont absentes du résultat." />
            </div>
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
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
              <ExplorationReasoning content="L’assistant a vérifié la structure disponible puis exécuté une requête sur les données. Ce résumé décrit uniquement les opérations observables." />
              <ExplorationAgentDisclosure icon="ri-tools-line" title="2 outils utilisés">
                <ExplorationAgentToolStep title="Inspection du schéma" state="output-available" output-summary="30 colonnes analysées" />
                <ExplorationAgentToolStep title="Exécution SQL" state="output-available" sql="SELECT * FROM data LIMIT 10" output-summary="10 lignes · 42 ms" />
              </ExplorationAgentDisclosure>
            </div>
          </div>
        </section>

        <section id="explorateur">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">06</p><h2 class="mt-1 text-2xl font-bold">Explorateur</h2></header>
          <div class="overflow-hidden rounded-md border border-[#ddd] bg-white">
            <ExplorationDatasetSummary :column-count="3" :row-count="7283" />
            <ExplorationDatasetTable :columns="tableColumns" :rows="tableRows" :schema-columns="schemaColumns" show-types />
          </div>
          <div class="mt-4 max-w-2xl">
            <ExplorationExplorerProposal
              reason="La requête conserve les colonnes du tableau et filtre uniquement les lignes concernées."
              sql="SELECT * FROM data WHERE organization = 'data.gouv.fr'"
              state="input-available"
              title="Jeux de données publiés par data.gouv.fr"
            />
          </div>
        </section>

        <section id="visualisations">
          <header class="mb-6"><p class="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666]">07</p><h2 class="mt-1 text-2xl font-bold">Visualisations et chargements</h2></header>
          <div class="grid gap-5 xl:grid-cols-2">
            <ExplorationVisualizationLoading kind="graphique" />
            <ExplorationVisualizationLoading kind="carte" />
          </div>
          <div class="mt-5 grid gap-5 xl:grid-cols-2">
            <AgentChart
              v-for="spec in chartSpecs"
              :key="spec.type"
              :play-completion-sound="false"
              :rows="chartRows"
              :spec="spec"
              :truncated="false"
            />
            <AgentMap
              :play-completion-sound="false"
              :rows="mapRows"
              :spec="mapSpec"
              :truncated="false"
            />
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
