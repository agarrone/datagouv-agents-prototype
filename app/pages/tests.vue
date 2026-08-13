<script setup lang="ts">
import {
  manualTestScenarios,
  type ManualTestStatus,
} from "~~/shared/data/manual-test-scenarios";
import { explorationResources } from "~~/shared/data/exploration-resources";

type TestResult = {
  status: ManualTestStatus;
  notes: string;
  testedAt?: string;
};

const storageKey = "datagouv-agents-manual-tests-v1";
const statusLabels: Record<ManualTestStatus, string> = {
  todo: "À tester",
  passed: "Réussi",
  failed: "Échoué",
  blocked: "Bloqué",
};
const statusIcons: Record<ManualTestStatus, string> = {
  todo: "ri-test-tube-line",
  passed: "ri-checkbox-circle-line",
  failed: "ri-close-circle-line",
  blocked: "ri-error-warning-line",
};

useSeoMeta({
  title: "Tests manuels — Agents data.gouv.fr",
  description: "Protocole de tests manuels de l’assistant d’exploration de données.",
});

const results = ref<Record<string, TestResult>>({});
const activeId = ref(manualTestScenarios[0]?.id ?? "");
const category = ref("Toutes");
const tester = ref("");
const environment = ref("Production");
const copied = ref(false);
const hydrated = ref(false);
const router = useRouter();
const testResources = explorationResources.filter(resource =>
  ["festivals-france", "catalogue-datagouv"].includes(resource.id),
);
const selectedTestResourceId = ref(testResources[0]?.id ?? "");
const freePrompt = ref("");

const selectedTestResource = computed(() => testResources.find(resource =>
  resource.id === selectedTestResourceId.value,
));

const categories = computed(() => [
  "Toutes",
  ...new Set(manualTestScenarios.map(scenario => scenario.category)),
]);
const filteredScenarios = computed(() => manualTestScenarios.filter(scenario =>
  category.value === "Toutes" || scenario.category === category.value,
));
const activeScenario = computed(() =>
  manualTestScenarios.find(scenario => scenario.id === activeId.value)
  ?? manualTestScenarios[0],
);
const completedCount = computed(() => manualTestScenarios.filter(scenario =>
  (results.value[scenario.id]?.status ?? "todo") !== "todo",
).length);
const passedCount = computed(() => manualTestScenarios.filter(scenario =>
  results.value[scenario.id]?.status === "passed",
).length);

onMounted(() => {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) results.value = JSON.parse(saved) as Record<string, TestResult>;
  }
  catch {
    // La campagne reste utilisable si le stockage local est indisponible.
  }
  hydrated.value = true;
});

watch(results, (value) => {
  if (!hydrated.value) return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}, { deep: true });

watch(filteredScenarios, (scenarios) => {
  if (scenarios.length && !scenarios.some(scenario => scenario.id === activeId.value)) {
    activeId.value = scenarios[0]!.id;
  }
});

function resultFor(id: string): TestResult {
  return results.value[id] ?? { status: "todo", notes: "" };
}

function updateResult(id: string, patch: Partial<TestResult>) {
  const current = resultFor(id);
  results.value[id] = {
    ...current,
    ...patch,
    testedAt: patch.status && patch.status !== "todo"
      ? new Date().toISOString()
      : current.testedAt,
  };
}

async function copyPrompt() {
  if (!activeScenario.value) return;
  await navigator.clipboard.writeText(activeScenario.value.prompt);
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 1400);
}

function resetCampaign() {
  if (window.confirm("Effacer tous les résultats de cette campagne ?")) {
    results.value = {};
  }
}

function exportResults() {
  const payload = {
    exportedAt: new Date().toISOString(),
    tester: tester.value,
    environment: environment.value,
    summary: {
      total: manualTestScenarios.length,
      completed: completedCount.value,
      passed: passedCount.value,
    },
    tests: manualTestScenarios.map(scenario => ({
      ...scenario,
      result: resultFor(scenario.id),
    })),
  };
  const url = URL.createObjectURL(new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" },
  ));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tests-assistant-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function laboratoryRoute(prompt: string) {
  const resource = selectedTestResource.value;
  if (!resource) return "/tests";
  return {
    path: "/laboratoire/exploration",
    query: {
      resource: resource.id,
      dataset: resource.datasetReference,
      parquet: resource.parquetUrl,
      title: resource.title,
      organization: resource.organization,
      resourceName: resource.resourceName,
      prompt: prompt.trim(),
    },
  };
}

function runPrompt(prompt = freePrompt.value) {
  const text = prompt.trim();
  if (!text || !selectedTestResource.value) return;
  const resolved = router.resolve(laboratoryRoute(text));
  window.open(resolved.href, "_blank", "noopener,noreferrer");
}

function useScenarioPrompt() {
  if (!activeScenario.value) return;
  freePrompt.value = activeScenario.value.prompt;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function statusClasses(status: ManualTestStatus, selected = false) {
  if (!selected) return "border-[#e5e5e5] bg-white text-[#555555] hover:border-[#929292]";
  if (status === "passed") return "border-[#3bea7e] bg-[#b8fec9] text-[#18753c]";
  if (status === "failed") return "border-[#ffbdbd] bg-[#ffe9e9] text-[#ce0500]";
  if (status === "blocked") return "border-[#fbd335] bg-[#fff3d8] text-[#a55800]";
  return "border-[#cacafb] bg-[#ececfe] text-[#000091]";
}

function statusTextClass(status: ManualTestStatus) {
  if (status === "passed") return "text-[#18753c]";
  if (status === "failed") return "text-[#ce0500]";
  if (status === "blocked") return "text-[#a55800]";
  return "text-[#777777]";
}
</script>

<template>
  <main class="min-h-dvh bg-white text-[#161616]">
    <header class="border-b border-[#e5e5e5] bg-[#f6f6f6]">
      <div class="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6">
        <NuxtLink class="inline-flex items-center gap-1.5 text-[12px] text-[#000091] underline underline-offset-4" to="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-[14px]" />
          Retour à l’accueil
        </NuxtLink>
        <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p class="text-[12px] text-[#666666]">Campagne manuelle</p>
            <h1 class="mt-1 text-2xl font-bold leading-8">Tester l’assistant de données</h1>
            <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#555555]">
              Exécutez les prompts sans les reformuler et consignez uniquement les comportements observables.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[#e5e5e5] bg-white px-2.5 text-[12px] font-medium hover:border-[#929292]" type="button" @click="resetCampaign">
              <i aria-hidden="true" class="ri-restart-line text-[14px]" />
              Réinitialiser
            </button>
            <button class="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#000091] px-2.5 text-[12px] font-medium text-white hover:bg-[#1212ff]" type="button" @click="exportResults">
              <i aria-hidden="true" class="ri-download-line text-[14px]" />
              Exporter
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6">
      <section aria-label="Informations sur la campagne" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-[6px] border border-[#e5e5e5] p-3">
          <p class="text-[11px] text-[#666666]">Progression</p>
          <p class="mt-1 text-2xl font-bold">{{ completedCount }}/{{ manualTestScenarios.length }}</p>
        </div>
        <div class="rounded-[6px] border border-[#e5e5e5] p-3">
          <p class="text-[11px] text-[#666666]">Réussis</p>
          <p class="mt-1 text-2xl font-bold text-[#18753c]">{{ passedCount }}</p>
        </div>
        <label class="rounded-[6px] border border-[#e5e5e5] p-3 focus-within:border-[#000091]">
          <span class="block text-[11px] text-[#666666]">Testeur ou testeuse</span>
          <input v-model="tester" class="mt-1 w-full bg-transparent text-[13px] font-medium outline-none" placeholder="Nom" type="text">
        </label>
        <label class="rounded-[6px] border border-[#e5e5e5] p-3 focus-within:border-[#000091]">
          <span class="block text-[11px] text-[#666666]">Environnement</span>
          <select v-model="environment" class="mt-1 w-full bg-transparent text-[13px] font-medium outline-none">
            <option>Production</option>
            <option>Local</option>
            <option>Preview Vercel</option>
          </select>
        </label>
      </section>

      <section class="mt-5 rounded-[6px] border border-[#e5e5e5] bg-[#f6f6f6] p-4">
        <h2 class="text-[14px] font-semibold">Protocole</h2>
        <ol class="mt-3 grid gap-4 text-[12px] leading-5 md:grid-cols-2 xl:grid-cols-4">
          <li v-for="step in [{ title: 'Préparer', text: 'Charger la ressource et vérifier son contexte.' }, { title: 'Exécuter', text: 'Copier le prompt sans aider l’assistant.' }, { title: 'Observer', text: 'Contrôler réponse, tools, SQL et explorateur.' }, { title: 'Consigner', text: 'Noter les écarts et leur reproduction.' }]" :key="step.title" class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#000091] text-[11px] font-bold text-white">{{ ['Préparer', 'Exécuter', 'Observer', 'Consigner'].indexOf(step.title) + 1 }}</span>
            <span><strong class="block font-semibold">{{ step.title }}</strong><span class="text-[#555555]">{{ step.text }}</span></span>
          </li>
        </ol>
      </section>

      <section class="mt-5 overflow-hidden rounded-[6px] border border-[#e5e5e5] bg-white" aria-labelledby="free-test-title">
        <header class="border-b border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3">
          <p class="text-[10px] uppercase tracking-[0.06em] text-[#666666]">Banc d’essai libre</p>
          <h2 id="free-test-title" class="mt-1 text-[18px] font-semibold">Tester directement un prompt</h2>
        </header>
        <form class="grid gap-4 p-4 lg:grid-cols-[minmax(250px,0.65fr)_minmax(0,1.35fr)]" @submit.prevent="runPrompt()">
          <fieldset>
            <legend class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#666666]">Jeu de données</legend>
            <div class="mt-2 grid gap-2">
              <label v-for="resource in testResources" :key="resource.id" class="flex cursor-pointer items-center gap-2.5 rounded-[6px] border p-3" :class="selectedTestResourceId === resource.id ? 'border-[#000091] bg-[#ececfe]' : 'border-[#e5e5e5] bg-white hover:border-[#929292]'">
                <input v-model="selectedTestResourceId" class="accent-[#000091]" name="test-resource" type="radio" :value="resource.id">
                <span class="min-w-0">
                  <strong class="block text-[12px] font-semibold leading-4">{{ resource.title }}</strong>
                  <span class="mt-0.5 block text-[11px] text-[#666666]">{{ resource.organization }}</span>
                </span>
              </label>
            </div>
          </fieldset>
          <div>
            <label class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#666666]" for="free-test-prompt">Prompt</label>
            <textarea id="free-test-prompt" v-model="freePrompt" class="mt-2 h-28 w-full resize-y rounded-[6px] border border-[#e5e5e5] p-3 text-[13px] leading-5 outline-none placeholder:text-[#777777] focus:border-[#000091]" placeholder="Saisissez la question à tester…" />
            <div class="mt-2 flex items-center justify-between gap-3">
              <p class="text-[11px] leading-4 text-[#666666]">Le laboratoire s’ouvre dans un nouvel onglet et envoie le prompt après le chargement de la ressource.</p>
              <button class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] bg-[#000091] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!freePrompt.trim() || !selectedTestResource" type="submit">
                <i aria-hidden="true" class="ri-play-line text-[14px]" />
                Tester
              </button>
            </div>
          </div>
        </form>
      </section>

      <div class="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside class="overflow-hidden rounded-[6px] border border-[#e5e5e5] lg:sticky lg:top-4 lg:max-h-[calc(100dvh-32px)] lg:self-start lg:overflow-y-auto">
          <div class="border-b border-[#e5e5e5] bg-[#f6f6f6] p-3">
            <label class="text-[11px] text-[#666666]" for="test-category">Catégorie</label>
            <select id="test-category" v-model="category" class="mt-1 h-8 w-full rounded-[6px] border border-[#e5e5e5] bg-white px-2 text-[12px] outline-none focus:border-[#000091]">
              <option v-for="item in categories" :key="item">{{ item }}</option>
            </select>
          </div>
          <button v-for="scenario in filteredScenarios" :key="scenario.id" class="flex w-full items-start gap-2.5 border-b border-[#eeeeee] p-3 text-left last:border-b-0 hover:bg-[#f6f6f6]" :class="activeScenario?.id === scenario.id ? 'bg-[#ececfe]' : 'bg-white'" type="button" @click="activeId = scenario.id">
            <i aria-hidden="true" class="mt-0.5 shrink-0 text-[14px]" :class="[statusIcons[resultFor(scenario.id).status], statusTextClass(resultFor(scenario.id).status)]" />
            <span class="min-w-0">
              <span class="block text-[10px] uppercase tracking-[0.04em] text-[#777777]">{{ scenario.category }}</span>
              <span class="mt-0.5 block text-[12px] font-medium leading-4">{{ scenario.title }}</span>
            </span>
          </button>
        </aside>

        <section v-if="activeScenario" class="overflow-hidden rounded-[6px] border border-[#e5e5e5]">
          <header class="border-b border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3">
            <p class="text-[10px] uppercase tracking-[0.06em] text-[#666666]">{{ activeScenario.category }}</p>
            <h2 class="mt-1 text-[18px] font-semibold">{{ activeScenario.title }}</h2>
          </header>
          <div class="space-y-6 p-4 sm:p-6">
            <section class="text-[13px] leading-6">
              <h3 class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#666666]">Objectif</h3>
              <p class="mt-1">{{ activeScenario.objective }}</p>
            </section>

            <section class="text-[13px] leading-6">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#666666]">Prompt à utiliser</h3>
                <button class="inline-flex items-center gap-1 text-[11px] text-[#000091] underline underline-offset-2" type="button" @click="copyPrompt">
                  <i aria-hidden="true" :class="copied ? 'ri-checkbox-circle-line' : 'ri-file-copy-line'" class="text-[14px]" />
                  {{ copied ? "Copié" : "Copier" }}
                </button>
              </div>
              <p class="mt-2 rounded-[2px] border-l-4 border-[#000091] bg-[#ececfe] px-4 py-3 text-[13px] leading-5">{{ activeScenario.prompt }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button class="inline-flex items-center gap-1 text-[11px] text-[#000091] underline underline-offset-2" type="button" @click="useScenarioPrompt">
                  <i aria-hidden="true" class="ri-edit-line text-[14px]" />
                  Modifier dans le banc d’essai
                </button>
                <NuxtLink class="inline-flex items-center gap-1 text-[11px] text-[#000091] underline underline-offset-2" target="_blank" :to="laboratoryRoute(activeScenario.prompt)">
                  Tester ce prompt
                  <i aria-hidden="true" class="ri-external-link-line text-[14px]" />
                </NuxtLink>
              </div>
            </section>

            <section class="text-[13px] leading-6">
              <h3 class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#666666]">Résultat attendu</h3>
              <p class="mt-1">{{ activeScenario.expected }}</p>
              <ul class="mt-3 space-y-2">
                <li v-for="criterion in activeScenario.criteria" :key="criterion" class="flex gap-2">
                  <span aria-hidden="true" class="mt-[9px] size-1 shrink-0 rounded-full bg-[#929292]" />
                  <span>{{ criterion }}</span>
                </li>
              </ul>
            </section>

            <section class="border-t border-[#e5e5e5] pt-5">
              <h3 class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#666666]">Résultat du test</h3>
              <div class="mt-3 flex flex-wrap gap-2">
                <button v-for="(label, status) in statusLabels" :key="status" class="h-8 rounded-[6px] border px-2.5 text-[12px] font-medium" :class="statusClasses(status, resultFor(activeScenario.id).status === status)" type="button" @click="updateResult(activeScenario.id, { status })">
                  {{ label }}
                </button>
              </div>
              <label class="mt-4 block">
                <span class="text-[11px] text-[#666666]">Observations et étapes de reproduction</span>
                <textarea :value="resultFor(activeScenario.id).notes" class="mt-2 h-36 w-full resize-y rounded-[6px] border border-[#e5e5e5] p-3 text-[13px] leading-5 outline-none focus:border-[#000091]" placeholder="Décrivez ce qui s’est réellement passé…" @input="updateResult(activeScenario.id, { notes: ($event.target as HTMLTextAreaElement).value })" />
              </label>
              <p v-if="resultFor(activeScenario.id).testedAt" class="mt-2 text-[11px] text-[#777777]">
                Dernière évaluation : {{ new Date(resultFor(activeScenario.id).testedAt!).toLocaleString('fr-FR') }}
              </p>
            </section>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
