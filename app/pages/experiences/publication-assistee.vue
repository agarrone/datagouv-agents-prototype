<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { explorationResources, type ExplorationResource } from "~~/shared/data/exploration-resources";
import { nextPublicationStage, publicationWorkflow, type PublicationStageId } from "~~/shared/agents/publication-workflow";
import { DEFAULT_AGENT_MODEL_ID, type AgentModelId } from "~~/shared/agents/models";
import type {
  PublicationAgentTool,
  PublicationAssistantMessage,
  PublicationPromptSuggestion,
  PublicationRecommendation,
} from "~~/shared/types/publication";

type PublicationDraft = {
  title: string;
  acronym: string;
  description: string;
  shortDescription: string;
  organization: string;
  license: string;
  frequency: string;
  spatialCoverage: string;
  temporalStart: string;
  temporalEnd: string;
  spatialGranularity: string;
  tags: string[];
};

type PreparedFile = {
  resource: ExplorationResource;
  fileName: string;
  format: string;
  size: string;
  description: string;
  uploaded?: boolean;
};

const preparedFiles: PreparedFile[] = [
  {
    resource: explorationResources.find(item => item.id === "festivals-france")!,
    fileName: "liste-des-festivals.csv",
    format: "CSV",
    size: "5,2 Mo",
    description: "Localisation, programmation et caractéristiques des festivals en France.",
  },
  {
    resource: explorationResources.find(item => item.id === "repertoire-elus")!,
    fileName: "repertoire-national-des-elus.csv",
    format: "CSV",
    size: "12,4 Mo",
    description: "Mandats et informations publiques relatives aux élus français.",
  },
  {
    resource: explorationResources.find(item => item.id === "carte-loyers")!,
    fileName: "indicateurs-loyers-communes.csv",
    format: "CSV",
    size: "3,8 Mo",
    description: "Indicateurs de loyers d’annonce par commune.",
  },
];

const steps = [
  { title: "Choisir un fichier", short: "Fichier" },
  { title: "Renseigner les métadonnées", short: "Métadonnées" },
  { title: "Vérifier et publier", short: "Vérification" },
];

const step = ref(0);
const selectedModelId = ref<AgentModelId>(DEFAULT_AGENT_MODEL_ID);
const assistantMetadataStage = ref<PublicationStageId>("identity");
const selectedFileId = ref<string>();
const uploadedFile = ref<{ metadata: PreparedFile; file: File }>();
const fileInput = ref<HTMLInputElement>();
const analyzing = ref(false);
const analysisStage = ref(0);
const analysisError = ref("");
const schemaSummary = ref<{ rowCount: number; columns: number }>();
const published = ref(false);
const dataset = useDatasetEngine();
const draft = reactive<PublicationDraft>({
  title: "",
  acronym: "",
  description: "",
  shortDescription: "",
  organization: "",
  license: "",
  frequency: "",
  spatialCoverage: "",
  temporalStart: "",
  temporalEnd: "",
  spatialGranularity: "",
  tags: [],
});

const publicationContext = computed(() => {
  const file = selectedFile.value;
  const schema = dataset.schema.value;
  if (!file || !schema) return null;
  return {
    step: step.value,
    fileName: file.fileName,
    format: file.format,
    resourceTitle: file.resource.title,
    organization: file.resource.organization,
    schema: {
      rowCount: schema.rowCount,
      columns: schema.columns,
      sample: schema.sample,
    },
    draft: { ...draft, tags: [...draft.tags] },
  };
});

const {
  addToolOutput,
  clearError,
  error: agentError,
  messages,
  regenerate,
  sendMessage,
  status: agentStatus,
  stop: stopAgent,
} = useChat<PublicationAssistantMessage>({
  transport: new DefaultChatTransport({
    api: "/nuxt-api/agents/publication",
    prepareSendMessagesRequest({ id, messages, trigger, messageId }) {
      if (!publicationContext.value) throw new Error("Le fichier doit être analysé avant d’interroger l’assistant.");
      return {
        body: {
          id,
          messages,
          trigger,
          messageId,
          modelId: selectedModelId.value,
          context: publicationContext.value,
        },
      };
    },
  }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
});
const agentBusy = computed(() => analyzing.value || agentStatus.value === "submitted" || agentStatus.value === "streaming");
const tagInput = ref("");
const descriptionTextarea = ref<HTMLTextAreaElement>();
const markdownActions = [
  { icon: "ri-bold", label: "Gras", before: "**", after: "**", fallback: "texte important" },
  { icon: "ri-italic", label: "Italique", before: "_", after: "_", fallback: "précision" },
  { icon: "ri-list-unordered", label: "Liste", before: "- ", after: "", fallback: "élément" },
  { icon: "ri-link", label: "Lien", before: "[", after: "](https://)", fallback: "intitulé du lien" },
];

const selectedFile = computed(() => {
  const upload = uploadedFile.value;
  if (upload && upload.metadata.resource.id === selectedFileId.value) return upload.metadata;
  return preparedFiles.find(file => file.resource.id === selectedFileId.value);
});
const stepLabel = computed(() => `Étape ${step.value + 1} sur ${steps.length} · ${steps[step.value]?.title}`);
const assistantStageLabel = computed(() => publicationWorkflow[assistantMetadataStage.value].label);

const publicationPromptSuggestions = computed<Record<PublicationPromptSuggestion["stage"], PublicationPromptSuggestion[]>>(() => ({
  identity: [{
    id: "suggest-identity",
    label: "Proposer un titre et un acronyme",
    stage: "identity",
    prompt: "À partir du schéma du fichier, propose uniquement un titre précis pour ce jeu de données et, seulement s’il est pertinent, un acronyme.",
  }],
  description: [{
    id: "suggest-description",
    label: "Générer une description",
    stage: "description",
    prompt: "À partir du schéma, du titre et des informations déjà saisies, propose uniquement une description détaillée et vérifiable du jeu de données.",
  }],
  "short-description": [{
    id: "suggest-short-description",
    label: "Générer une description courte",
    stage: "short-description",
    prompt: "À partir du titre et de la description détaillée déjà saisis, propose uniquement une description courte d’une ou deux phrases.",
    disabled: !draft.title.trim() || draft.description.trim().length < 200,
    hint: "Renseignez un titre et une description d’au moins 200 caractères pour générer une description courte.",
  }],
  keywords: [{
    id: "suggest-keywords",
    label: "Suggérer des mots-clés",
    stage: "keywords",
    prompt: "À partir du schéma et des descriptions déjà saisies, propose uniquement des mots-clés utiles à la découverte de ce jeu de données.",
  }],
  license: [{
    id: "suggest-license",
    label: "Recommander une licence",
    stage: "license",
    prompt: "Recommande uniquement une licence adaptée à cette publication et explique brièvement ce que je dois confirmer avant de l’appliquer.",
  }],
  temporal: [{
    id: "suggest-temporal",
    label: "Proposer les informations temporelles",
    stage: "temporal",
    prompt: "À partir du schéma et des métadonnées saisies, propose uniquement une fréquence de mise à jour et une couverture temporelle, en signalant ce qui doit être confirmé.",
  }],
  spatial: [{
    id: "suggest-spatial",
    label: "Proposer les informations spatiales",
    stage: "spatial",
    prompt: "À partir du schéma et des métadonnées saisies, propose uniquement une couverture et une granularité spatiales, en signalant ce qui doit être confirmé.",
  }],
  complete: [{
    id: "review-metadata",
    label: "Vérifier les métadonnées",
    stage: "complete",
    prompt: "Relis les métadonnées actuellement saisies et indique uniquement les informations manquantes, ambiguës ou à confirmer avant la publication.",
  }],
}));
const activePromptSuggestions = computed(() => publicationPromptSuggestions.value[assistantMetadataStage.value]);
const agentStepLabel = computed(() => step.value === 1
  ? `${stepLabel.value} · ${assistantStageLabel.value}`
  : stepLabel.value);
const temporalRangeInvalid = computed(() => Boolean(
  draft.temporalStart
  && draft.temporalEnd
  && draft.temporalEnd < draft.temporalStart,
));
const analysisChecks = [
  "Fichier sélectionné",
  "Lecture du format tabulaire",
  "Détection des colonnes et des types",
  "Analyse de la structure des données",
  "Préparation des recommandations",
];
const analysisProgress = computed(() => schemaSummary.value
  ? 100
  : analyzing.value
    ? Math.max(20, analysisStage.value * 20)
    : 0);
const canContinue = computed(() => {
  if (step.value === 0) return Boolean(selectedFile.value && schemaSummary.value && !analyzing.value);
  if (step.value === 1) return Boolean(
    draft.title.trim()
    && draft.description.trim()
    && draft.organization.trim()
    && draft.frequency
    && !temporalRangeInvalid.value,
  );
  return true;
});

const agentContext = computed(() => {
  if (!selectedFile.value) return "Aucun fichier n’est encore sélectionné. Je peux expliquer les critères utiles pour choisir une ressource à publier.";
  if (analyzing.value) return `J’analyse ${selectedFile.value.fileName} afin d’identifier sa structure et de préparer le parcours.`;
  if (step.value === 0 && schemaSummary.value) return `Le fichier ${selectedFile.value.fileName} contient ${schemaSummary.value.rowCount.toLocaleString("fr-FR")} lignes et ${schemaSummary.value.columns} colonnes.`;
  if (step.value === 1) return `Étape actuelle : ${assistantStageLabel.value}. Je vous aide progressivement à décrire et documenter « ${draft.title || selectedFile.value.resource.title} ».`;
  return "Je relis la publication et signale les informations manquantes avant la simulation de mise en ligne.";
});

const recommendations = computed<PublicationRecommendation[]>(() => {
  const file = selectedFile.value;
  if (!file) return [{
    id: "choose-tabular",
    title: "Commencez par un fichier tabulaire",
    description: "Dans cette expérience, les trois fichiers sont déjà préparés : aucune donnée n’est réellement transférée.",
  }];
  if (step.value === 0) return [{
    id: "schema-ready",
    title: schemaSummary.value ? "Structure exploitable" : "Analyser avant de continuer",
    description: schemaSummary.value
      ? `${schemaSummary.value.columns} colonnes détectées. Le fichier peut être documenté dans l’étape suivante.`
      : "L’analyse locale permet de compter les lignes et de détecter les colonnes avant toute publication.",
  }];
  if (step.value === 1) return [
    {
      id: "agent-description",
      title: "Suggestions fondées sur le fichier",
      description: "L’assistant utilise le schéma et les valeurs déjà saisies pour proposer les différents groupes de métadonnées. Rien n’est appliqué sans votre validation ; la fréquence, la licence et les couvertures restent à confirmer.",
    },
  ];
  const missing = [
    !draft.license && "la licence",
    !draft.frequency && "la fréquence",
    !draft.spatialCoverage && "la couverture géographique",
    !draft.spatialGranularity && "la granularité spatiale",
    draft.tags.length === 0 && "les mots-clés",
  ].filter(Boolean);
  return [{
    id: "final-review",
    title: missing.length ? "Informations à compléter" : "Publication prête à être simulée",
    description: missing.length
      ? `Vérifiez encore ${missing.join(", ")}.`
      : "Le fichier, la description et les principales métadonnées sont renseignés. Aucune donnée ne sera réellement publiée.",
  }];
});

const activeTool = computed<PublicationAgentTool>(() => {
  if (step.value === 0) {
    return {
      id: "inspect_schema",
      label: "Inspecter le fichier",
      description: "Lit la structure du fichier, détecte ses colonnes et mesure son volume avant de préparer la publication.",
      status: analyzing.value ? "running" : schemaSummary.value ? "completed" : "available",
    };
  }
  if (step.value === 1) {
    return {
      id: "draft_metadata",
      label: "Proposer les métadonnées",
      description: "S’appuie sur le schéma et le brouillon pour proposer le titre, les descriptions, les mots-clés, la licence et les informations temporelles et spatiales.",
      status: canContinue.value ? "completed" : "available",
    };
  }
  return {
    id: "review_publication",
    label: "Contrôler la publication",
    description: "Vérifie la complétude et la cohérence des informations avant que l’utilisateur confirme la publication.",
    status: "completed",
  };
});

function initializeDraft(file: PreparedFile) {
  draft.title = file.resource.title;
  draft.acronym = "";
  draft.description = "";
  draft.shortDescription = "";
  draft.organization = file.uploaded ? "" : file.resource.organization;
  draft.license = "";
  draft.frequency = "";
  draft.spatialCoverage = "";
  draft.temporalStart = "";
  draft.temporalEnd = "";
  draft.spatialGranularity = "";
  draft.tags = [];
  tagInput.value = "";
  stopAgent();
  messages.value = [];
  assistantMetadataStage.value = "identity";
}

async function selectFile(file: PreparedFile) {
  uploadedFile.value = undefined;
  await analyzeSelectedFile(file);
}

async function analyzeSelectedFile(file: PreparedFile, localFile?: File) {
  selectedFileId.value = file.resource.id;
  analysisStage.value = 1;
  schemaSummary.value = undefined;
  analysisError.value = "";
  initializeDraft(file);
  analyzing.value = true;
  try {
    await nextTick();
    analysisStage.value = 2;
    const schema = localFile
      ? await dataset.loadFile(localFile, file.resource)
      : await dataset.load(file.resource);
    schemaSummary.value = {
      rowCount: schema.rowCount,
      columns: schema.columns.length,
    };
    analysisStage.value = analysisChecks.length;
  }
  catch (reason) {
    analysisError.value = reason instanceof Error ? reason.message : "Le fichier n’a pas pu être analysé.";
  }
  finally {
    analyzing.value = false;
  }
}

function formattedFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} Mo`;
}

async function uploadLocalFile(file: File) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase() ?? "";
  if (!new Set(["csv", "parquet"]).has(extension)) {
    analysisError.value = "Sélectionnez un fichier CSV ou Parquet.";
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    analysisError.value = "Dans ce prototype, la taille du fichier est limitée à 100 Mo.";
    return;
  }
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  const id = `upload-${crypto.randomUUID()}`;
  const metadata: PreparedFile = {
    resource: {
      id,
      datasetReference: id,
      title: baseName || "Nouveau jeu de données",
      organization: "Producteur à renseigner",
      parquetUrl: `local://${encodeURIComponent(file.name)}`,
      resourceName: file.name,
    },
    fileName: file.name,
    format: extension.toUpperCase(),
    size: formattedFileSize(file.size),
    description: "Fichier local sélectionné depuis votre appareil.",
    uploaded: true,
  };
  uploadedFile.value = { metadata, file };
  await analyzeSelectedFile(metadata, file);
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) uploadLocalFile(file);
  input.value = "";
}

function onFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (file) uploadLocalFile(file);
}

function addTag() {
  const value = tagInput.value.trim();
  if (!value || draft.tags.includes(value)) return;
  draft.tags.push(value);
  tagInput.value = "";
}

async function applyMarkdown(action: typeof markdownActions[number]) {
  const textarea = descriptionTextarea.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = draft.description.slice(start, end) || action.fallback;
  draft.description = `${draft.description.slice(0, start)}${action.before}${selected}${action.after}${draft.description.slice(end)}`;
  await nextTick();
  textarea.focus();
  textarea.setSelectionRange(
    start + action.before.length,
    start + action.before.length + selected.length,
  );
}

function askAgent(question: string) {
  if (!publicationContext.value || agentBusy.value) return;
  sendMessage({ text: question });
}

function requestAgentSuggestion(suggestion: PublicationPromptSuggestion) {
  if (suggestion.disabled || agentBusy.value) return;
  assistantMetadataStage.value = suggestion.stage;
  askAgent(suggestion.prompt);
}

async function resolveAgentClarification(toolCallId: string, choice: string) {
  clearError();
  await addToolOutput({
    tool: "request_publication_clarification",
    toolCallId,
    output: { choice },
  });
}

function retryAgentResponse() {
  clearError();
  regenerate();
}

function advanceAssistantStage(stage: PublicationStageId) {
  const next = nextPublicationStage(stage);
  if (next) assistantMetadataStage.value = next;
}

function applyAgentSuggestion(tool: string, suggestion: Record<string, unknown>) {
  if (tool === "suggest_identity") {
    if (typeof suggestion.title === "string") draft.title = suggestion.title;
    if (typeof suggestion.acronym === "string") draft.acronym = suggestion.acronym;
    if (draft.title.trim()) advanceAssistantStage("identity");
  }
  if (tool === "suggest_descriptions") {
    if (typeof suggestion.description === "string") draft.description = suggestion.description;
    if (typeof suggestion.shortDescription === "string" && suggestion.shortDescription) draft.shortDescription = suggestion.shortDescription;
    if (!draft.shortDescription && draft.description.length >= 200) {
      assistantMetadataStage.value = "short-description";
    }
    else if (draft.shortDescription) {
      advanceAssistantStage("short-description");
    }
  }
  if (tool === "suggest_keywords" && Array.isArray(suggestion.tags)) {
    draft.tags = suggestion.tags.filter((tag): tag is string => typeof tag === "string");
    if (draft.tags.length) advanceAssistantStage("keywords");
  }
  if (tool === "suggest_license" && typeof suggestion.license === "string") {
    const normalized = suggestion.license.toLocaleLowerCase("fr-FR");
    draft.license = normalized.includes("ouverte") ? "lov2" : normalized.includes("odbl") ? "odbl" : "other";
    advanceAssistantStage("license");
  }
  if (tool === "suggest_temporal_metadata") {
    const mappings: Array<[keyof PublicationDraft, string]> = [
      ["frequency", "frequency"], ["temporalStart", "temporalStart"], ["temporalEnd", "temporalEnd"],
    ];
    for (const [field, key] of mappings) {
      const value = suggestion[key];
      if (typeof value !== "string" || !value) continue;
      const normalized = value.toLocaleLowerCase("fr-FR");
      if (field === "frequency") {
        const frequency = ["quotidienne", "mensuelle", "trimestrielle", "annuelle", "ponctuelle"]
          .find(item => normalized.includes(item));
        if (frequency) draft.frequency = frequency;
      }
      else {
        (draft[field] as string | string[]) = value;
      }
    }
    advanceAssistantStage("temporal");
  }
  if (tool === "suggest_spatial_metadata") {
    if (typeof suggestion.spatialCoverage === "string") draft.spatialCoverage = suggestion.spatialCoverage;
    if (typeof suggestion.spatialGranularity === "string") draft.spatialGranularity = suggestion.spatialGranularity;
    advanceAssistantStage("spatial");
  }
}

async function nextStep() {
  if (!canContinue.value || step.value >= steps.length - 1) return;
  step.value += 1;
  window.scrollTo({ top: 0, behavior: "smooth" });
  await nextTick();
}

function previousStep() {
  if (step.value === 0) return;
  step.value -= 1;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function simulatePublication() {
  published.value = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

useSeoMeta({
  title: "Publication assistée — Expérience",
  description: "Parcours expérimental non référencé de publication de données assistée par IA.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <main class="min-h-dvh bg-[#f6f6f6] text-[#161616]">
    <header class="border-b border-[#e5e5e5] bg-white">
      <div class="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-10">
        <NuxtLink class="inline-flex items-center gap-1.5 text-[12px] text-[#000091] underline underline-offset-4" to="/">
          <i aria-hidden="true" class="ri-arrow-left-line text-[14px]" />
          Retour à l’accueil
        </NuxtLink>
        <p class="mt-7 text-[11px] font-medium uppercase tracking-[0.06em] text-[#000091]">Expérience non référencée</p>
        <h1 class="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Publier des données avec un assistant</h1>
        <p class="mt-3 max-w-3xl text-[14px] leading-6 text-[#555555]">Une exploration du parcours data.gouv.fr avec un agent unique qui conserve le contexte, mobilise le bon outil à chaque étape, recommande et laisse l’utilisateur décider.</p>
      </div>
    </header>

    <div class="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-10">
      <section v-if="published" class="rounded-md border border-[#b8fec9] bg-[#e3fdeb] p-5">
        <div class="flex items-start gap-3">
          <i aria-hidden="true" class="ri-checkbox-circle-line text-[20px] text-[#18753c]" />
          <div>
            <h2 class="text-[15px] font-semibold text-[#18753c]">Publication simulée</h2>
            <p class="mt-1 text-[13px] leading-5 text-[#555555]">Le parcours est terminé. Aucun fichier ni métadonnée n’a été envoyé à data.gouv.fr.</p>
            <button class="agent-focusable mt-3 h-7 rounded-md border border-[#18753c] px-2.5 text-[11px] font-medium text-[#18753c]" type="button" @click="published = false; step = 0">Recommencer</button>
          </div>
        </div>
      </section>

      <template v-else>
        <nav aria-label="Progression de la publication" class="mb-7">
          <p class="text-[13px] text-[#555555]">Étape {{ step + 1 }} sur {{ steps.length }}</p>
          <h2 class="mt-2 text-[24px] font-bold leading-8">{{ steps[step]?.title }}</h2>
          <ol class="mt-4 grid grid-cols-3 gap-1.5" aria-label="Étapes de publication">
            <li v-for="(item, index) in steps" :key="item.short" class="h-2" :class="index <= step ? 'bg-[#000091]' : 'bg-white'">
              <span class="sr-only">{{ item.title }} — {{ index < step ? 'terminée' : index === step ? 'en cours' : 'à venir' }}</span>
            </li>
          </ol>
          <p v-if="steps[step + 1]" class="mt-3 text-[12px] text-[#777777]"><strong class="font-semibold text-[#555555]">Étape suivante :</strong> {{ steps[step + 1]?.title }}</p>
          <p v-else class="mt-3 text-[12px] font-medium text-[#555555]">Dernière étape : vérifiez les informations avant de confirmer.</p>
        </nav>

        <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <section class="overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
            <div v-if="step === 0" class="p-5">
              <div
                class="rounded-md border border-dashed border-[#929292] bg-[#f6f6f6] px-5 py-9 text-center transition-colors hover:border-[#000091] hover:bg-[#f5f5fe]"
                @dragover.prevent
                @drop.prevent="onFileDrop"
              >
                <input ref="fileInput" accept=".csv,.parquet,text/csv,application/vnd.apache.parquet" class="sr-only" type="file" @change="onFileChange">
                <i aria-hidden="true" class="ri-upload-cloud-2-line text-[24px] text-[#000091]" />
                <h3 class="mt-2 text-[13px] font-semibold">Déposez un fichier tabulaire</h3>
                <p class="mt-1 text-[11px] leading-4 text-[#555555]">CSV ou Parquet, 100 Mo maximum. Le fichier reste dans le navigateur ; seuls son schéma et un aperçu de cinq lignes sont fournis à l’assistant.</p>
                <button class="agent-focusable mt-4 h-8 rounded-md border border-[#000091] bg-white px-3 text-[12px] font-medium text-[#000091]" type="button" @click="fileInput?.click()">Parcourir les fichiers</button>
              </div>

              <div class="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.05em] text-[#777777]"><span class="h-px flex-1 bg-[#e5e5e5]" /><span>ou utiliser un exemple</span><span class="h-px flex-1 bg-[#e5e5e5]" /></div>
              <div class="grid gap-3 lg:grid-cols-3">
                <button v-for="file in preparedFiles" :key="file.resource.id" class="agent-focusable rounded-md border p-4 text-left" :class="selectedFileId === file.resource.id ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5] bg-white hover:border-[#929292]'" type="button" @click="selectFile(file)">
                  <div class="flex items-start justify-between gap-3">
                    <i aria-hidden="true" class="ri-file-table-line text-[20px] text-[#555555]" />
                    <i v-if="selectedFileId === file.resource.id" aria-hidden="true" class="ri-checkbox-circle-line text-[16px] text-[#000091]" />
                  </div>
                  <h3 class="mt-3 break-words text-[12px] font-semibold leading-4">{{ file.fileName }}</h3>
                  <p class="mt-1 text-[11px] text-[#777777]">{{ file.format }} · {{ file.size }}</p>
                  <p class="mt-2 text-[11px] leading-4 text-[#555555]">{{ file.description }}</p>
                </button>
              </div>

              <div v-if="analyzing && selectedFile" class="mt-4 rounded-md border border-[#e5e5e5] bg-white p-4" role="status">
                <div class="flex items-center gap-2 border-b border-[#e5e5e5] pb-3">
                  <i aria-hidden="true" class="ri-file-table-line text-[16px] text-[#555555]" />
                  <div class="min-w-0 flex-1"><p class="truncate text-[12px] font-medium">{{ selectedFile.fileName }}</p><p class="text-[10px] text-[#777777]">{{ selectedFile.format }} · {{ selectedFile.size }}</p></div>
                  <span class="text-[11px] font-medium text-[#555555]">{{ analysisProgress }} %</span>
                </div>
                <div class="mt-3 h-1 overflow-hidden bg-[#e5e5e5]"><div class="h-full bg-[#000091] transition-[width] duration-300" :style="{ width: `${analysisProgress}%` }" /></div>
                <ul class="mt-3 space-y-1.5">
                  <li v-for="(check, index) in analysisChecks" :key="check" class="flex items-center gap-2 text-[11px]" :class="index < analysisStage ? 'text-[#555555]' : 'text-[#929292]'">
                    <i v-if="index < analysisStage" aria-hidden="true" class="ri-checkbox-circle-line text-[13px] text-[#18753c]" />
                    <span v-else-if="index === analysisStage" class="text-[#777777]"><ExplorationUnicodeSpinner name="dna" /></span>
                    <i v-else aria-hidden="true" class="ri-checkbox-blank-circle-line text-[12px]" />
                    <span>{{ check }}</span>
                  </li>
                </ul>
              </div>
              <ExplorationStatusMessage v-else-if="analysisError" class="mt-4" title="Analyse impossible" :message="analysisError" tone="error" />
              <div v-else-if="schemaSummary && selectedFile" class="mt-4 grid gap-px overflow-hidden rounded-md border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-3">
                <div class="bg-white p-3"><p class="text-[11px] text-[#555555]">Lignes</p><p class="mt-1 text-[15px] font-semibold">{{ schemaSummary.rowCount.toLocaleString('fr-FR') }}</p></div>
                <div class="bg-white p-3"><p class="text-[11px] text-[#555555]">Colonnes</p><p class="mt-1 text-[15px] font-semibold">{{ schemaSummary.columns }}</p></div>
                <div class="bg-white p-3"><p class="text-[11px] text-[#555555]">Format analysé</p><p class="mt-1 text-[15px] font-semibold">Parquet</p></div>
              </div>
            </div>

            <form v-else-if="step === 1" class="publication-form space-y-6 p-5" @submit.prevent="nextStep">
              <p class="text-[11px] font-bold uppercase tracking-[0.04em] text-[#555555]">Description</p>
              <section class="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                <label class="block"><span class="text-[12px] font-medium">Titre du jeu de données <span class="text-[#ce0500]">*</span></span><input v-model="draft.title" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#000091]" required></label>
                <label class="block"><span class="text-[12px] font-medium">Acronyme</span><input v-model="draft.acronym" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-[13px] uppercase outline-none focus:border-[#000091]" maxlength="20" placeholder="Ex. RNE"></label>
                <PublicationPromptSuggestions class="md:col-span-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions.identity" @select="requestAgentSuggestion" />
              </section>
              <section class="space-y-4 border-t border-[#e5e5e5] pt-5">
                <div>
                <label class="text-[12px] font-medium" for="publication-description">Description <span class="text-[#ce0500]">*</span></label>
                <div class="publication-markdown mt-1.5 overflow-hidden rounded-t-md border-b-2 border-[#3a3a3a] bg-[#eeeeee] focus-within:border-[#000091]">
                  <div class="flex h-9 items-center gap-0.5 border-b border-[#e5e5e5] bg-[#f6f6f6] px-2" aria-label="Mise en forme Markdown">
                    <button v-for="action in markdownActions" :key="action.label" class="agent-focusable flex size-7 items-center justify-center rounded-md text-[#555555] hover:bg-white" type="button" :aria-label="action.label" :title="`${action.label} — syntaxe Markdown`" @click="applyMarkdown(action)"><i aria-hidden="true" :class="[action.icon, 'text-[14px]']" /></button>
                    <span class="ml-auto text-[10px] text-[#777777]">Markdown</span>
                  </div>
                  <textarea id="publication-description" ref="descriptionTextarea" v-model="draft.description" class="h-40 w-full resize-y p-3 text-[13px] leading-6 outline-none" placeholder="Présentez le contenu, la granularité, la couverture et les limites…" required />
                </div>
                <PublicationPromptSuggestions class="mt-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions.description" @select="requestAgentSuggestion" />
                </div>
                <div><label class="block"><span class="text-[12px] font-medium">Description courte</span><span class="mt-0.5 block text-[11px] text-[#777777]">Une phrase concise utilisée dans les listes et résultats de recherche.</span><input v-model="draft.shortDescription" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#000091]" maxlength="280" placeholder="Résumez le contenu du jeu de données en une phrase"></label><PublicationPromptSuggestions class="mt-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions['short-description']" @select="requestAgentSuggestion" /></div>
              </section>
              <label class="block"><span class="text-[12px] font-medium">Organisation productrice <span class="text-[#ce0500]">*</span></span><input v-model="draft.organization" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#000091]" required></label>
              <section class="space-y-4 border-t border-[#e5e5e5] pt-5">
                <div><span class="text-[12px] font-medium">Mots-clés</span><div class="mt-1.5 flex gap-2"><input v-model="tagInput" class="h-10 min-w-0 flex-1 rounded-md border border-[#e5e5e5] px-3 text-[13px]" placeholder="Ajouter un mot-clé" @keydown.enter.prevent="addTag"><button class="h-10 rounded-md border border-[#000091] px-3 text-[12px] font-medium text-[#000091]" type="button" @click="addTag">Ajouter</button></div><div class="mt-2 flex flex-wrap gap-1.5"><button v-for="tag in draft.tags" :key="tag" class="inline-flex h-7 items-center gap-1 rounded-full border border-[#e5e5e5] bg-white px-2.5 text-[11px]" type="button" :aria-label="`Retirer ${tag}`" @click="draft.tags = draft.tags.filter(item => item !== tag)">{{ tag }}<i aria-hidden="true" class="ri-close-line text-[14px]" /></button></div><PublicationPromptSuggestions class="mt-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions.keywords" @select="requestAgentSuggestion" /></div>
              </section>
              <section class="border-t border-[#e5e5e5] pt-5">
                <label class="block"><span class="text-[12px] font-medium">Licence</span><select v-model="draft.license" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] bg-white px-3 text-[13px]"><option value="">Sélectionner une licence</option><option value="lov2">Licence Ouverte 2.0</option><option value="odbl">ODbL 1.0</option><option value="other">Autre licence</option><option value="unspecified">Licence non spécifiée</option></select></label><PublicationPromptSuggestions class="mt-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions.license" @select="requestAgentSuggestion" />
              </section>
              <section class="grid gap-4 border-t border-[#e5e5e5] pt-5 md:grid-cols-2">
                <label class="block"><span class="text-[12px] font-medium">Fréquence de mise à jour <span class="text-[#ce0500]">*</span></span><select v-model="draft.frequency" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] bg-white px-3 text-[13px]"><option value="" disabled>Sélectionner</option><option value="quotidienne">Quotidienne</option><option value="mensuelle">Mensuelle</option><option value="trimestrielle">Trimestrielle</option><option value="annuelle">Annuelle</option><option value="ponctuelle">Ponctuelle</option></select></label>
                <fieldset><legend class="text-[12px] font-medium">Couverture temporelle</legend><div class="mt-1.5 grid gap-3 sm:grid-cols-2"><label><span class="text-[11px] text-[#555555]">Début</span><input v-model="draft.temporalStart" class="mt-1 h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-[13px]" type="date"></label><label><span class="text-[11px] text-[#555555]">Fin</span><input v-model="draft.temporalEnd" class="mt-1 h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-[13px]" type="date"></label></div></fieldset>
                <p v-if="temporalRangeInvalid" class="text-[11px] text-[#ce0500] md:col-span-2" role="alert">La date de fin doit être postérieure à la date de début.</p>
                <PublicationPromptSuggestions class="md:col-span-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions.temporal" @select="requestAgentSuggestion" />
              </section>
              <section class="grid gap-4 border-t border-[#e5e5e5] pt-5 md:grid-cols-2">
                <label class="block"><span class="text-[12px] font-medium">Couverture spatiale</span><div class="relative mt-1.5"><i aria-hidden="true" class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#777777]" /><input v-model="draft.spatialCoverage" class="h-10 w-full rounded-md border border-[#e5e5e5] pl-9 pr-3 text-[13px]" placeholder="Rechercher un territoire ou un code Insee"></div></label>
                <label class="block"><span class="text-[12px] font-medium">Granularité spatiale</span><select v-model="draft.spatialGranularity" class="mt-1.5 h-10 w-full rounded-md border border-[#e5e5e5] bg-white px-3 text-[13px]"><option value="">Sélectionner une granularité</option><option value="nationale">Nationale</option><option value="regionale">Régionale</option><option value="departementale">Départementale</option><option value="intercommunale">Intercommunale</option><option value="communale">Communale</option><option value="adresse">Adresse</option><option value="autre">Autre</option></select></label>
                <PublicationPromptSuggestions class="md:col-span-2" :disabled="agentBusy" :suggestions="publicationPromptSuggestions.spatial" @select="requestAgentSuggestion" />
              </section>
            </form>

            <div v-else class="space-y-5 p-5">
              <section><h3 class="text-[12px] font-medium text-[#555555]">Fichier</h3><div class="mt-2 rounded-md border border-[#e5e5e5] bg-[#f6f6f6] p-3"><p class="text-[13px] font-semibold">{{ selectedFile?.fileName }}</p><p class="mt-1 text-[11px] text-[#555555]">{{ selectedFile?.format }} · {{ selectedFile?.size }} · {{ schemaSummary?.rowCount.toLocaleString('fr-FR') }} lignes</p></div></section>
              <section><h3 class="text-[12px] font-medium text-[#555555]">Jeu de données</h3><dl class="mt-2 grid gap-px overflow-hidden rounded-md border border-[#e5e5e5] bg-[#e5e5e5] md:grid-cols-2"><div class="bg-white p-3"><dt class="text-[11px] text-[#555555]">Titre</dt><dd class="mt-1 text-[13px] font-medium">{{ draft.title }}</dd></div><div class="bg-white p-3"><dt class="text-[11px] text-[#555555]">Acronyme</dt><dd class="mt-1 text-[13px] font-medium">{{ draft.acronym || 'Non renseigné' }}</dd></div><div class="bg-white p-3 md:col-span-2"><dt class="text-[11px] text-[#555555]">Description</dt><dd class="mt-1 whitespace-pre-line text-[13px] leading-5">{{ draft.description }}</dd></div><div class="bg-white p-3 md:col-span-2"><dt class="text-[11px] text-[#555555]">Description courte</dt><dd class="mt-1 text-[13px] leading-5">{{ draft.shortDescription || 'Non renseignée' }}</dd></div><div class="bg-white p-3 md:col-span-2"><dt class="text-[11px] text-[#555555]">Producteur</dt><dd class="mt-1 text-[13px] font-medium">{{ draft.organization }}</dd></div></dl></section>
              <section><h3 class="text-[12px] font-medium text-[#555555]">Documentation</h3><dl class="mt-2 grid gap-px overflow-hidden rounded-md border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-3"><div class="bg-white p-3"><dt class="text-[11px] text-[#555555]">Licence</dt><dd class="mt-1 text-[12px] font-medium">{{ draft.license === 'lov2' ? 'Licence Ouverte 2.0' : draft.license || 'Non renseignée' }}</dd></div><div class="bg-white p-3"><dt class="text-[11px] text-[#555555]">Mise à jour</dt><dd class="mt-1 text-[12px] font-medium capitalize">{{ draft.frequency }}</dd></div><div class="bg-white p-3"><dt class="text-[11px] text-[#555555]">Couverture spatiale</dt><dd class="mt-1 text-[12px] font-medium">{{ draft.spatialCoverage || 'Non renseignée' }}</dd></div><div class="bg-white p-3"><dt class="text-[11px] text-[#555555]">Granularité</dt><dd class="mt-1 text-[12px] font-medium capitalize">{{ draft.spatialGranularity || 'Non renseignée' }}</dd></div><div class="bg-white p-3 sm:col-span-2"><dt class="text-[11px] text-[#555555]">Couverture temporelle</dt><dd class="mt-1 text-[12px] font-medium">{{ draft.temporalStart || '—' }} → {{ draft.temporalEnd || '—' }}</dd></div></dl><div v-if="draft.tags.length" class="mt-2 flex flex-wrap gap-1.5"><span v-for="tag in draft.tags" :key="tag" class="rounded-full border border-[#e5e5e5] px-2.5 py-1 text-[11px]">{{ tag }}</span></div></section>
              <ExplorationStatusMessage title="Simulation uniquement" message="Le bouton final valide l’expérience mais ne crée aucun jeu de données et n’appelle pas l’API data.gouv.fr." tone="info" />
            </div>

            <footer class="flex items-center justify-between gap-3 border-t border-[#e5e5e5] bg-[#f6f6f6] px-5 py-3">
              <button class="agent-focusable h-8 rounded-md border border-[#000091] px-3 text-[12px] font-medium text-[#000091] disabled:invisible" :disabled="step === 0" type="button" @click="previousStep">Précédent</button>
              <button v-if="step < steps.length - 1" class="agent-focusable h-8 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:bg-[#929292]" :disabled="!canContinue" type="button" @click="nextStep">Continuer</button>
              <button v-else class="agent-focusable h-8 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white" type="button" @click="simulatePublication">Simuler la publication</button>
            </footer>
          </section>

          <PublicationAgentPanel v-model:model-id="selectedModelId" :busy="agentBusy" :context="agentContext" :error-message="agentError?.message" :messages="messages" :recommendations="recommendations" :resource-organization="selectedFile?.resource.organization" :resource-title="selectedFile?.resource.title" :step-label="agentStepLabel" :suggestions="step === 1 ? activePromptSuggestions : []" :tool="activeTool" @apply-suggestion="applyAgentSuggestion" @ask="askAgent" @clarify="resolveAgentClarification" @retry="retryAgentResponse" @select-suggestion="requestAgentSuggestion" @stop="stopAgent" />
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.publication-form :is(input:not([type="checkbox"]), select) {
  border: 0;
  border-bottom: 2px solid #3a3a3a;
  border-radius: 6px 6px 0 0;
  background-color: #eee;
  outline: none;
}

.publication-form :is(input:not([type="checkbox"]), select):focus {
  border-bottom-color: #000091;
  box-shadow: inset 0 -1px 0 #000091;
}

.publication-markdown textarea {
  background-color: #eee;
}
</style>
