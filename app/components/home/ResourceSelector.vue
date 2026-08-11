<script setup lang="ts">
import type {
  DatagouvDatasetChoice,
  DatagouvResourceChoice,
  ExplorationResource,
} from "~~/shared/data/exploration-resources";

const props = defineProps<{ resources: ExplorationResource[] }>();

const selectedResource = ref<ExplorationResource | null>(props.resources[0] ?? null);
const selectedDataset = ref<DatagouvDatasetChoice | null>(null);
const query = ref("");
const link = ref("");
const results = ref<DatagouvDatasetChoice[]>([]);
const error = ref("");
const isSearching = ref(false);
const isResolving = ref(false);

function chooseExample(resource: ExplorationResource) {
  selectedDataset.value = null;
  selectedResource.value = resource;
  error.value = "";
}

function chooseDataset(dataset: DatagouvDatasetChoice) {
  selectedDataset.value = dataset;
  results.value = [];
  chooseDatasetResource(dataset.resources[0]!);
  error.value = "";
}

function chooseDatasetResource(resource: DatagouvResourceChoice) {
  const dataset = selectedDataset.value;
  if (!dataset) return;
  selectedResource.value = {
    id: resource.id,
    datasetReference: dataset.slug || dataset.id,
    title: dataset.title,
    organization: dataset.organization,
    parquetUrl: resource.parquetUrl,
    resourceName: resource.title,
  };
}

function errorMessage(reason: unknown, fallback: string) {
  if (reason && typeof reason === "object" && "statusMessage" in reason) {
    const message = reason.statusMessage;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

async function search() {
  if (query.value.trim().length < 2) {
    error.value = "Saisissez au moins deux caractères.";
    return;
  }
  isSearching.value = true;
  error.value = "";
  try {
    const response = await $fetch<{ datasets: DatagouvDatasetChoice[] }>(
      "/nuxt-api/datasets/search",
      { query: { q: query.value.trim() } },
    );
    results.value = response.datasets;
    if (results.value.length === 0) {
      error.value = "Aucun jeu de données avec une ressource Parquet disponible n’a été trouvé.";
    }
  } catch (reason) {
    error.value = errorMessage(reason, "La recherche data.gouv.fr est momentanément indisponible.");
  } finally {
    isSearching.value = false;
  }
}

async function resolveLink() {
  if (!link.value.trim()) {
    error.value = "Collez le lien d’un jeu de données.";
    return;
  }
  isResolving.value = true;
  error.value = "";
  try {
    const response = await $fetch<{ dataset: DatagouvDatasetChoice }>(
      "/nuxt-api/datasets/resolve",
      { query: { input: link.value.trim() } },
    );
    chooseDataset(response.dataset);
  } catch (reason) {
    error.value = errorMessage(reason, "Le lien ne correspond pas à un jeu de données data.gouv.fr accessible.");
  } finally {
    isResolving.value = false;
  }
}

const exploreRoute = computed(() => selectedResource.value
  ? {
      path: "/laboratoire/exploration",
      query: {
        resource: selectedResource.value.id,
        dataset: selectedResource.value.datasetReference,
        parquet: selectedResource.value.parquetUrl,
        title: selectedResource.value.title,
        organization: selectedResource.value.organization,
        resourceName: selectedResource.value.resourceName,
      },
    }
  : undefined);
</script>

<template>
  <section aria-labelledby="choose-dataset" class="border-t border-[#e5e5e5] pt-8">
    <div class="mb-6 max-w-2xl">
      <h2 id="choose-dataset" class="text-2xl font-bold leading-8">Choisissez un jeu de données</h2>
      <p class="mt-2 text-[14px] leading-6 text-[#555555]">
        Les fichiers Parquet et les fichiers convertis automatiquement par data.gouv.fr sont chargés directement dans votre navigateur.
      </p>
    </div>

    <h3 class="mb-3 text-[14px] font-bold">Quelques jeux de données pour commencer</h3>
    <div class="grid gap-2">
      <button
        v-for="resource in resources"
        :key="resource.id"
        :aria-pressed="selectedResource?.id === resource.id && !selectedDataset"
        class="agent-focusable agent-pressable group flex w-full items-center gap-3 rounded-md border bg-white px-3 py-2.5 text-left"
        :class="selectedResource?.id === resource.id && !selectedDataset ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5] hover:border-[#777777]'"
        type="button"
        @click="chooseExample(resource)"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[13px]" :class="selectedResource?.id === resource.id && !selectedDataset ? 'border-[#000091] bg-[#000091] text-white' : 'border-[#e5e5e5] bg-[#f6f6f6] text-[#555555]'">
          <i :class="selectedResource?.id === resource.id && !selectedDataset ? 'ri-check-line' : 'ri-table-line'" />
        </span>
        <span class="min-w-0 flex-1">
          <strong class="block truncate text-[13px] font-semibold leading-5">{{ resource.title }}</strong>
          <span class="block truncate text-[11px] leading-4 text-[#555555]">{{ resource.organization }}</span>
        </span>
      </button>
    </div>

    <div class="my-7 flex items-center gap-3 text-[12px] font-medium text-[#777777]">
      <span class="h-px flex-1 bg-[#e5e5e5]" />
      ou choisissez un autre jeu de données
      <span class="h-px flex-1 bg-[#e5e5e5]" />
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <form class="space-y-2" @submit.prevent="search">
        <label for="dataset-search" class="block text-[13px] font-bold">Rechercher sur data.gouv.fr</label>
        <div class="flex min-h-10 border-b-2 border-[#000091] bg-[#eeeeee]">
          <i aria-hidden="true" class="ri-search-line ml-3 mt-3 text-base text-[#555555]" />
          <input id="dataset-search" v-model="query" class="min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-[#777777]" placeholder="Nom du jeu de données" type="search">
          <button class="agent-focusable inline-flex items-center gap-2 bg-[#000091] px-4 text-[12px] font-medium text-white disabled:opacity-60" :disabled="isSearching" type="submit">
            <i v-if="isSearching" aria-hidden="true" class="ri-loader-4-line animate-spin" />
            Rechercher
          </button>
        </div>
      </form>

      <form class="space-y-2" @submit.prevent="resolveLink">
        <label for="dataset-link" class="block text-[13px] font-bold">Coller le lien d’un jeu de données</label>
        <div class="flex min-h-10 border-b-2 border-[#000091] bg-[#eeeeee]">
          <i aria-hidden="true" class="ri-link ml-3 mt-3 text-base text-[#555555]" />
          <input id="dataset-link" v-model="link" class="min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-[#777777]" placeholder="https://www.data.gouv.fr/datasets/..." type="url">
          <button class="agent-focusable inline-flex items-center gap-2 bg-[#000091] px-4 text-[12px] font-medium text-white disabled:opacity-60" :disabled="isResolving" type="submit">
            <i v-if="isResolving" aria-hidden="true" class="ri-loader-4-line animate-spin" />
            Vérifier
          </button>
        </div>
      </form>
    </div>

    <p v-if="error" role="alert" class="mt-3 border-l-2 border-[#ce0500] bg-[#fef4f4] px-3 py-2 text-[12px] text-[#ce0500]">{{ error }}</p>

    <div v-if="results.length" class="mt-4 divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
      <button v-for="dataset in results" :key="dataset.id" class="agent-focusable flex w-full items-center justify-between gap-4 px-2 py-3 text-left hover:bg-[#f6f6f6]" type="button" @click="chooseDataset(dataset)">
        <span class="min-w-0">
          <strong class="block truncate text-[13px] font-semibold">{{ dataset.title }}</strong>
          <span class="block truncate text-[11px] text-[#555555]">{{ dataset.organization }} · {{ dataset.resources.length }} ressource{{ dataset.resources.length > 1 ? "s" : "" }} compatible{{ dataset.resources.length > 1 ? "s" : "" }}</span>
        </span>
        <i aria-hidden="true" class="ri-arrow-right-line shrink-0 text-base text-[#000091]" />
      </button>
    </div>

    <div v-if="selectedDataset && selectedDataset.resources.length > 1" class="mt-5">
      <p class="mb-2 text-[12px] font-medium text-[#555555]">Choisissez la ressource à explorer</p>
      <div class="flex flex-wrap gap-1.5">
        <button v-for="resource in selectedDataset.resources" :key="resource.id" class="agent-focusable rounded-md border px-2 py-1 text-[11px]" :class="selectedResource?.id === resource.id ? 'border-[#000091] bg-[#f5f5fe] text-[#000091]' : 'border-[#e5e5e5] bg-white hover:border-[#777777]'" type="button" @click="chooseDatasetResource(resource)">
          {{ resource.title }}
        </button>
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-3 border-t border-[#e5e5e5] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p class="min-h-5 min-w-0 truncate text-[12px] text-[#555555]">
        <template v-if="selectedResource"><strong class="text-[#161616]">{{ selectedResource.title }}</strong> · {{ selectedResource.resourceName ?? selectedResource.organization }}</template>
        <template v-else>Sélectionnez un jeu de données pour continuer.</template>
      </p>
      <NuxtLink v-if="exploreRoute" class="agent-focusable agent-pressable inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white hover:bg-[#1212ff]" :to="exploreRoute">
        Explorer ce jeu de données
        <i aria-hidden="true" class="ri-arrow-right-line text-sm" />
      </NuxtLink>
    </div>
  </section>
</template>
