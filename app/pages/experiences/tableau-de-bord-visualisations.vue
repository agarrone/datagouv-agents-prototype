<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { ChatAddToolOutputFunction } from "ai";
import {
  explorationResources,
  resourceContextName,
  type DatagouvDatasetResource,
  type ExplorationResource,
} from "~~/shared/data/exploration-resources";
import { DEFAULT_AGENT_MODEL_ID, type AgentModelId } from "~~/shared/agents/models";
import type {
  ChartSpec,
  ChartType,
  DatasetRow,
  DatasetSchemaResult,
  ExplorationMessage,
  MapDatasetResult,
  MapSpec,
} from "~~/shared/types/exploration";
import {
  validateDashboardVisualization,
  type DashboardChartAppearance,
  type DashboardIndicatorSpec,
  type DashboardMapAppearance,
  type DashboardSemanticType,
  type DashboardVisualizationDefinition,
  type DashboardVisualizationFilter,
  type DashboardVisualizationSize,
} from "~~/shared/types/dashboard-visualization";
import type { DashboardDocument, DashboardVisualizationRecord } from "~~/shared/types/dashboard";

type Aggregation = "count" | "countDistinct" | "sum" | "average";
type CardSize = DashboardVisualizationSize;
type DashboardBlockFilter = DashboardVisualizationFilter;
type ChartDefinition = Extract<DashboardVisualizationDefinition, { kind: "chart" }>;
type MapDefinition = Extract<DashboardVisualizationDefinition, { kind: "map" }>;
type IndicatorDefinition = Extract<DashboardVisualizationDefinition, { kind: "indicator" }>;
interface DashboardSeriesConfig { id: string; aggregation: Aggregation; measure: string; label: string }

interface DashboardChart {
  id: string;
  resource: ExplorationResource;
  type: ChartType;
  title: string;
  description: string;
  dimension: string;
  aggregation: Aggregation;
  measure?: string;
  seriesConfig?: DashboardSeriesConfig[];
  limit: number;
  size: CardSize;
  rows: DatasetRow[];
  spec?: ChartSpec;
  sql: string;
  filters?: DashboardBlockFilter[];
  appearance?: DashboardChartAppearance;
  definition?: ChartDefinition;
  revision?: number;
  savedAt?: string;
}

interface DashboardTextBlock {
  id: string;
  title: string;
  content: string;
  size: CardSize;
}

interface DashboardMap {
  id: string;
  resource: ExplorationResource;
  title: string;
  size: CardSize;
  rows: DatasetRow[];
  spec: MapSpec;
  sql: string;
  filters?: DashboardBlockFilter[];
  appearance?: DashboardMapAppearance;
  definition?: MapDefinition;
  revision?: number;
  savedAt?: string;
}

interface DashboardIndicator {
  id: string;
  resource: ExplorationResource;
  title: string;
  description: string;
  value: string | number;
  unit: string;
  size: CardSize;
  sql: string;
  filters?: DashboardBlockFilter[];
  definition?: IndicatorDefinition;
  revision?: number;
  savedAt?: string;
}

type DashboardBlockKind = "text" | "chart" | "map" | "indicator";
interface DashboardBlockReference { id: string; kind: DashboardBlockKind; groupId: string }
interface DashboardFilter {
  id: string;
  label: string;
  column: string;
  value: string;
  options: string[];
}
interface DashboardGroup {
  id: string;
  title: string;
  description: string;
  filters: DashboardFilter[];
}
interface DashboardFilterError {
  message: string;
  detail: string;
}
type OrderedDashboardBlock =
  | { kind: "text"; data: DashboardTextBlock }
  | { kind: "chart"; data: DashboardChart }
  | { kind: "map"; data: DashboardMap }
  | { kind: "indicator"; data: DashboardIndicator };

interface DashboardBlockDraft {
  blockId: string | null;
  kind: DashboardBlockKind;
  title: string;
  description: string;
  content?: string;
  size: CardSize;
  sql: string;
  specJson: string;
  rows: DatasetRow[];
  indicatorValue: string | number | null;
  error: string;
}

const dataset = useDatasetEngine();
const charts = ref<DashboardChart[]>([]);
const textBlocks = ref<DashboardTextBlock[]>([]);
const maps = ref<DashboardMap[]>([]);
const indicators = ref<DashboardIndicator[]>([]);
const defaultGroupId = crypto.randomUUID();
const groups = ref<DashboardGroup[]>([{
  id: defaultGroupId,
  title: "Section",
  description: "Réunissez ici les indicateurs et visualisations qui racontent une même partie de l’analyse.",
  filters: [],
}]);
const blockOrder = ref<DashboardBlockReference[]>([]);
const draggedBlockId = ref<string | null>(null);
const dropTarget = ref<{ groupId: string; index: number } | null>(null);
const pendingInsertIndex = ref<number | null>(null);
const targetGroupId = ref<string>(defaultGroupId);
const visualizationKind = ref<"chart" | "map" | "indicator">("chart");
const editingTextBlockId = ref<string | null>(null);
const agentMapDraft = ref<{ spec: MapSpec; result: MapDatasetResult } | null>(null);
const selectedLatitude = ref("");
const selectedLongitude = ref("");
const selectedCoordinates = ref("");
const selectedLabel = ref("");
const selectedSql = ref("");
const selectedSpecJson = ref("");
const manualPreviewRows = ref<DatasetRow[]>([]);
const manualPreviewLoading = ref(false);
const manualPreviewError = ref("");
const manualPreviewChartSpec = ref<ChartSpec | null>(null);
const manualPreviewMapSpec = ref<MapSpec | null>(null);
const manualPreviewIndicatorValue = ref<string | number | null>(null);
const manualPreviewWarnings = ref<string[]>([]);
const visualizationDraft = ref<DashboardVisualizationDefinition | null>(null);
const manualPreviewColumns = computed(() => Object.keys(manualPreviewRows.value[0] ?? {}).slice(0, 8));
const manualPreviewSample = computed(() => manualPreviewRows.value.slice(0, 5));
let manualPreviewTimer: ReturnType<typeof setTimeout> | undefined;
let manualPreviewRequest = 0;
const groupAddMenuId = ref<string | null>(null);
const assistantOpen = ref(false);
const DEFAULT_ASSISTANT_WIDTH = 380;
const DEFAULT_BUILDER_WIDTH = 430;
const assistantWidth = ref(DEFAULT_ASSISTANT_WIDTH);
const builderWidth = ref(DEFAULT_BUILDER_WIDTH);
const selectedBlockId = ref<string | null>(null);
const panelMode = ref<"assistant" | "sql">("assistant");
const pageTitle = ref("Expérimentation de composition des tableaux de bord");
const pageHeading = ref("Titre de la page");
const pageDescription = ref("Décrivez ici votre page.");
const previewMode = ref(false);
const builderOpen = ref(false);
const builderLoading = ref(false);
const builderError = ref("");
const activeSchema = ref<DatasetSchemaResult | null>(null);
const editingChartId = ref<string | null>(null);
const editingMapId = ref<string | null>(null);
const editingIndicatorId = ref<string | null>(null);
const selectedUnit = ref("");
const activeDraft = ref<DashboardBlockDraft | null>(null);
const filteredRowsByBlock = ref<Record<string, DatasetRow[]>>({});
const filteredIndicatorValues = ref<Record<string, string | number>>({});
const filterErrorsByBlock = ref<Record<string, DashboardFilterError>>({});
let filterRefreshVersion = 0;
let persistenceTimer: ReturnType<typeof setTimeout> | undefined;
const DASHBOARD_STORAGE_KEY = "datagouv-dashboard-document-v2";
const LEGACY_DASHBOARD_STORAGE_KEY = "datagouv-dashboard-experiment-v1";
const LEGACY_DASHBOARD_DOCUMENT_STORAGE_KEY = "datagouv-dashboard-document-v1";
const dashboardId = ref<string>(crypto.randomUUID());
const savedVisualizationDefinition = ref<DashboardVisualizationDefinition | null>(null);
const visualizationIsDirty = ref(false);
const trackVisualizationChanges = ref(false);
const persistenceStatus = ref<"idle" | "saving" | "saved" | "error">("idle");
const lastPersistedAt = ref<Date | null>(null);
const persistenceHydrated = ref(false);

function startPanelResize(side: "assistant" | "builder", event: MouseEvent) {
  const startX = event.clientX;
  const startWidth = side === "assistant" ? assistantWidth.value : builderWidth.value;
  const onMove = (moveEvent: MouseEvent) => {
    const delta = side === "assistant" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
    const width = Math.min(560, Math.max(300, startWidth + delta));
    if (side === "assistant") assistantWidth.value = width;
    else builderWidth.value = width;
  };
  const onEnd = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onEnd);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);
}

function togglePreviewMode() {
  previewMode.value = !previewMode.value;
  selectedBlockId.value = null;
  if (previewMode.value) {
    assistantOpen.value = false;
    builderOpen.value = false;
  }
}

const selectedResourceId = ref("festivals-france");
const selectedResourceOverride = ref<ExplorationResource | null>(null);
const datasetResourceChoices = ref<DatagouvDatasetResource[]>([]);
const selectedDatasetResourceId = ref("");
const datasetResourcesLoading = ref(false);
const datasetResourcesError = ref("");
const selectedType = ref<ChartType>("bar");
const selectedDimension = ref("");
const selectedAggregation = ref<Aggregation>("count");
const selectedMeasure = ref("");
const selectedAdditionalSeries = ref<DashboardSeriesConfig[]>([]);
const selectedLimit = ref(10);
const selectedSize = ref<CardSize>("medium");
const selectedTitle = ref("");
const selectedDescription = ref("");
const selectedBlockFilters = ref<DashboardBlockFilter[]>([]);
const selectedChartOrientation = ref<DashboardChartAppearance["orientation"]>("vertical");
const selectedChartPalette = ref("default");
const selectedShowLegend = ref(false);
const selectedShowValues = ref(false);
const selectedMapBasemap = ref<DashboardMapAppearance["basemap"]>("standard");
const selectedMapPalette = ref("blue");
const selectedMapOpacity = ref(0.72);
const selectedMapShowLegend = ref(true);
const selectedMapType = ref<"points" | "choropleth">("points");
const selectedMapBoundary = ref<"france-regions" | "france-departments">("france-regions");
const naturalLanguagePrompt = ref("");
const naturalLanguageError = ref("");
const agentDraft = ref<{ spec: ChartSpec; rows: DatasetRow[] } | null>(null);
const selectedModelId = ref<AgentModelId>(DEFAULT_AGENT_MODEL_ID);

const chartTypes: Array<{ id: ChartType; label: string; icon: string; description: string }> = [
  { id: "bar", label: "Barres", icon: "ri-bar-chart-horizontal-line", description: "Comparer des catégories" },
  { id: "line", label: "Courbe", icon: "ri-line-chart-line", description: "Suivre une évolution" },
  { id: "area", label: "Aires", icon: "ri-area-chart-line", description: "Montrer une tendance cumulée" },
  { id: "pie", label: "Anneau", icon: "ri-pie-chart-2-line", description: "Montrer une composition" },
];

const chartPalettes: Record<string, string[]> = {
  default: ["#000091", "#e1000f", "#18753c", "#a558a0"],
  blue: ["#000091", "#6a6af4", "#cacafb", "#272747"],
  categorical: ["#000091", "#e1000f", "#18753c", "#ce614a", "#a558a0", "#0063cb"],
  neutral: ["#161616", "#666666", "#929292", "#cecece"],
};

const mapPalettes: Record<string, [string, string]> = {
  blue: ["#ececfe", "#000091"],
  green: ["#e3fdeb", "#18753c"],
  orange: ["#fee9e5", "#ce614a"],
  purple: ["#fee7fc", "#a558a0"],
};

const selectedResource = computed(() => (
  selectedResourceOverride.value
  ?? explorationResources.find(resource => resource.id === selectedResourceId.value)
  ?? explorationResources[0]!
));

const selectedDataset = computed(() => (
  explorationResources.find(resource => resource.id === selectedResourceId.value)
  ?? explorationResources[0]!
));

const usableDatasetResources = computed(() => datasetResourceChoices.value.filter(resource => Boolean(resource.parquetUrl)));

const isEditingVisualization = computed(() => Boolean(editingChartId.value || editingMapId.value || editingIndicatorId.value));
const persistenceLabel = computed(() => {
  if (persistenceStatus.value === "saving") return "Enregistrement local…";
  if (persistenceStatus.value === "error") return "Échec de l’enregistrement local";
  if (persistenceStatus.value === "saved" && lastPersistedAt.value) {
    return `Enregistré localement à ${lastPersistedAt.value.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return "Enregistré automatiquement sur cet appareil";
});

function beginTrackingVisualizationChanges() {
  trackVisualizationChanges.value = false;
  visualizationIsDirty.value = false;
  window.setTimeout(() => { trackVisualizationChanges.value = true; }, 700);
}

function blockSizeClass(size: CardSize) {
  if (size === "small") return "md:col-span-2";
  if (size === "medium") return "md:col-span-3";
  return "md:col-span-6";
}

const numericColumns = computed(() => activeSchema.value?.columns.filter(column => (
  /INT|DOUBLE|FLOAT|DECIMAL|NUMERIC|REAL|HUGEINT/i.test(column.type)
)) ?? []);

const dimensionColumns = computed(() => activeSchema.value?.columns ?? []);

function semanticTypeForField(field: string): DashboardSemanticType {
  const column = activeSchema.value?.columns.find(item => item.name === field);
  const name = field.toLowerCase();
  const type = column?.type ?? "";
  if (/latitude|(^|_)lat($|_)/i.test(name)) return "latitude";
  if (/longitude|(^|_)(lon|lng)($|_)/i.test(name)) return "longitude";
  if (/geometry|geojson|geom/i.test(name)) return "geography";
  if (/BOOL/i.test(type)) return "boolean";
  if (/TIMESTAMP|DATETIME/i.test(type)) return "datetime";
  if (/DATE/i.test(type)) return "date";
  if (/INT|DOUBLE|FLOAT|DECIMAL|NUMERIC|REAL|HUGEINT/i.test(type)) return "number";
  if (/VARCHAR|TEXT|STRING/i.test(type)) return /nom|type|cat[ée]gorie|r[ée]gion|d[ée]partement|code/i.test(name) ? "category" : "text";
  return "unknown";
}

function addSeries() {
  selectedAdditionalSeries.value.push({
    id: crypto.randomUUID(),
    aggregation: "sum",
    measure: numericColumns.value[0]?.name ?? "",
    label: "Nouvelle série",
  });
}

function removeSeries(id: string) {
  selectedAdditionalSeries.value = selectedAdditionalSeries.value.filter(series => series.id !== id);
}

function chartTypeLabel(type: ChartType) {
  return chartTypes.find(option => option.id === type)?.label ?? "Graphique";
}

const aggregationLabel = computed(() => {
  if (selectedAggregation.value === "countDistinct") return "Nombre de valeurs distinctes";
  if (selectedAggregation.value === "sum") return "Somme";
  if (selectedAggregation.value === "average") return "Moyenne";
  return "Nombre de lignes";
});

const suggestedTitle = computed(() => {
  const dimension = selectedDimension.value || "catégorie";
  if (selectedAggregation.value === "count") return `Nombre d’enregistrements par ${dimension}`;
  if (selectedAggregation.value === "countDistinct") return `Nombre de ${selectedMeasure.value || "valeurs"} par ${dimension}`;
  return `${aggregationLabel.value} de ${selectedMeasure.value || "la mesure"} par ${dimension}`;
});

const orderedBlocks = computed<OrderedDashboardBlock[]>(() => {
  const result: OrderedDashboardBlock[] = [];
  for (const reference of blockOrder.value) {
    if (reference.kind === "text") {
      const data = getTextBlock(reference.id);
      if (data) result.push({ kind: "text", data });
    }
    else if (reference.kind === "chart") {
      const data = getChart(reference.id);
      if (data) result.push({ kind: "chart", data });
    }
    else if (reference.kind === "map") {
      const data = getMap(reference.id);
      if (data) result.push({ kind: "map", data });
    }
    else {
      const data = getIndicator(reference.id);
      if (data) result.push({ kind: "indicator", data });
    }
  }
  return result;
});

const selectedDashboardBlock = computed(() => (
  orderedBlocks.value.find(block => block.data.id === selectedBlockId.value)
));

const selectedBlockReference = computed(() => (
  blockOrder.value.find(reference => reference.id === selectedBlockId.value)
));

const assistantTargetGroup = computed(() => {
  const groupId = selectedBlockReference.value?.groupId ?? targetGroupId.value;
  return groups.value.find(group => group.id === groupId) ?? groups.value[0];
});

const assistantContextTitle = computed(() => {
  const block = selectedDashboardBlock.value;
  if (!block) return `Nouvelle visualisation · ${assistantTargetGroup.value?.title ?? "Section"}`;
  if (block.kind === "text") return `Bloc texte · ${block.data.title}`;
  if (block.kind === "map") return `Carte · ${block.data.spec.title}`;
  if (block.kind === "indicator") return `Indicateur · ${block.data.title}`;
  return `Graphique · ${block.data.title}`;
});

const assistantContextDescription = computed(() => {
  const block = selectedDashboardBlock.value;
  if (!block) return `La proposition sera ajoutée au groupe « ${assistantTargetGroup.value?.title ?? "Section"} » après votre confirmation.`;
  if (block.kind === "chart" || block.kind === "map") return "La source et la configuration de ce bloc servent de point de départ à une nouvelle proposition.";
  return "Ce type de bloc n’est pas modifiable par l’assistant. La ressource reste disponible pour créer une visualisation.";
});

const assistantEmptyDescription = computed(() => {
  const block = selectedDashboardBlock.value;
  if (!block) return "Analysez la ressource et préparez un graphique ou une carte à ajouter au tableau de bord.";
  if (block.kind === "chart" || block.kind === "map") return "Ce bloc sert de contexte. L’assistant préparera une variante que vous pourrez vérifier avant de la remplacer.";
  return "Ce type de bloc se modifie manuellement. L’assistant peut néanmoins analyser la ressource et préparer un nouveau graphique ou une nouvelle carte.";
});

const assistantSuggestions = computed(() => {
  const block = selectedDashboardBlock.value;
  if (block?.kind === "chart" || block?.kind === "map") {
    return [
      "Propose une autre visualisation",
      "Modifie le regroupement des données",
      "Filtre les données affichées",
    ];
  }
  return [
    "Compare le nombre de festivals par région",
    "Crée une carte des festivals",
    "Propose une visualisation pertinente",
  ];
});

const proposalKind = computed<"chart" | "map" | null>(() => (
  agentMapDraft.value ? "map" : agentDraft.value ? "chart" : null
));

const proposalReplacesSelection = computed(() => {
  const block = selectedDashboardBlock.value;
  return Boolean(block && proposalKind.value && block.kind === proposalKind.value);
});

const proposalTitle = computed(() => (
  agentMapDraft.value?.result.resolvedSpec.title
  ?? agentDraft.value?.spec.title
  ?? "Visualisation proposée"
));

const proposalTypeLabel = computed(() => proposalKind.value === "map" ? "Carte" : "Graphique");
const proposalDestinationLabel = computed(() => proposalReplacesSelection.value
  ? assistantContextTitle.value
  : `Groupe · ${assistantTargetGroup.value?.title ?? "Section"}`);
const proposalActionLabel = computed(() => proposalReplacesSelection.value
  ? `Remplacer ${proposalKind.value === "map" ? "la carte" : "le graphique"}`
  : `Ajouter ${proposalKind.value === "map" ? "la carte" : "le graphique"}`);

function dashboardAgentContext() {
  return {
    title: pageTitle.value,
    description: pageDescription.value,
    groups: groups.value.map(group => ({
      id: group.id,
      title: group.title,
      description: group.description,
      filters: group.filters.map(filter => ({ label: filter.label, column: filter.column, value: filter.value })),
      blocks: groupBlocks(group.id).map(block => ({
        id: block.data.id,
        kind: block.kind,
        title: block.kind === "map" ? block.data.spec.title : block.data.title,
        size: block.data.size,
        description: block.kind === "text" ? block.data.content : block.kind === "map" ? block.data.spec.description : block.data.description,
        resource: block.kind === "text" ? undefined : {
          id: block.data.resource.id,
          title: block.data.resource.title,
          organization: block.data.resource.organization,
        },
        sql: block.kind === "text" ? undefined : block.data.sql,
        filters: block.kind === "text" ? undefined : block.data.filters ?? [],
        appearance: block.kind === "chart"
          ? block.data.appearance
          : block.kind === "map"
            ? block.data.appearance
            : undefined,
        specification: block.kind === "chart"
          ? chartSpec(block.data)
          : block.kind === "map"
            ? block.data.spec
            : block.kind === "indicator"
              ? { type: "number", value: block.data.value, unit: block.data.unit, valueField: "value" }
              : undefined,
        definition: block.kind === "chart"
          ? chartDefinition(block.data)
          : block.kind === "map"
            ? mapDefinition(block.data)
            : block.kind === "indicator"
              ? indicatorDefinition(block.data)
              : undefined,
      })),
    })),
    selectedBlockId: selectedBlockId.value ?? undefined,
  };
}

function groupBlocks(groupId: string) {
  return orderedBlocks.value.filter(block => (
    blockOrder.value.find(reference => reference.id === block.data.id)?.groupId === groupId
  ));
}

function groupIsSelected(groupId: string) {
  return Boolean(selectedBlockId.value && blockOrder.value.some(reference => (
    reference.id === selectedBlockId.value && reference.groupId === groupId
  )));
}

async function selectDashboardBlock(block: OrderedDashboardBlock) {
  selectedBlockId.value = block.data.id;
  targetGroupId.value = blockOrder.value.find(reference => reference.id === block.data.id)?.groupId ?? groups.value[0]!.id;
  if (previewMode.value || block.kind === "text") return;
  if (block.kind === "chart") await editChart(block.data);
  else if (block.kind === "map") await editMap(block.data);
  else await editIndicator(block.data);
}

function handleDashboardBlockClick(block: OrderedDashboardBlock, event: MouseEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest("button, a, summary, details, input, textarea, select")) return;
  void selectDashboardBlock(block);
}

function handleAgentVisualizationClick(event: MouseEvent) {
  if (!proposalKind.value || agentResponding.value) return;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("[data-visualization-card]")) return;
  if (target.closest("button, a, summary, details")) return;
  editAgentProposalManually();
}

function dropTargetIs(groupId: string, index: number) {
  return dropTarget.value?.groupId === groupId && dropTarget.value.index === index;
}

const runtimeBridge: {
  addToolOutput?: ChatAddToolOutputFunction<ExplorationMessage>;
} = {};

const toolRuntime = useExplorationToolRuntime(dataset, (output) => {
  if (!runtimeBridge.addToolOutput) {
    throw new Error("Le runtime des tools n’est pas encore initialisé.");
  }
  return runtimeBridge.addToolOutput(output);
}, {
  onChartReady(spec, result) {
    visualizationKind.value = "chart";
    agentDraft.value = { spec, rows: result.rows };
    selectedType.value = spec.type;
    selectedDimension.value = spec.xField;
    selectedTitle.value = spec.title;
    selectedDescription.value = spec.description;
    selectedSize.value = "medium";
    selectedSpecJson.value = JSON.stringify(spec, null, 2);
    visualizationDraft.value = currentVisualizationDefinition(spec);
  },
  onMapReady(spec, result) {
    visualizationKind.value = "map";
    agentMapDraft.value = { spec, result };
    selectedTitle.value = spec.title;
    selectedDescription.value = spec.description;
    selectedSpecJson.value = JSON.stringify(spec, null, 2);
    visualizationDraft.value = currentVisualizationDefinition(spec);
  },
  onSqlReady(sql) {
    selectedSql.value = sql;
    if (visualizationDraft.value) {
      visualizationDraft.value = {
        ...visualizationDraft.value,
        data: { ...visualizationDraft.value.data, query: sql },
      };
    }
  },
});

function shouldContinueAgent(options: { messages: ExplorationMessage[] }) {
  const lastMessage = options.messages.at(-1);
  if (lastMessage?.role === "assistant" && lastMessage.parts.some(part => (
    (part.type === "tool-create_chart" || part.type === "tool-create_map") && part.state === "output-available"
  ))) return false;
  return lastAssistantMessageIsCompleteWithToolCalls(options);
}

const {
  addToolOutput,
  clearError: clearAgentError,
  error: naturalLanguageAgentError,
  messages: agentMessages,
  sendMessage: sendAgentMessage,
  status: agentStatus,
  stop: stopAgent,
} = useChat<ExplorationMessage>({
  transport: new DefaultChatTransport({
    api: "/nuxt-api/agents/dashboard",
    prepareSendMessagesRequest({ id, messages, trigger, messageId }) {
      const resource = selectedResource.value;
      return {
        body: {
          id,
          messages,
          trigger,
          messageId,
          modelId: selectedModelId.value,
          turnStartedAt: Date.now(),
          dashboard: dashboardAgentContext(),
          resource: {
            datasetId: resource.datasetReference,
            resourceId: resource.id,
            title: resource.title,
            organization: resource.organization,
            resourceName: resourceContextName(resource),
            url: resource.parquetUrl,
            schema: activeSchema.value
              ? {
                  rowCount: activeSchema.value.rowCount,
                  columns: activeSchema.value.columns,
                }
              : undefined,
          },
        },
      };
    },
  }),
  sendAutomaticallyWhen: shouldContinueAgent,
  onToolCall: toolRuntime.handleToolCall,
});
runtimeBridge.addToolOutput = addToolOutput;

const agentResponding = computed(() => (
  agentStatus.value === "submitted" || agentStatus.value === "streaming"
));

const activeAssistantMessageId = computed(() => {
  if (!agentResponding.value) return undefined;
  return [...agentMessages.value].reverse().find(message => message.role === "assistant")?.id;
});

const showInitialThinking = computed(() => agentResponding.value && !activeAssistantMessageId.value);

function previousUserQuestion(messageIndex: number) {
  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    const message = agentMessages.value[index];
    if (message?.role !== "user") continue;
    return message.parts
      .filter(part => part.type === "text")
      .map(part => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function chartSource(resource: ExplorationResource) {
  return `${resource.title} · ${resource.organization}`;
}

function chartSpec(chart: DashboardChart): ChartSpec {
  if (chart.spec) return chart.spec;
  return {
    type: chart.type,
    title: chart.title,
    description: chart.description,
    xField: "dimension",
    xLabel: chart.dimension,
    series: [{ field: "value", label: measureLabel(chart) }],
  };
}

function chartDefinition(chart: DashboardChart): ChartDefinition {
  return chart.definition ?? {
    version: 1,
    kind: "chart",
    title: chart.title,
    description: chart.description,
    size: chart.size,
    data: { resourceId: chart.resource.id, datasetReference: chart.resource.datasetReference, resourceName: resourceContextName(chart.resource), resourceUrl: chart.resource.parquetUrl, engine: "duckdb-sql", query: chart.sql },
    filters: structuredClone(toRaw(chart.filters ?? [])),
    specification: chartSpec(chart),
    appearance: chart.appearance ?? {
      orientation: chart.type === "bar" ? "horizontal" : "vertical",
      palette: chartPalettes.default!,
      showLegend: chart.type === "pie",
      showValues: chart.type === "bar",
    },
  };
}

function mapDefinition(map: DashboardMap): MapDefinition {
  return map.definition ?? {
    version: 1,
    kind: "map",
    title: map.title,
    description: map.spec.description,
    size: map.size,
    data: { resourceId: map.resource.id, datasetReference: map.resource.datasetReference, resourceName: resourceContextName(map.resource), resourceUrl: map.resource.parquetUrl, engine: "duckdb-sql", query: map.sql },
    filters: structuredClone(toRaw(map.filters ?? [])),
    specification: map.spec,
    appearance: map.appearance ?? {
      basemap: map.spec.type === "choropleth" ? "light" : "standard",
      fillPalette: mapPalettes.blue!,
      fillOpacity: 0.72,
      showLegend: true,
    },
  };
}

function indicatorDefinition(indicator: DashboardIndicator): IndicatorDefinition {
  return indicator.definition ?? {
    version: 1,
    kind: "indicator",
    title: indicator.title,
    description: indicator.description,
    size: indicator.size,
    data: { resourceId: indicator.resource.id, datasetReference: indicator.resource.datasetReference, resourceName: resourceContextName(indicator.resource), resourceUrl: indicator.resource.parquetUrl, engine: "duckdb-sql", query: indicator.sql },
    filters: structuredClone(toRaw(indicator.filters ?? [])),
    specification: {
      type: "number",
      title: indicator.title,
      description: indicator.description,
      valueField: "value",
      unit: indicator.unit,
    },
    appearance: {},
  };
}

function currentVisualizationDefinition(
  parsedSpec: ChartSpec | MapSpec | DashboardIndicatorSpec,
): DashboardVisualizationDefinition {
  const base = {
    version: 1 as const,
    title: selectedTitle.value.trim() || parsedSpec.title || "Visualisation sans titre",
    description: selectedDescription.value.trim() || parsedSpec.description || "",
    size: selectedSize.value,
    data: {
      resourceId: selectedResource.value.id,
      datasetReference: selectedResource.value.datasetReference,
      resourceName: resourceContextName(selectedResource.value),
      resourceUrl: selectedResource.value.parquetUrl,
      engine: "duckdb-sql" as const,
      query: selectedSql.value,
    },
    filters: structuredClone(toRaw(selectedBlockFilters.value)),
  };
  if (visualizationKind.value === "chart") {
    const spec = parsedSpec as ChartSpec;
    return {
      ...base,
      kind: "chart",
      specification: spec,
      appearance: chartAppearance(),
      fields: [
        { field: spec.xField, role: "dimension", semanticType: semanticTypeForField(selectedDimension.value), label: spec.xLabel },
        ...spec.series.map((series, index) => ({
          field: series.field,
          role: "measure" as const,
          semanticType: "number" as const,
          label: series.label,
          unit: index === 0 ? selectedUnit.value || undefined : undefined,
        })),
      ],
    };
  }
  if (visualizationKind.value === "map") {
    return { ...base, kind: "map", specification: parsedSpec as MapSpec, appearance: mapAppearance() };
  }
  return { ...base, kind: "indicator", specification: parsedSpec as DashboardIndicatorSpec, appearance: {} };
}

function displayedChartRows(chart: DashboardChart) {
  if (activeDraft.value?.blockId === chart.id && !activeDraft.value.error) return activeDraft.value.rows;
  return filteredRowsByBlock.value[chart.id] ?? chart.rows;
}

function displayedChartSpec(chart: DashboardChart) {
  if (activeDraft.value?.blockId === chart.id) {
    try { return JSON.parse(activeDraft.value.specJson) as ChartSpec; }
    catch { /* Keep the last valid specification visible. */ }
  }
  return chartSpec(chart);
}

function displayedMapRows(map: DashboardMap) {
  if (activeDraft.value?.blockId === map.id && !activeDraft.value.error) return activeDraft.value.rows;
  return filteredRowsByBlock.value[map.id] ?? map.rows;
}

function displayedMapSpec(map: DashboardMap) {
  if (activeDraft.value?.blockId === map.id) {
    try { return JSON.parse(activeDraft.value.specJson) as MapSpec; }
    catch { /* Keep the last valid specification visible. */ }
  }
  return map.spec;
}

function displayedIndicatorValue(indicator: DashboardIndicator) {
  if (activeDraft.value?.blockId === indicator.id && activeDraft.value.indicatorValue !== null) return activeDraft.value.indicatorValue;
  return filteredIndicatorValues.value[indicator.id] ?? indicator.value;
}

function displayedIndicatorTitle(indicator: DashboardIndicator) {
  return activeDraft.value?.blockId === indicator.id ? activeDraft.value.title : indicator.title;
}

function displayedIndicatorDescription(indicator: DashboardIndicator) {
  return activeDraft.value?.blockId === indicator.id ? activeDraft.value.description : indicator.description;
}

function displayedIndicatorUnit(indicator: DashboardIndicator) {
  return activeDraft.value?.blockId === indicator.id ? selectedUnit.value : indicator.unit;
}

function chartAppearance(chart?: DashboardChart): DashboardChartAppearance {
  if (chart && activeDraft.value?.blockId !== chart.id) {
    return chart.appearance ?? {
      orientation: chart.type === "bar" ? "horizontal" : "vertical",
      palette: chartPalettes.default!,
      showLegend: chart.type === "pie",
      showValues: chart.type === "bar",
    };
  }
  return {
    orientation: selectedChartOrientation.value,
    palette: chartPalettes[selectedChartPalette.value] ?? chartPalettes.default!,
    showLegend: selectedShowLegend.value,
    showValues: selectedShowValues.value,
  };
}

function mapAppearance(map?: DashboardMap): DashboardMapAppearance {
  if (map && activeDraft.value?.blockId !== map.id) {
    return map.appearance ?? {
      basemap: map.spec.type === "choropleth" ? "light" : "standard",
      fillPalette: mapPalettes.blue!,
      fillOpacity: 0.72,
      showLegend: true,
    };
  }
  return {
    basemap: selectedMapBasemap.value,
    fillPalette: mapPalettes[selectedMapPalette.value] ?? mapPalettes.blue!,
    fillOpacity: selectedMapOpacity.value,
    showLegend: selectedMapShowLegend.value,
  };
}

function displayedBlockSize(block: OrderedDashboardBlock) {
  const isEdited = (block.kind === "chart" && editingChartId.value === block.data.id)
    || (block.kind === "map" && editingMapId.value === block.data.id)
    || (block.kind === "indicator" && editingIndicatorId.value === block.data.id);
  return isEdited && panelMode.value === "sql" ? selectedSize.value : block.data.size;
}

function measureLabel(chart: Pick<DashboardChart, "aggregation" | "measure">) {
  if (chart.aggregation === "count") return "Nombre d’enregistrements";
  if (chart.aggregation === "countDistinct") return `Nombre de ${chart.measure || "valeurs"}`;
  if (chart.aggregation === "average") return `Moyenne de ${chart.measure || "la mesure"}`;
  return `Somme de ${chart.measure || "la mesure"}`;
}

function defaultDescription() {
  return `${measureLabel({ aggregation: selectedAggregation.value, measure: selectedMeasure.value })} regroupé par ${selectedDimension.value}.`;
}

function aggregationExpression(aggregation: Aggregation, measureField: string) {
  const measure = measureField ? quoteIdentifier(measureField) : "*";
  if (aggregation === "countDistinct") return `COUNT(DISTINCT ${measure})::INTEGER`;
  if (aggregation === "sum") return `SUM(TRY_CAST(${measure} AS DOUBLE))`;
  if (aggregation === "average") return `AVG(TRY_CAST(${measure} AS DOUBLE))`;
  return "COUNT(*)::INTEGER";
}

function aggregationSql() {
  return aggregationExpression(selectedAggregation.value, selectedMeasure.value);
}

function buildSql() {
  const dimension = quoteIdentifier(selectedDimension.value);
  const direction = selectedType.value === "line" || selectedType.value === "area" ? "ASC" : "DESC";
  const additionalSeries = selectedAdditionalSeries.value
    .map((series, index) => `${aggregationExpression(series.aggregation, series.measure)} AS value_${index + 2}`)
    .join(",\n      ");
  return `
    SELECT
      CAST(${dimension} AS VARCHAR) AS dimension,
      ${aggregationSql()} AS value${additionalSeries ? `,\n      ${additionalSeries}` : ""}
    FROM data
    WHERE ${dimension} IS NOT NULL
      AND TRIM(CAST(${dimension} AS VARCHAR)) <> ''
    GROUP BY 1
    HAVING value IS NOT NULL
    ORDER BY value ${direction}, dimension ASC
    LIMIT ${selectedLimit.value}
  `;
}

function currentChartSeries() {
  return [
    { field: "value", label: measureLabel({ aggregation: selectedAggregation.value, measure: selectedMeasure.value }) },
    ...selectedAdditionalSeries.value.map((series, index) => ({
      field: `value_${index + 2}`,
      label: series.label.trim() || measureLabel({ aggregation: series.aggregation, measure: series.measure }),
    })),
  ];
}

function buildMapSql() {
  if (!selectedLabel.value) return "";
  const latitudeSql = selectedCoordinates.value ? `TRY_CAST(TRIM(split_part(${quoteIdentifier(selectedCoordinates.value)}, ',', 1)) AS DOUBLE)` : selectedLatitude.value ? `TRY_CAST(${quoteIdentifier(selectedLatitude.value)} AS DOUBLE)` : "NULL";
  const longitudeSql = selectedCoordinates.value ? `TRY_CAST(TRIM(split_part(${quoteIdentifier(selectedCoordinates.value)}, ',', 2)) AS DOUBLE)` : selectedLongitude.value ? `TRY_CAST(${quoteIdentifier(selectedLongitude.value)} AS DOUBLE)` : "NULL";
  return `SELECT
  ${latitudeSql} AS latitude,
  ${longitudeSql} AS longitude,
  CAST(${quoteIdentifier(selectedLabel.value)} AS VARCHAR) AS label
FROM data
WHERE ${latitudeSql} BETWEEN -90 AND 90
  AND ${longitudeSql} BETWEEN -180 AND 180
LIMIT 1000`;
}

function buildChoroplethSql() {
  if (!selectedDimension.value) return "";
  const dimension = quoteIdentifier(selectedDimension.value);
  return `SELECT
  CAST(${dimension} AS VARCHAR) AS data_key,
  CAST(${dimension} AS VARCHAR) AS label,
  ${aggregationSql()} AS value
FROM data
WHERE ${dimension} IS NOT NULL
  AND TRIM(CAST(${dimension} AS VARCHAR)) <> ''
GROUP BY 1, 2
ORDER BY value DESC`;
}

function selectDefaultGeographicDimension() {
  const columns = activeSchema.value?.columns ?? [];
  const pattern = selectedMapBoundary.value === "france-departments"
    ? /code.*d[ée]partement|d[ée]partement/i
    : /code.*r[ée]gion|r[ée]gion/i;
  const candidate = columns.find(column => pattern.test(column.name));
  if (candidate) selectedDimension.value = candidate.name;
}

function buildIndicatorSql() {
  return `SELECT ${aggregationSql()} AS value FROM data`;
}

function updateManualDefinition() {
  if (agentDraft.value || agentMapDraft.value) return;
  if (visualizationKind.value === "map") {
    if (selectedMapType.value === "choropleth") {
      selectedSql.value = buildChoroplethSql();
      selectedSpecJson.value = JSON.stringify({
        type: "choropleth",
        title: selectedTitle.value || "Répartition territoriale",
        description: selectedDescription.value || defaultDescription(),
        boundary: selectedMapBoundary.value,
        dataKey: "data_key",
        valueField: "value",
        labelField: "label",
        valueLabel: measureLabel({ aggregation: selectedAggregation.value, measure: selectedMeasure.value }),
      } satisfies MapSpec, null, 2);
    }
    else {
      selectedSql.value = buildMapSql();
      selectedSpecJson.value = JSON.stringify({
        type: "points",
        title: selectedTitle.value || "Carte des données",
        description: selectedDescription.value || "Localisation des enregistrements de la ressource.",
        latitudeField: "latitude",
        longitudeField: "longitude",
        labelField: "label",
      } satisfies MapSpec, null, 2);
    }
    return;
  }
  if (visualizationKind.value === "indicator") {
    selectedSql.value = buildIndicatorSql();
    selectedSpecJson.value = JSON.stringify({
      type: "number",
      title: selectedTitle.value || aggregationLabel.value,
      description: selectedDescription.value || "Indicateur calculé à partir de la ressource.",
      valueField: "value",
      unit: selectedUnit.value,
    }, null, 2);
    return;
  }
  selectedSql.value = selectedDimension.value ? buildSql().trim() : "";
  selectedSpecJson.value = JSON.stringify({
    type: selectedType.value,
    title: selectedTitle.value || suggestedTitle.value,
    description: selectedDescription.value || defaultDescription(),
    xField: "dimension",
    xLabel: selectedDimension.value,
    series: currentChartSeries(),
  } satisfies ChartSpec, null, 2);
}

watch(
  [visualizationKind, selectedType, selectedDimension, selectedAggregation, selectedMeasure, selectedLimit, selectedLatitude, selectedLongitude, selectedCoordinates, selectedLabel, selectedTitle, selectedDescription, selectedUnit, selectedMapType, selectedMapBoundary],
  updateManualDefinition,
);

watch([selectedMapType, selectedMapBoundary], ([type]) => {
  if (type === "choropleth") selectDefaultGeographicDimension();
});

watch(selectedAdditionalSeries, updateManualDefinition, { deep: true });

watch(
  [selectedTitle, selectedDescription, selectedSize, selectedSql, selectedSpecJson],
  () => {
    if (!activeDraft.value) return;
    activeDraft.value = {
      ...activeDraft.value,
      title: selectedTitle.value,
      description: selectedDescription.value,
      size: selectedSize.value,
      sql: selectedSql.value,
      specJson: selectedSpecJson.value,
    };
  },
);

watch(
  [selectedResourceId, selectedDatasetResourceId, selectedType, selectedDimension, selectedAggregation, selectedMeasure, selectedLimit, selectedUnit, selectedLatitude, selectedLongitude, selectedCoordinates, selectedLabel, selectedMapType, selectedMapBoundary, selectedTitle, selectedDescription, selectedSize, selectedSql, selectedSpecJson, selectedBlockFilters, selectedAdditionalSeries, selectedChartOrientation, selectedChartPalette, selectedShowLegend, selectedShowValues, selectedMapBasemap, selectedMapPalette, selectedMapOpacity, selectedMapShowLegend],
  () => {
    if (trackVisualizationChanges.value && isEditingVisualization.value) visualizationIsDirty.value = true;
  },
  { deep: true },
);

async function refreshManualPreview() {
  if (builderLoading.value || !builderOpen.value || panelMode.value !== "sql" || !selectedSql.value.trim() || !selectedSpecJson.value.trim()) return;
  const request = ++manualPreviewRequest;
  const currentDraft = activeDraft.value;
  manualPreviewLoading.value = true;
  manualPreviewError.value = "";
  manualPreviewWarnings.value = [];
  try {
    const parsedSpec = JSON.parse(selectedSpecJson.value) as ChartSpec | MapSpec | { valueField?: string };
    await dataset.load(selectedResource.value);
    const blockGroupId = activeDraft.value?.blockId
      ? blockOrder.value.find(block => block.id === activeDraft.value?.blockId)?.groupId
      : targetGroupId.value;
    const groupFilters = groups.value.find(group => group.id === blockGroupId)?.filters ?? [];
    const previewSql = applyBlockFilters(
      applyGroupFilters(selectedSql.value, groupFilters),
      selectedBlockFilters.value,
    );
    const result = await dataset.executeSql(previewSql);
    if (request !== manualPreviewRequest) return;
    if (visualizationKind.value === "chart") {
      const spec = parsedSpec as ChartSpec;
      if (!spec.type || !spec.xField || !Array.isArray(spec.series)) throw new Error("La spécification du graphique est incomplète.");
      manualPreviewChartSpec.value = spec;
      manualPreviewMapSpec.value = null;
    }
    else if (visualizationKind.value === "map") {
      const spec = parsedSpec as MapSpec;
      if (!spec.type || !spec.title) throw new Error("La spécification de la carte est incomplète.");
      manualPreviewMapSpec.value = spec;
      manualPreviewChartSpec.value = null;
    }
    else {
      const indicatorSpec = parsedSpec as DashboardIndicatorSpec;
      const valueField = indicatorSpec.valueField ?? "value";
      const value = result.rows[0]?.[valueField];
      if (typeof value !== "string" && typeof value !== "number") throw new Error("La requête de l’indicateur doit retourner une valeur.");
      manualPreviewIndicatorValue.value = value;
      manualPreviewChartSpec.value = null;
      manualPreviewMapSpec.value = null;
    }
    const definition = currentVisualizationDefinition(parsedSpec as ChartSpec | MapSpec | DashboardIndicatorSpec);
    const validation = validateDashboardVisualization(definition, result.rows);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    visualizationDraft.value = definition;
    manualPreviewWarnings.value = validation.warnings;
    manualPreviewRows.value = result.rows;
    if (currentDraft) {
      activeDraft.value = {
        ...currentDraft,
        rows: result.rows,
        indicatorValue: visualizationKind.value === "indicator" ? manualPreviewIndicatorValue.value : null,
        error: "",
      };
    }
  }
  catch (reason) {
    if (request !== manualPreviewRequest) return;
    manualPreviewError.value = reason instanceof Error ? reason.message : "La prévisualisation n’a pas pu être calculée.";
    if (currentDraft) activeDraft.value = { ...currentDraft, error: manualPreviewError.value };
  }
  finally {
    if (request === manualPreviewRequest) manualPreviewLoading.value = false;
  }
}

function scheduleManualPreview() {
  if (manualPreviewTimer) clearTimeout(manualPreviewTimer);
  manualPreviewTimer = setTimeout(refreshManualPreview, 450);
}

watch([selectedSql, selectedSpecJson, selectedBlockFilters, panelMode, builderOpen, selectedResourceId], scheduleManualPreview, { deep: true });

async function loadBuilderResource(preserveSelection = false) {
  builderLoading.value = true;
  builderError.value = "";
  try {
    activeSchema.value = await dataset.load(selectedResource.value);
    if (!preserveSelection || !activeSchema.value.columns.some(column => column.name === selectedDimension.value)) {
      const preferred = activeSchema.value.columns.find(column => /VARCHAR|TEXT|DATE|TIMESTAMP/i.test(column.type));
      selectedDimension.value = preferred?.name ?? activeSchema.value.columns[0]?.name ?? "";
    }
    if (!activeSchema.value.columns.some(column => column.name === selectedMeasure.value)) {
      selectedMeasure.value = numericColumns.value[0]?.name ?? "";
    }
    const columns = activeSchema.value.columns;
    selectedLatitude.value = columns.find(column => /(^|\b)(lat|latitude)(\b|$)/i.test(column.name))?.name ?? selectedLatitude.value;
    selectedLongitude.value = columns.find(column => /(^|\b)(lon|lng|longitude)(\b|$)/i.test(column.name))?.name ?? selectedLongitude.value;
    selectedCoordinates.value = columns.find(column => /géocodage|coordonnées?|geometry|geom/i.test(column.name))?.name ?? selectedCoordinates.value;
    selectedLabel.value = columns.find(column => /nom|titre|label|festival/i.test(column.name))?.name ?? columns[0]?.name ?? "";
    if (visualizationKind.value === "map" && selectedMapType.value === "choropleth") selectDefaultGeographicDimension();
    updateManualDefinition();
  }
  catch (reason) {
    builderError.value = reason instanceof Error ? reason.message : "Cette source n’a pas pu être chargée.";
  }
  finally {
    builderLoading.value = false;
    scheduleManualPreview();
  }
}

function resetBuilder() {
  editingChartId.value = null;
  editingMapId.value = null;
  editingIndicatorId.value = null;
  selectedResourceId.value = "festivals-france";
  selectedResourceOverride.value = null;
  datasetResourceChoices.value = [];
  selectedDatasetResourceId.value = "";
  datasetResourcesError.value = "";
  selectedType.value = "bar";
  selectedDimension.value = "";
  selectedAggregation.value = "count";
  selectedMeasure.value = "";
  selectedAdditionalSeries.value = [];
  selectedLimit.value = 10;
  selectedSize.value = "medium";
  selectedTitle.value = "";
  selectedDescription.value = "";
  selectedBlockFilters.value = [];
  selectedChartOrientation.value = "vertical";
  selectedChartPalette.value = "default";
  selectedShowLegend.value = false;
  selectedShowValues.value = false;
  selectedMapBasemap.value = "standard";
  selectedMapPalette.value = "blue";
  selectedMapOpacity.value = 0.72;
  selectedMapShowLegend.value = true;
  selectedMapType.value = "points";
  selectedMapBoundary.value = "france-regions";
  selectedUnit.value = "";
  activeSchema.value = null;
  builderError.value = "";
  naturalLanguagePrompt.value = "";
  naturalLanguageError.value = "";
  agentDraft.value = null;
  agentMapDraft.value = null;
  selectedSql.value = "";
  selectedSpecJson.value = "";
  manualPreviewRows.value = [];
  manualPreviewChartSpec.value = null;
  manualPreviewMapSpec.value = null;
  manualPreviewIndicatorValue.value = null;
  manualPreviewError.value = "";
  manualPreviewWarnings.value = [];
  visualizationDraft.value = null;
  savedVisualizationDefinition.value = null;
  visualizationIsDirty.value = false;
  trackVisualizationChanges.value = false;
  clearAgentError();
  toolRuntime.reset();
}

async function openBuilder(kind: "chart" | "map" | "indicator" = "chart", insertIndex: number | null = null, groupId = groups.value[0]!.id) {
  resetBuilder();
  selectedBlockId.value = null;
  visualizationKind.value = kind;
  pendingInsertIndex.value = insertIndex;
  targetGroupId.value = groupId;
  builderOpen.value = true;
  panelMode.value = "sql";
  activeDraft.value = { blockId: null, kind, title: "", description: "", size: selectedSize.value, sql: "", specJson: "", rows: [], indicatorValue: null, error: "" };
  await loadDatasetResourceChoices();
  await loadBuilderResource();
}

function insertBlockReference(reference: DashboardBlockReference) {
  const index = pendingInsertIndex.value;
  const groupReferences = blockOrder.value.filter(block => block.groupId === reference.groupId);
  if (index === null || index < 0 || index >= groupReferences.length) blockOrder.value.push(reference);
  else {
    const targetReference = groupReferences[index];
    const globalIndex = targetReference ? blockOrder.value.indexOf(targetReference) : blockOrder.value.length;
    blockOrder.value.splice(globalIndex, 0, reference);
  }
  pendingInsertIndex.value = null;
}

function addTextBlock(insertIndex: number | null = null, groupId = groups.value[0]!.id) {
  const id = crypto.randomUUID();
  textBlocks.value.push({
    id,
    title: "Nouveau bloc de texte",
    content: "Ajoutez ici un commentaire, une **analyse** ou du contexte pour accompagner les visualisations.",
    size: "large",
  });
  pendingInsertIndex.value = insertIndex;
  insertBlockReference({ id, kind: "text", groupId });
  editingTextBlockId.value = id;
  activeDraft.value = {
    blockId: id,
    kind: "text",
    title: "Nouveau bloc de texte",
    description: "",
    content: "Ajoutez ici un commentaire, une **analyse** ou du contexte pour accompagner les visualisations.",
    size: "large",
    sql: "",
    specJson: "",
    rows: [],
    indicatorValue: null,
    error: "",
  };
}

function toggleTextBlockEditing(block: DashboardTextBlock) {
  if (editingTextBlockId.value === block.id) {
    if (activeDraft.value?.kind === "text" && activeDraft.value.blockId === block.id) {
      block.title = activeDraft.value.title;
      block.content = activeDraft.value.content ?? "";
      block.size = activeDraft.value.size;
    }
    editingTextBlockId.value = null;
    activeDraft.value = null;
    return;
  }
  editingTextBlockId.value = block.id;
  activeDraft.value = {
    blockId: block.id,
    kind: "text",
    title: block.title,
    description: "",
    content: block.content,
    size: block.size,
    sql: "",
    specJson: "",
    rows: [],
    indicatorValue: null,
    error: "",
  };
}

function removeTextBlock(id: string) {
  textBlocks.value = textBlocks.value.filter(block => block.id !== id);
  blockOrder.value = blockOrder.value.filter(block => block.id !== id);
  if (activeDraft.value?.kind === "text" && activeDraft.value.blockId === id) activeDraft.value = null;
  if (editingTextBlockId.value === id) editingTextBlockId.value = null;
}

function getTextBlock(id: string) { return textBlocks.value.find(block => block.id === id); }
function getChart(id: string) { return charts.value.find(block => block.id === id); }
function getMap(id: string) { return maps.value.find(block => block.id === id); }
function getIndicator(id: string) { return indicators.value.find(block => block.id === id); }

function dropBlock(groupId: string, targetIndex: number) {
  const id = draggedBlockId.value;
  if (!id) return;
  const currentIndex = blockOrder.value.findIndex(block => block.id === id);
  if (currentIndex < 0) return;
  const [block] = blockOrder.value.splice(currentIndex, 1);
  if (!block) return;
  block.groupId = groupId;
  const groupReferences = blockOrder.value.filter(reference => reference.groupId === groupId);
  const targetReference = groupReferences[targetIndex];
  const globalIndex = targetReference ? blockOrder.value.indexOf(targetReference) : blockOrder.value.length;
  blockOrder.value.splice(globalIndex, 0, block);
  draggedBlockId.value = null;
  dropTarget.value = null;
}

function finishDragging() {
  draggedBlockId.value = null;
  dropTarget.value = null;
}

function addGroup() {
  const id = crypto.randomUUID();
  groups.value.push({
    id,
    title: "Nouveau groupe",
    description: "Décrivez le thème ou l’objectif des blocs réunis dans ce groupe.",
    filters: [],
  });
}

function removeGroup(groupId: string) {
  if (groups.value.length === 1) return;
  const fallbackGroup = groups.value.find(group => group.id !== groupId);
  if (!fallbackGroup) return;
  blockOrder.value.forEach((block) => {
    if (block.groupId === groupId) block.groupId = fallbackGroup.id;
  });
  groups.value = groups.value.filter(group => group.id !== groupId);
}

async function addGroupFilter(group: DashboardGroup) {
  if (!activeSchema.value) {
    try { activeSchema.value = await dataset.load(selectedResource.value); }
    catch { return; }
  }
  const column = activeSchema.value?.columns.find(item => /région|region/i.test(item.name))?.name
    ?? activeSchema.value?.columns[0]?.name
    ?? "";
  const filter: DashboardFilter = {
    id: crypto.randomUUID(),
    label: column || "Filtre",
    column,
    value: "Toutes les valeurs",
    options: ["Toutes les valeurs"],
  };
  group.filters.push(filter);
  await updateGroupFilterOptions(filter);
}

async function updateGroupFilterOptions(filter: DashboardFilter) {
  if (!filter.column) return;
  try {
    await dataset.load(selectedResource.value);
    const result = await dataset.getExplorerValueOptions(filter.column);
    const values = result
      .map(option => option.label.trim())
      .filter(Boolean);
    filter.options = ["Toutes les valeurs", ...values];
    filter.value = filter.options.includes(filter.value) ? filter.value : filter.options[0]!;
    if (!filter.label || filter.label === "Filtre") filter.label = filter.column;
  }
  catch {
    filter.options = ["Toutes les valeurs"];
    filter.value = filter.options[0]!;
  }
}

function removeGroupFilter(group: DashboardGroup, filterId: string) {
  group.filters = group.filters.filter(filter => filter.id !== filterId);
}

function sqlLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function addBlockFilter() {
  const column = activeSchema.value?.columns[0]?.name ?? "";
  selectedBlockFilters.value.push({ id: crypto.randomUUID(), column, operator: "equals", value: "", semanticType: semanticTypeForField(column) });
}

function removeBlockFilter(id: string) {
  selectedBlockFilters.value = selectedBlockFilters.value.filter(filter => filter.id !== id);
}

function blockFilterPredicate(filter: DashboardBlockFilter) {
  const column = quoteIdentifier(filter.column);
  const value = sqlLiteral(filter.value);
  const textColumn = filter.caseSensitive ? `CAST(${column} AS VARCHAR)` : `LOWER(CAST(${column} AS VARCHAR))`;
  const textValue = filter.caseSensitive ? filter.value : filter.value.toLowerCase();
  if (filter.operator === "isEmpty") return `(${column} IS NULL OR TRIM(CAST(${column} AS VARCHAR)) = '')`;
  if (filter.operator === "isNotEmpty") return `(${column} IS NOT NULL AND TRIM(CAST(${column} AS VARCHAR)) <> '')`;
  if (filter.operator === "notEquals") return `CAST(${column} AS VARCHAR) <> ${value}`;
  if (filter.operator === "contains") return `${textColumn} LIKE ${sqlLiteral(`%${textValue}%`)}`;
  if (filter.operator === "startsWith") return `${textColumn} LIKE ${sqlLiteral(`${textValue}%`)}`;
  if (filter.operator === "endsWith") return `${textColumn} LIKE ${sqlLiteral(`%${textValue}`)}`;
  if (filter.operator === "greaterThan") return `TRY_CAST(${column} AS DOUBLE) > TRY_CAST(${value} AS DOUBLE)`;
  if (filter.operator === "greaterThanOrEqual") return `TRY_CAST(${column} AS DOUBLE) >= TRY_CAST(${value} AS DOUBLE)`;
  if (filter.operator === "lessThan") return `TRY_CAST(${column} AS DOUBLE) < TRY_CAST(${value} AS DOUBLE)`;
  if (filter.operator === "lessThanOrEqual") return `TRY_CAST(${column} AS DOUBLE) <= TRY_CAST(${value} AS DOUBLE)`;
  if (filter.operator === "between") return `TRY_CAST(${column} AS DOUBLE) BETWEEN TRY_CAST(${value} AS DOUBLE) AND TRY_CAST(${sqlLiteral(filter.secondValue ?? "")} AS DOUBLE)`;
  return `CAST(${column} AS VARCHAR) = ${value}`;
}

function applyBlockFilters(sql: string, filters: DashboardBlockFilter[] = []) {
  const activeFilters = filters.filter(filter => filter.column && (
    filter.operator === "isEmpty" || filter.operator === "isNotEmpty" || filter.value.trim()
  ));
  if (!activeFilters.length) return sql;
  const predicate = activeFilters.map(blockFilterPredicate).join(" AND ");
  return sql.replace(/\bFROM\s+data\b/i, `FROM (SELECT * FROM data WHERE ${predicate}) AS data`);
}

function applyGroupFilters(sql: string, filters: DashboardFilter[]) {
  const activeFilters = filters.filter(filter => filter.column && filter.value && filter.value !== filter.options[0]);
  if (!activeFilters.length) return sql;
  const predicate = activeFilters
    .map(filter => `CAST(${quoteIdentifier(filter.column)} AS VARCHAR) = ${sqlLiteral(filter.value)}`)
    .join(" AND ");
  return sql.replace(/\bFROM\s+data\b/i, `FROM (SELECT * FROM data WHERE ${predicate}) AS data`);
}

async function refreshGroupFilters() {
  const version = ++filterRefreshVersion;
  const nextRows: Record<string, DatasetRow[]> = {};
  const nextValues: Record<string, string | number> = {};
  const nextErrors: Record<string, DashboardFilterError> = {};
  for (const reference of blockOrder.value) {
    const group = groups.value.find(item => item.id === reference.groupId);
    const block = orderedBlocks.value.find(item => item.data.id === reference.id);
    if (!block || block.kind === "text") continue;
    const groupFilters = group?.filters ?? [];
    const blockFilters = block.data.filters ?? [];
    const hasGroupFilter = groupFilters.some(filter => filter.value && filter.value !== filter.options[0]);
    const hasBlockFilter = blockFilters.some(filter => filter.column && (
      filter.operator === "isEmpty" || filter.operator === "isNotEmpty" || filter.value.trim()
    ));
    if (!hasGroupFilter && !hasBlockFilter) continue;
    try {
      await dataset.load(block.data.resource);
      const sql = applyBlockFilters(applyGroupFilters(block.data.sql, groupFilters), blockFilters);
      const result = await dataset.executeSql(sql);
      if (version !== filterRefreshVersion) return;
      nextRows[block.data.id] = result.rows;
      if (block.kind === "indicator") {
        const value = result.rows[0]?.value;
        if (typeof value === "string" || typeof value === "number") nextValues[block.data.id] = value;
      }
    }
    catch (error) {
      const groupFilterLabels = groupFilters
        .filter(filter => filter.value && filter.value !== filter.options[0])
        .map(filter => filter.label || filter.column);
      const blockFilterLabels = blockFilters
        .filter(filter => filter.column && (
          filter.operator === "isEmpty" || filter.operator === "isNotEmpty" || filter.value.trim()
        ))
        .map(filter => filter.column);
      const filterLabels = [...new Set([...groupFilterLabels, ...blockFilterLabels])];
      const filterDescription = filterLabels.length
        ? `Le filtre ${filterLabels.map(label => `« ${label} »`).join(", ")} n’est pas compatible avec ce bloc.`
        : "Le filtre sélectionné n’est pas compatible avec ce bloc.";
      nextErrors[block.data.id] = {
        message: `${filterDescription} La dernière version valide reste affichée.`,
        detail: error instanceof Error ? error.message : "La requête filtrée n’a pas pu être exécutée.",
      };
    }
  }
  if (version !== filterRefreshVersion) return;
  filteredRowsByBlock.value = nextRows;
  filteredIndicatorValues.value = nextValues;
  filterErrorsByBlock.value = nextErrors;
}

watch([groups, charts, maps, indicators], refreshGroupFilters, { deep: true });

function persistDashboard() {
  if (!import.meta.client) return;
  persistenceStatus.value = "saving";
  const visualizations: DashboardVisualizationRecord[] = [
    ...charts.value.map(chart => ({ id: chart.id, definition: chartDefinition(chart), resource: { id: chart.resource.id, title: chart.resource.title, organization: chart.resource.organization }, rows: chart.rows, revision: chart.revision ?? 1, savedAt: chart.savedAt ?? new Date().toISOString() })),
    ...maps.value.map(map => ({ id: map.id, definition: mapDefinition(map), resource: { id: map.resource.id, title: map.resource.title, organization: map.resource.organization }, rows: map.rows, revision: map.revision ?? 1, savedAt: map.savedAt ?? new Date().toISOString() })),
    ...indicators.value.map(indicator => ({ id: indicator.id, definition: indicatorDefinition(indicator), resource: { id: indicator.resource.id, title: indicator.resource.title, organization: indicator.resource.organization }, rows: [{ [indicatorDefinition(indicator).specification.valueField]: indicator.value }], revision: indicator.revision ?? 1, savedAt: indicator.savedAt ?? new Date().toISOString() })),
  ];
  const document: DashboardDocument = {
    version: 2,
    id: dashboardId.value,
    page: { title: pageTitle.value, heading: pageHeading.value, description: pageDescription.value },
    groups: structuredClone(toRaw(groups.value)),
    layout: structuredClone(toRaw(blockOrder.value)),
    visualizations,
    textBlocks: structuredClone(toRaw(textBlocks.value)),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(document));
    localStorage.removeItem(LEGACY_DASHBOARD_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DASHBOARD_DOCUMENT_STORAGE_KEY);
    lastPersistedAt.value = new Date(document.updatedAt);
    persistenceStatus.value = "saved";
  }
  catch {
    persistenceStatus.value = "error";
  }
}

function restoreDashboardDocument(document: DashboardDocument) {
  dashboardId.value = document.id;
  pageTitle.value = document.page.title;
  pageHeading.value = document.page.heading;
  pageDescription.value = document.page.description;
  groups.value = structuredClone(document.groups);
  blockOrder.value = structuredClone(document.layout);
  textBlocks.value = structuredClone(document.textBlocks);
  charts.value = [];
  maps.value = [];
  indicators.value = [];
  for (const record of document.visualizations) {
    const definition = record.definition;
    const datasetResource = explorationResources.find(item => item.id === definition.data.resourceId) ?? explorationResources[0]!;
    const resource: ExplorationResource = {
      ...datasetResource,
      datasetReference: definition.data.datasetReference ?? datasetResource.datasetReference,
      parquetUrl: definition.data.resourceUrl ?? datasetResource.parquetUrl,
      resourceName: definition.data.resourceName,
    };
    if (definition.kind === "chart") {
      charts.value.push({ id: record.id, resource, type: definition.specification.type, title: definition.title, description: definition.description, dimension: definition.specification.xField, aggregation: "count", limit: record.rows.length, size: definition.size, rows: record.rows, spec: definition.specification, sql: definition.data.query, filters: definition.filters, appearance: definition.appearance, definition, revision: record.revision, savedAt: record.savedAt });
    }
    else if (definition.kind === "map") {
      maps.value.push({ id: record.id, resource, title: definition.title, size: definition.size, rows: record.rows, spec: definition.specification, sql: definition.data.query, filters: definition.filters, appearance: definition.appearance, definition, revision: record.revision, savedAt: record.savedAt });
    }
    else {
      const value = record.rows[0]?.[definition.specification.valueField];
      indicators.value.push({ id: record.id, resource, title: definition.title, description: definition.description, value: typeof value === "string" || typeof value === "number" ? value : "—", unit: definition.specification.unit ?? "", size: definition.size, sql: definition.data.query, filters: definition.filters, definition, revision: record.revision, savedAt: record.savedAt });
    }
  }
  targetGroupId.value = groups.value[0]?.id ?? defaultGroupId;
}

function schedulePersistence() {
  if (!persistenceHydrated.value) return;
  if (persistenceTimer) clearTimeout(persistenceTimer);
  persistenceStatus.value = "saving";
  persistenceTimer = setTimeout(persistDashboard, 250);
}

function resetLocalDashboard() {
  if (!window.confirm("Réinitialiser ce tableau de bord et supprimer sa sauvegarde locale ?")) return;
  localStorage.removeItem(DASHBOARD_STORAGE_KEY);
  localStorage.removeItem(LEGACY_DASHBOARD_STORAGE_KEY);
  localStorage.removeItem(LEGACY_DASHBOARD_DOCUMENT_STORAGE_KEY);
  window.location.reload();
}

onMounted(() => {
  const serializedDocument = localStorage.getItem(DASHBOARD_STORAGE_KEY);
  if (serializedDocument) {
    try {
      const document = JSON.parse(serializedDocument) as DashboardDocument;
      restoreDashboardDocument(document);
      lastPersistedAt.value = new Date(document.updatedAt);
      persistenceStatus.value = "saved";
      persistenceHydrated.value = true;
      return;
    }
    catch {
      localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    }
  }
  const legacyDocument = localStorage.getItem(LEGACY_DASHBOARD_DOCUMENT_STORAGE_KEY);
  if (legacyDocument) {
    try {
      restoreDashboardDocument(JSON.parse(legacyDocument) as DashboardDocument);
      persistenceHydrated.value = true;
      persistDashboard();
      return;
    }
    catch {
      localStorage.removeItem(LEGACY_DASHBOARD_DOCUMENT_STORAGE_KEY);
    }
  }
  const serialized = localStorage.getItem(LEGACY_DASHBOARD_STORAGE_KEY);
  if (!serialized) {
    persistenceHydrated.value = true;
    persistDashboard();
    return;
  }
  try {
    const saved = JSON.parse(serialized) as {
      pageTitle?: string;
      pageHeading?: string;
      pageDescription?: string;
      groups?: DashboardGroup[];
      blockOrder?: DashboardBlockReference[];
      charts?: DashboardChart[];
      maps?: DashboardMap[];
      indicators?: DashboardIndicator[];
      textBlocks?: DashboardTextBlock[];
    };
    pageTitle.value = "Expérimentation de composition des tableaux de bord";
    pageHeading.value = !saved.pageHeading || saved.pageHeading === "Vue d’ensemble" ? "Titre de la page" : saved.pageHeading;
    pageDescription.value = !saved.pageDescription || saved.pageDescription.startsWith("Composez une vue") ? "Décrivez ici votre page." : saved.pageDescription;
    if (saved.groups?.length) groups.value = saved.groups.map(group => ({
      ...group,
      title: group.title === "Vue d’ensemble" ? "Section" : group.title,
      filters: group.filters.map(filter => ({ ...filter, column: filter.column ?? "" })),
    }));
    if (saved.blockOrder) blockOrder.value = saved.blockOrder;
    if (saved.charts) charts.value = saved.charts.map(chart => ({ ...chart, definition: chartDefinition(chart) }));
    if (saved.maps) maps.value = saved.maps.map(map => ({ ...map, definition: mapDefinition(map) }));
    if (saved.indicators) indicators.value = saved.indicators.map(indicator => ({ ...indicator, definition: indicatorDefinition(indicator) }));
    if (saved.textBlocks) textBlocks.value = saved.textBlocks;
    targetGroupId.value = groups.value[0]?.id ?? defaultGroupId;
    persistenceHydrated.value = true;
    persistDashboard();
  }
  catch {
    localStorage.removeItem(LEGACY_DASHBOARD_STORAGE_KEY);
    persistenceHydrated.value = true;
    persistDashboard();
  }
});

watch(
  [pageTitle, pageHeading, pageDescription, groups, blockOrder, charts, maps, indicators, textBlocks],
  schedulePersistence,
  { deep: true },
);

function closeBuilder() {
  builderOpen.value = false;
  editingChartId.value = null;
  editingMapId.value = null;
  editingIndicatorId.value = null;
  activeDraft.value = null;
}

async function toggleAssistant(force?: boolean) {
  assistantOpen.value = force ?? !assistantOpen.value;
  if (assistantOpen.value && !activeSchema.value) await loadBuilderResource();
}

function applyDatasetResourceChoice(resourceId: string) {
  const choice = datasetResourceChoices.value.find(resource => resource.id === resourceId && resource.parquetUrl);
  if (!choice?.parquetUrl) return;
  selectedDatasetResourceId.value = choice.id;
  selectedResourceOverride.value = {
    ...selectedDataset.value,
    parquetUrl: choice.parquetUrl,
    resourceName: choice.title,
  };
}

async function loadDatasetResourceChoices(preferredUrl?: string) {
  datasetResourcesLoading.value = true;
  datasetResourcesError.value = "";
  try {
    const response = await $fetch<{ resources: DatagouvDatasetResource[] }>("/nuxt-api/datasets/resources", {
      query: { dataset: selectedDataset.value.datasetReference },
    });
    datasetResourceChoices.value = response.resources;
    const preferred = response.resources.find(resource => resource.parquetUrl === preferredUrl)
      ?? response.resources.find(resource => Boolean(resource.parquetUrl));
    if (!preferred?.parquetUrl) throw new Error("Ce jeu de données ne contient aucune ressource tabulaire compatible.");
    applyDatasetResourceChoice(preferred.id);
  }
  catch (reason) {
    datasetResourcesError.value = reason instanceof Error ? reason.message : "Les ressources ne sont pas disponibles.";
    datasetResourceChoices.value = [{ id: selectedDataset.value.id, title: resourceContextName(selectedDataset.value), format: "PARQUET", url: selectedDataset.value.parquetUrl, parquetUrl: selectedDataset.value.parquetUrl }];
    applyDatasetResourceChoice(datasetResourceChoices.value[0]!.id);
  }
  finally {
    datasetResourcesLoading.value = false;
  }
}

async function selectDataset(resourceId: string) {
  selectedResourceId.value = resourceId;
  selectedResourceOverride.value = null;
  agentDraft.value = null;
  agentMapDraft.value = null;
  clearAgentError();
  toolRuntime.reset();
  await loadDatasetResourceChoices();
  await loadBuilderResource();
}

async function selectDatasetResource(resourceId: string) {
  applyDatasetResourceChoice(resourceId);
  agentDraft.value = null;
  agentMapDraft.value = null;
  clearAgentError();
  toolRuntime.reset();
  await loadBuilderResource();
}

async function submitNaturalLanguage(prompt = naturalLanguagePrompt.value) {
  const request = prompt.trim();
  if (!request || agentResponding.value || !activeSchema.value) return;
  naturalLanguagePrompt.value = "";
  naturalLanguageError.value = "";
  agentDraft.value = null;
  agentMapDraft.value = null;
  clearAgentError();
  toolRuntime.reset();
  try {
    await sendAgentMessage({
      text: request,
      metadata: { createdAt: new Date().toISOString() },
    });
  }
  catch (reason) {
    naturalLanguageError.value = reason instanceof Error
      ? reason.message
      : "L’assistant n’a pas pu préparer le graphique.";
  }
}

async function resolveAgentClarification(toolCallId: string, choice: string) {
  await addToolOutput({
    tool: "request_clarification",
    toolCallId,
    output: { choice },
  });
}

async function retryAgent() {
  const question = [...agentMessages.value].reverse().find(message => message.role === "user");
  const text = question?.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("\n")
    .trim();
  if (text) await submitNaturalLanguage(text);
}

function discardAgentProposal() {
  agentDraft.value = null;
  agentMapDraft.value = null;
}

async function applyAgentProposal() {
  targetGroupId.value = selectedBlockReference.value?.groupId ?? assistantTargetGroup.value?.id ?? groups.value[0]!.id;
  await saveChart();
}

function editAgentProposalManually() {
  if (!proposalKind.value) return;
  targetGroupId.value = selectedBlockReference.value?.groupId ?? assistantTargetGroup.value?.id ?? groups.value[0]!.id;
  visualizationKind.value = proposalKind.value;
  panelMode.value = "sql";
  builderOpen.value = true;
  assistantOpen.value = false;

  if (!proposalReplacesSelection.value) {
    selectedBlockId.value = null;
    editingChartId.value = null;
    editingMapId.value = null;
    editingIndicatorId.value = null;
    activeDraft.value = {
      blockId: null,
      kind: proposalKind.value,
      title: selectedTitle.value,
      description: selectedDescription.value,
      size: selectedSize.value,
      sql: selectedSql.value,
      specJson: selectedSpecJson.value,
      rows: [],
      indicatorValue: null,
      error: "",
    };
  }

  discardAgentProposal();
  scheduleManualPreview();
}

function canContinue() {
  return Boolean(selectedSql.value.trim() && selectedSpecJson.value.trim());
}

async function saveChart() {
  if (visualizationKind.value === "map") return saveMap();
  if (visualizationKind.value === "indicator") return saveIndicator();
  if (!selectedSql.value.trim() || !selectedSpecJson.value.trim()) return;
  builderLoading.value = true;
  builderError.value = "";
  try {
    const assistantProposal = agentDraft.value && (assistantOpen.value || panelMode.value === "assistant") ? agentDraft.value : null;
    let resultRows: DatasetRow[];
    let parsedSpec: ChartSpec;
    if (assistantProposal) {
      resultRows = assistantProposal.rows;
      parsedSpec = assistantProposal.spec;
    }
    else {
      await dataset.load(selectedResource.value);
      const result = await dataset.executeSql(applyBlockFilters(selectedSql.value, selectedBlockFilters.value));
      resultRows = result.rows;
      parsedSpec = JSON.parse(selectedSpecJson.value) as ChartSpec;
    }
    if (!parsedSpec.type || !parsedSpec.xField || !Array.isArray(parsedSpec.series)) throw new Error("La spécification du graphique est incomplète.");
    const draftedSpec = parsedSpec;
    const definition = currentVisualizationDefinition(draftedSpec) as ChartDefinition;
    const validation = validateDashboardVisualization(definition, resultRows);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    visualizationDraft.value = definition;
    savedVisualizationDefinition.value = structuredClone(toRaw(definition));
    visualizationIsDirty.value = false;
    const previousChart = editingChartId.value ? getChart(editingChartId.value) : undefined;
    const chart: DashboardChart = {
      id: editingChartId.value
        ?? (assistantOpen.value && selectedBlockId.value && getChart(selectedBlockId.value) ? selectedBlockId.value : crypto.randomUUID()),
      resource: selectedResource.value,
      type: draftedSpec.type,
      title: draftedSpec.title || selectedTitle.value.trim() || suggestedTitle.value,
      description: draftedSpec.description || selectedDescription.value.trim() || defaultDescription(),
      dimension: draftedSpec.xField,
      aggregation: selectedAggregation.value,
      measure: selectedAggregation.value === "count" ? undefined : selectedMeasure.value,
      seriesConfig: structuredClone(toRaw(selectedAdditionalSeries.value)),
      limit: selectedLimit.value,
      size: selectedSize.value,
      rows: resultRows,
      spec: draftedSpec,
      sql: selectedSql.value,
      filters: structuredClone(toRaw(selectedBlockFilters.value)),
      appearance: chartAppearance(),
      definition,
      revision: (previousChart?.revision ?? 0) + 1,
      savedAt: new Date().toISOString(),
    };
    const existingIndex = charts.value.findIndex(item => item.id === chart.id);
    if (existingIndex >= 0) charts.value.splice(existingIndex, 1, chart);
    else {
      charts.value.push(chart);
      insertBlockReference({ id: chart.id, kind: "chart", groupId: targetGroupId.value });
    }
    closeBuilder();
  }
  catch (reason) {
    builderError.value = reason instanceof Error ? reason.message : "Le graphique n’a pas pu être créé.";
  }
  finally {
    builderLoading.value = false;
  }
}

async function editChart(chart: DashboardChart) {
  resetBuilder();
  const definition = chartDefinition(chart);
  visualizationDraft.value = structuredClone(toRaw(definition));
  savedVisualizationDefinition.value = structuredClone(toRaw(definition));
  selectedBlockId.value = chart.id;
  editingChartId.value = chart.id;
  selectedResourceId.value = chart.resource.id;
  selectedType.value = chart.type;
  selectedDimension.value = chart.dimension;
  selectedAggregation.value = chart.aggregation;
  selectedMeasure.value = chart.measure ?? "";
  selectedAdditionalSeries.value = structuredClone(toRaw(chart.seriesConfig ?? []));
  selectedLimit.value = chart.limit;
  selectedSize.value = definition.size;
  selectedTitle.value = definition.title;
  selectedDescription.value = definition.description;
  selectedBlockFilters.value = structuredClone(toRaw(definition.filters));
  const appearance = definition.appearance;
  selectedChartOrientation.value = appearance?.orientation ?? (chart.type === "bar" ? "horizontal" : "vertical");
  selectedChartPalette.value = Object.entries(chartPalettes).find(([, palette]) => JSON.stringify(palette) === JSON.stringify(appearance?.palette))?.[0] ?? "default";
  selectedShowLegend.value = appearance?.showLegend ?? chart.type === "pie";
  selectedShowValues.value = appearance?.showValues ?? chart.type === "bar";
  const savedSql = definition.data.query;
  const savedSpecJson = JSON.stringify(definition.specification, null, 2);
  panelMode.value = "sql";
  builderOpen.value = true;
  activeDraft.value = { blockId: chart.id, kind: "chart", title: chart.title, description: chart.description, size: chart.size, sql: savedSql, specJson: savedSpecJson, rows: chart.rows, indicatorValue: null, error: "" };
  await loadDatasetResourceChoices(chart.resource.parquetUrl);
  await loadBuilderResource(true);
  selectedSql.value = savedSql;
  selectedSpecJson.value = savedSpecJson;
  const normalizedDefinition = currentVisualizationDefinition(definition.specification);
  visualizationDraft.value = normalizedDefinition;
  savedVisualizationDefinition.value = structuredClone(toRaw(normalizedDefinition));
  beginTrackingVisualizationChanges();
}

function duplicateChart(chart: DashboardChart) {
  const index = charts.value.findIndex(item => item.id === chart.id);
  const id = crypto.randomUUID();
  charts.value.splice(index + 1, 0, {
    ...chart,
    id,
    title: `${chart.title} — copie`,
    rows: [...chart.rows],
  });
  const blockIndex = blockOrder.value.findIndex(block => block.id === chart.id);
  blockOrder.value.splice(blockIndex + 1, 0, { id, kind: "chart", groupId: blockOrder.value[blockIndex]?.groupId ?? groups.value[0]!.id });
}

function removeChart(chartId: string) {
  charts.value = charts.value.filter(chart => chart.id !== chartId);
  blockOrder.value = blockOrder.value.filter(block => block.id !== chartId);
}

async function saveMap() {
  builderLoading.value = true;
  builderError.value = "";
  try {
    if (!selectedSql.value.trim() || !selectedSpecJson.value.trim()) throw new Error("La requête SQL et la spécification sont requises.");
    const assistantProposal = agentMapDraft.value && (assistantOpen.value || panelMode.value === "assistant") ? agentMapDraft.value : null;
    let rows: DatasetRow[];
    let spec: MapSpec;
    if (assistantProposal) {
      rows = assistantProposal.result.rows;
      spec = assistantProposal.result.resolvedSpec;
    }
    else {
      await dataset.load(selectedResource.value);
      const result = await dataset.executeSql(applyBlockFilters(selectedSql.value, selectedBlockFilters.value));
      rows = result.rows;
      spec = JSON.parse(selectedSpecJson.value) as MapSpec;
    }
    if (!spec.type || !spec.title) throw new Error("La spécification de la carte est incomplète.");
    const definition = currentVisualizationDefinition(spec) as MapDefinition;
    const validation = validateDashboardVisualization(definition, rows);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    visualizationDraft.value = definition;
    savedVisualizationDefinition.value = structuredClone(toRaw(definition));
    visualizationIsDirty.value = false;
    const id = editingMapId.value
      ?? (assistantOpen.value && selectedBlockId.value && getMap(selectedBlockId.value) ? selectedBlockId.value : crypto.randomUUID());
    const previousMap = getMap(id);
    const map = {
      id,
      resource: selectedResource.value,
      title: spec.title,
      size: selectedSize.value,
      rows,
      spec,
      sql: selectedSql.value,
      filters: structuredClone(toRaw(selectedBlockFilters.value)),
      appearance: mapAppearance(),
      definition,
      revision: (previousMap?.revision ?? 0) + 1,
      savedAt: new Date().toISOString(),
    };
    const existingIndex = maps.value.findIndex(item => item.id === id);
    if (existingIndex >= 0) maps.value.splice(existingIndex, 1, map);
    else {
      maps.value.push(map);
      insertBlockReference({ id, kind: "map", groupId: targetGroupId.value });
    }
    closeBuilder();
  }
  catch (reason) {
    builderError.value = reason instanceof Error ? reason.message : "La carte n’a pas pu être créée.";
  }
  finally { builderLoading.value = false; }
}

async function editMap(map: DashboardMap) {
  selectedBlockId.value = map.id;
  resetBuilder();
  const definition = mapDefinition(map);
  visualizationDraft.value = structuredClone(toRaw(definition));
  savedVisualizationDefinition.value = structuredClone(toRaw(definition));
  editingMapId.value = map.id;
  visualizationKind.value = "map";
  selectedResourceId.value = map.resource.id;
  selectedTitle.value = definition.title;
  selectedDescription.value = definition.description;
  selectedSize.value = definition.size;
  selectedMapType.value = definition.specification.type === "choropleth" ? "choropleth" : "points";
  if (definition.specification.type === "choropleth") selectedMapBoundary.value = definition.specification.boundary;
  selectedBlockFilters.value = structuredClone(toRaw(definition.filters));
  selectedMapBasemap.value = definition.appearance.basemap;
  selectedMapPalette.value = Object.entries(mapPalettes).find(([, palette]) => JSON.stringify(palette) === JSON.stringify(definition.appearance.fillPalette))?.[0] ?? "blue";
  selectedMapOpacity.value = definition.appearance.fillOpacity;
  selectedMapShowLegend.value = definition.appearance.showLegend;
  panelMode.value = "sql";
  builderOpen.value = true;
  activeDraft.value = { blockId: map.id, kind: "map", title: definition.title, description: definition.description, size: definition.size, sql: definition.data.query, specJson: JSON.stringify(definition.specification, null, 2), rows: map.rows, indicatorValue: null, error: "" };
  await loadDatasetResourceChoices(map.resource.parquetUrl);
  await loadBuilderResource(true);
  selectedSql.value = definition.data.query;
  selectedSpecJson.value = JSON.stringify(definition.specification, null, 2);
  const normalizedDefinition = currentVisualizationDefinition(definition.specification);
  visualizationDraft.value = normalizedDefinition;
  savedVisualizationDefinition.value = structuredClone(toRaw(normalizedDefinition));
  beginTrackingVisualizationChanges();
}

async function saveIndicator() {
  builderLoading.value = true;
  builderError.value = "";
  try {
    await dataset.load(selectedResource.value);
    const result = await dataset.executeSql(applyBlockFilters(selectedSql.value, selectedBlockFilters.value));
    const spec = JSON.parse(selectedSpecJson.value) as DashboardIndicatorSpec;
    const value = result.rows[0]?.[spec.valueField ?? "value"];
    if (typeof value !== "string" && typeof value !== "number") throw new Error("La requête doit retourner une valeur pour l’indicateur.");
    const definition = currentVisualizationDefinition(spec) as IndicatorDefinition;
    const validation = validateDashboardVisualization(definition, result.rows);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    visualizationDraft.value = definition;
    savedVisualizationDefinition.value = structuredClone(toRaw(definition));
    visualizationIsDirty.value = false;
    const id = editingIndicatorId.value ?? crypto.randomUUID();
    const previousIndicator = getIndicator(id);
    const indicator: DashboardIndicator = {
      id,
      resource: selectedResource.value,
      title: spec.title || selectedTitle.value || "Indicateur",
      description: spec.description || selectedDescription.value,
      value,
      unit: spec.unit ?? selectedUnit.value,
      size: selectedSize.value,
      sql: selectedSql.value,
      filters: structuredClone(toRaw(selectedBlockFilters.value)),
      definition,
      revision: (previousIndicator?.revision ?? 0) + 1,
      savedAt: new Date().toISOString(),
    };
    const existingIndex = indicators.value.findIndex(item => item.id === id);
    if (existingIndex >= 0) indicators.value.splice(existingIndex, 1, indicator);
    else {
      indicators.value.push(indicator);
      insertBlockReference({ id, kind: "indicator", groupId: targetGroupId.value });
    }
    closeBuilder();
  }
  catch (reason) {
    builderError.value = reason instanceof Error ? reason.message : "L’indicateur n’a pas pu être créé.";
  }
  finally { builderLoading.value = false; }
}

async function editIndicator(indicator: DashboardIndicator) {
  resetBuilder();
  const definition = indicatorDefinition(indicator);
  visualizationDraft.value = structuredClone(toRaw(definition));
  savedVisualizationDefinition.value = structuredClone(toRaw(definition));
  selectedBlockId.value = indicator.id;
  editingIndicatorId.value = indicator.id;
  visualizationKind.value = "indicator";
  selectedResourceId.value = indicator.resource.id;
  selectedTitle.value = definition.title;
  selectedDescription.value = definition.description;
  selectedUnit.value = definition.specification.unit ?? "";
  selectedSize.value = definition.size;
  selectedBlockFilters.value = structuredClone(toRaw(definition.filters));
  const savedSql = definition.data.query;
  const savedSpecJson = JSON.stringify(definition.specification, null, 2);
  panelMode.value = "sql";
  builderOpen.value = true;
  activeDraft.value = { blockId: indicator.id, kind: "indicator", title: indicator.title, description: indicator.description, size: indicator.size, sql: savedSql, specJson: savedSpecJson, rows: [], indicatorValue: indicator.value, error: "" };
  await loadDatasetResourceChoices(indicator.resource.parquetUrl);
  await loadBuilderResource(true);
  selectedSql.value = savedSql;
  selectedSpecJson.value = savedSpecJson;
  const normalizedDefinition = currentVisualizationDefinition(definition.specification);
  visualizationDraft.value = normalizedDefinition;
  savedVisualizationDefinition.value = structuredClone(toRaw(normalizedDefinition));
  beginTrackingVisualizationChanges();
}

function removeIndicator(id: string) {
  indicators.value = indicators.value.filter(indicator => indicator.id !== id);
  blockOrder.value = blockOrder.value.filter(block => block.id !== id);
}

function removeMap(id: string) {
  maps.value = maps.value.filter(map => map.id !== id);
  blockOrder.value = blockOrder.value.filter(block => block.id !== id);
}

useSeoMeta({
  title: "Tableau de bord de visualisations — Expérience",
  description: "Laboratoire non référencé de création de tableaux de bord à partir de ressources data.gouv.fr.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <main class="min-h-dvh bg-[#f6f6f6] text-[#161616]">
    <header v-if="!previewMode" class="sticky top-0 z-30 border-b border-[#e5e5e5] bg-white/95 backdrop-blur-sm">
      <div class="mx-auto flex min-h-[68px] w-full max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-[11px] text-[#666666]">
            <NuxtLink class="agent-focusable inline-flex items-center gap-1 text-[#000091] underline underline-offset-4" to="/">
              <i aria-hidden="true" class="ri-arrow-left-line text-[14px]" />
              Accueil
            </NuxtLink>
            <span aria-hidden="true">/</span>
            <span>Expérience non référencée</span>
          </div>
          <h1 class="mt-1 text-[18px] font-bold leading-6">Expérimentation de composition des tableaux de bord</h1>
        </div>
      </div>
    </header>

    <button v-if="previewMode" class="agent-focusable fixed right-4 top-4 z-50 inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#161616] shadow-[0_3px_12px_rgba(0,0,0,0.12)] hover:border-[#000091] hover:text-[#000091]" type="button" @click="togglePreviewMode"><i aria-hidden="true" class="ri-edit-line text-[15px]" />Revenir à l’édition</button>

    <div
      class="t-dashboard-workspace"
      :style="{
        '--dashboard-left-panel': assistantOpen ? `${assistantWidth}px` : '0px',
        '--dashboard-right-panel': builderOpen ? `${builderWidth}px` : '0px',
      }"
    >
    <div class="t-dashboard-layout min-h-0 w-full bg-[#ededed] p-3 sm:p-4 lg:p-5">
      <div class="mx-auto flex min-h-[640px] w-full max-w-[90rem] flex-col overflow-hidden bg-white" :class="previewMode ? 'h-[calc(100dvh-40px)] rounded-none border-0 shadow-none lg:rounded-md' : 'h-[calc(100dvh-108px)] rounded-md border border-[#d5d5d5] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'">
        <header v-if="!previewMode" class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#e5e5e5] bg-[#f6f6f6] px-4">
          <div class="flex min-w-0 items-center gap-2 text-[10px]" :class="persistenceStatus === 'error' ? 'text-[#ce0500]' : 'text-[#666666]'">
            <i aria-hidden="true" :class="persistenceStatus === 'saving' ? 'ri-loader-4-line animate-spin' : persistenceStatus === 'error' ? 'ri-error-warning-line' : 'ri-cloud-line'" class="shrink-0 text-[13px]" />
            <span class="truncate">{{ persistenceLabel }}</span>
            <button class="agent-focusable hidden shrink-0 rounded px-1.5 py-1 text-[10px] text-[#666666] underline underline-offset-2 hover:bg-white sm:inline-flex" title="Supprimer les données locales de cette expérimentation" type="button" @click="resetLocalDashboard">Réinitialiser</button>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button class="agent-focusable inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#555555] hover:border-[#000091] hover:text-[#000091]" type="button" @click="togglePreviewMode"><i aria-hidden="true" class="ri-eye-line text-[15px]" />Prévisualiser</button>
            <button class="agent-focusable inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-[#000091] px-3 text-[12px] font-medium text-[#000091] hover:bg-[#f5f5fe]" :class="assistantOpen ? 'bg-[#f5f5fe]' : 'bg-white'" type="button" @click="toggleAssistant()"><i aria-hidden="true" class="ri-sparkling-line text-[15px]" />Assistant</button>
          </div>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8" @click.self="selectedBlockId = null; builderOpen = false">
      <section class="mb-5">
        <div class="w-full">
          <template v-if="previewMode"><h1 class="text-[24px] font-bold leading-8">{{ pageHeading }}</h1><p class="mt-1 text-[13px] leading-5 text-[#555555]">{{ pageDescription }}</p></template>
          <template v-else><input v-model="pageHeading" aria-label="Titre de la page" class="block w-full border-0 bg-transparent p-0 text-[24px] font-bold leading-8 outline-none focus-visible:ring-2 focus-visible:ring-[#000091]" placeholder="Titre de la page"><textarea v-model="pageDescription" aria-label="Description de la page" rows="2" class="mt-1 block w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-5 text-[#555555] outline-none focus-visible:ring-2 focus-visible:ring-[#000091]" placeholder="Décrivez ici votre page." /></template>
        </div>
      </section>

      <div class="space-y-6">
        <section v-for="group in groups" :key="group.id" class="rounded-md border bg-white p-4 transition-[border-color,box-shadow] sm:p-5" :class="groupIsSelected(group.id) ? 'border-[#cacafb] shadow-[0_0_0_1px_#cacafb]' : 'border-[#e5e5e5]'">
          <header class="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#e5e5e5] pb-4">
            <div class="min-w-0 flex-1">
              <template v-if="previewMode"><h2 class="text-[18px] font-semibold leading-6">{{ group.title }}</h2><p class="mt-1 text-[12px] leading-5 text-[#666666]">{{ group.description }}</p></template>
              <template v-else><input v-model="group.title" :aria-label="`Titre du groupe ${group.title}`" class="w-full border-0 bg-transparent p-0 text-[18px] font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[#000091]"><textarea v-model="group.description" :aria-label="`Description du groupe ${group.title}`" rows="2" class="mt-1 block w-full resize-none border-0 bg-transparent p-0 text-[12px] leading-5 text-[#666666] outline-none focus-visible:ring-2 focus-visible:ring-[#000091]" /></template>
            </div>
            <div v-if="!previewMode" class="flex items-center gap-1">
              <button class="agent-focusable inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e5] px-2.5 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="addGroupFilter(group)"><i aria-hidden="true" class="ri-add-line text-[14px]" />Ajouter un filtre</button>
              <button v-if="groups.length > 1" class="agent-focusable grid size-8 place-items-center rounded-md text-[#ce0500] hover:bg-[#fef4f4]" title="Supprimer le groupe" type="button" @click="removeGroup(group.id)"><i aria-hidden="true" class="ri-delete-bin-line text-[14px]" /></button>
            </div>
          </header>

          <div v-if="group.filters.length" class="mb-4 flex flex-wrap gap-3 rounded-md bg-[#f6f6f6] p-3">
            <div v-for="filter in group.filters" :key="filter.id" class="group/filter min-w-[180px] flex-1 sm:max-w-[260px]">
              <div class="flex items-center justify-between gap-2">
                <span v-if="previewMode" class="text-[10px] font-medium uppercase tracking-[0.04em] text-[#666666]">{{ filter.label }}</span>
                <input v-else v-model="filter.label" aria-label="Nom du filtre" class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[10px] font-medium uppercase tracking-[0.04em] text-[#666666] outline-none focus-visible:ring-2 focus-visible:ring-[#000091]">
                <button v-if="!previewMode" class="agent-focusable grid size-5 place-items-center rounded text-[#777777] opacity-0 hover:bg-white hover:text-[#ce0500] group-hover/filter:opacity-100" title="Supprimer le filtre" type="button" @click="removeGroupFilter(group, filter.id)"><i aria-hidden="true" class="ri-close-line text-[13px]" /></button>
              </div>
              <select v-if="!previewMode" v-model="filter.column" class="mt-1 h-7 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[10px] text-[#555555]" aria-label="Colonne filtrée" @change="updateGroupFilterOptions(filter)"><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select>
              <select v-model="filter.value" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px] text-[#161616] outline-none focus:border-[#000091] focus:ring-1 focus:ring-[#000091]">
                <option v-for="option in filter.options" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-6">
        <template v-for="(block, index) in groupBlocks(group.id)" :key="block.data.id">
          <article
            :draggable="!previewMode"
            class="group relative min-w-0 cursor-pointer rounded-md pb-4"
            :class="[blockSizeClass(displayedBlockSize(block)), draggedBlockId === block.data.id ? 'opacity-40' : 'opacity-100', selectedBlockId === block.data.id ? 'ring-2 ring-[#000091] ring-offset-2' : '']"
            @click.capture="handleDashboardBlockClick(block, $event)"
            @dragenter.prevent="draggedBlockId && draggedBlockId !== block.data.id && (dropTarget = { groupId: group.id, index })"
            @dragover.prevent="draggedBlockId && draggedBlockId !== block.data.id && (dropTarget = { groupId: group.id, index })"
            @drop="dropBlock(group.id, index)"
            @dragstart="draggedBlockId = block.data.id"
            @dragend="finishDragging"
          >
            <div v-if="dropTargetIs(group.id, index)" class="pointer-events-none absolute inset-y-0 -left-2 z-20 w-1 rounded-full bg-[#000091] shadow-[0_0_0_3px_#ececfe]" />
            <div v-if="!previewMode" class="mb-1 flex h-7 cursor-grab items-center justify-between px-1 opacity-100 active:cursor-grabbing lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <div class="flex items-center gap-1 text-[11px] text-[#666666]"><i aria-hidden="true" class="ri-draggable text-[14px]" /><span>{{ block.kind === "text" ? "Texte Markdown" : block.kind === "map" ? "Carte" : block.kind === "indicator" ? "Indicateur" : chartTypeLabel(block.data.type) }}</span></div>
              <div class="flex items-center gap-1">
                <button v-if="block.kind === 'text'" :aria-label="editingTextBlockId === block.data.id ? 'Enregistrer et afficher l’aperçu' : 'Modifier le Markdown'" class="agent-focusable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-white" :title="editingTextBlockId === block.data.id ? 'Enregistrer et afficher l’aperçu' : 'Modifier le Markdown'" type="button" @click.stop="toggleTextBlockEditing(block.data)"><i :class="editingTextBlockId === block.data.id ? 'ri-check-line' : 'ri-pencil-line'" class="text-[14px]" /></button>
                <button v-if="block.kind === 'chart'" class="agent-focusable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-white" title="Dupliquer" type="button" @click.stop="duplicateChart(block.data)"><i aria-hidden="true" class="ri-file-copy-line text-[14px]" /></button>
                <button v-if="block.kind === 'chart'" class="agent-focusable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-white" title="Modifier" type="button" @click.stop="editChart(block.data)"><i aria-hidden="true" class="ri-pencil-line text-[14px]" /></button>
                <button v-if="block.kind === 'map'" class="agent-focusable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-white" title="Modifier" type="button" @click.stop="editMap(block.data)"><i aria-hidden="true" class="ri-pencil-line text-[14px]" /></button>
                <button v-if="block.kind === 'indicator'" class="agent-focusable flex h-6 w-6 items-center justify-center rounded-md text-[#555555] hover:bg-white" title="Modifier" type="button" @click.stop="editIndicator(block.data)"><i aria-hidden="true" class="ri-pencil-line text-[14px]" /></button>
                <button class="agent-focusable flex h-6 w-6 items-center justify-center rounded-md text-[#ce0500] hover:bg-white" title="Supprimer" type="button" @click.stop="block.kind === 'text' ? removeTextBlock(block.data.id) : block.kind === 'map' ? removeMap(block.data.id) : block.kind === 'indicator' ? removeIndicator(block.data.id) : removeChart(block.data.id)"><i aria-hidden="true" class="ri-delete-bin-line text-[14px]" /></button>
              </div>
            </div>

            <div v-if="panelMode === 'sql' && manualPreviewError && ((block.kind === 'chart' && editingChartId === block.data.id) || (block.kind === 'map' && editingMapId === block.data.id) || (block.kind === 'indicator' && editingIndicatorId === block.data.id))" class="mb-2 flex items-start gap-2 rounded-md border border-[#ffbdbd] bg-[#fff4f4] px-3 py-2 text-[11px] leading-4 text-[#ce0500]">
              <i aria-hidden="true" class="ri-error-warning-line mt-0.5 shrink-0 text-[14px]" />
              <span><strong class="font-semibold">Cette configuration ne fonctionne pas.</strong><br>{{ manualPreviewError }} La dernière version valide reste affichée.</span>
            </div>

            <div v-if="filterErrorsByBlock[block.data.id]" role="alert" class="mb-2 flex items-start gap-2 rounded-md border border-[#ffca00] bg-[#fff7db] px-3 py-2 text-[11px] leading-4 text-[#5f4300]">
              <i aria-hidden="true" class="ri-filter-off-line mt-0.5 shrink-0 text-[14px]" />
              <div class="min-w-0">
                <strong class="font-semibold">Filtre non appliqué</strong>
                <p>{{ filterErrorsByBlock[block.data.id]?.message }}</p>
                <details class="mt-1">
                  <summary class="cursor-pointer font-medium underline underline-offset-2">Voir le détail technique</summary>
                  <p class="mt-1 break-words font-mono text-[10px] leading-4">{{ filterErrorsByBlock[block.data.id]?.detail }}</p>
                </details>
              </div>
            </div>

            <div v-if="block.kind === 'text'" class="rounded-md border border-[#e5e5e5] bg-white p-5">
              <template v-if="editingTextBlockId === block.data.id && activeDraft?.kind === 'text' && activeDraft.blockId === block.data.id">
                <input v-model="activeDraft.title" aria-label="Titre du bloc de texte" class="w-full border-0 bg-transparent p-0 text-[16px] font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[#000091]">
                <textarea v-model="activeDraft.content" aria-label="Contenu Markdown du bloc" rows="7" class="mt-2 w-full resize-y rounded-md border border-[#e5e5e5] bg-[#f6f6f6] p-3 font-mono text-[12px] leading-5 outline-none focus:border-[#000091]" />
                <p class="mt-1 text-[10px] text-[#777777]">Markdown pris en charge : titres, listes, liens, emphase et tableaux.</p>
              </template>
              <template v-else>
                <h3 class="text-[16px] font-semibold leading-6">{{ block.data.title }}</h3>
                <ExplorationMessageResponse class="mt-2" :content="block.data.content" />
              </template>
            </div>

            <ExplorationAgentChart v-else-if="block.kind === 'chart'" :appearance="chartAppearance(block.data)" :play-completion-sound="false" renderer="svg" :rows="displayedChartRows(block.data)" :source="chartSource(block.data.resource)" :spec="displayedChartSpec(block.data)" :truncated="false" />
            <ExplorationAgentMap v-else-if="block.kind === 'map'" :basemap="mapAppearance(block.data).basemap" :fill-opacity="mapAppearance(block.data).fillOpacity" :fill-palette="mapAppearance(block.data).fillPalette" :show-legend="mapAppearance(block.data).showLegend" :play-completion-sound="false" :rows="displayedMapRows(block.data)" :source="chartSource(block.data.resource)" :spec="displayedMapSpec(block.data)" :truncated="false" />
            <div v-else class="flex min-h-48 flex-col rounded-md border border-[#e5e5e5] bg-[#f5f5fe] p-5">
              <p class="text-[13px] font-semibold text-[#161616]">{{ displayedIndicatorTitle(block.data) }}</p>
              <p class="mt-1 text-[11px] leading-4 text-[#666666]">{{ displayedIndicatorDescription(block.data) }}</p>
              <p class="mt-auto pt-5 text-[32px] font-medium leading-none text-[#000091]">{{ displayedIndicatorValue(block.data) }}<span v-if="displayedIndicatorUnit(block.data)" class="ml-1 text-[16px]">{{ displayedIndicatorUnit(block.data) }}</span></p>
              <p class="mt-4 border-t border-[#cacafb] pt-2 text-[10px] text-[#666666]">Source : {{ block.data.resource.organization }}</p>
            </div>
          </article>
        </template>
        <article
          v-if="builderOpen && panelMode === 'sql' && targetGroupId === group.id && !editingChartId && !editingMapId && !editingIndicatorId && (manualPreviewRows.length || manualPreviewIndicatorValue !== null || manualPreviewError)"
          class="relative min-w-0 pb-4"
          :class="blockSizeClass(selectedSize)"
        >
          <div class="mb-1 flex h-7 items-center gap-1 px-1 text-[11px] font-medium text-[#000091]"><i aria-hidden="true" class="ri-eye-line text-[14px]" />Prévisualisation en direct</div>
          <ExplorationAgentChart v-if="visualizationKind === 'chart' && manualPreviewChartSpec" :appearance="chartAppearance()" :play-completion-sound="false" renderer="svg" :rows="manualPreviewRows" :source="chartSource(selectedResource)" :spec="manualPreviewChartSpec" :truncated="false" />
          <ExplorationAgentMap v-else-if="visualizationKind === 'map' && manualPreviewMapSpec" :basemap="mapAppearance().basemap" :fill-opacity="mapAppearance().fillOpacity" :fill-palette="mapAppearance().fillPalette" :show-legend="mapAppearance().showLegend" :play-completion-sound="false" :rows="manualPreviewRows" :source="chartSource(selectedResource)" :spec="manualPreviewMapSpec" :truncated="false" />
          <div v-else-if="visualizationKind === 'indicator' && manualPreviewIndicatorValue !== null" class="flex min-h-48 flex-col rounded-md border border-[#e5e5e5] bg-[#f5f5fe] p-5"><p class="text-[13px] font-semibold">{{ selectedTitle || aggregationLabel }}</p><p class="mt-1 text-[11px] text-[#666666]">{{ selectedDescription || 'Indicateur calculé à partir de la ressource.' }}</p><p class="mt-auto pt-5 text-[32px] font-medium leading-none text-[#000091]">{{ manualPreviewIndicatorValue }}<span v-if="selectedUnit" class="ml-1 text-[16px]">{{ selectedUnit }}</span></p></div>
          <div v-else class="flex min-h-72 flex-col items-center justify-center rounded-md border border-[#ffbdbd] bg-[#fff4f4] px-5 text-center text-[#ce0500]">
            <i aria-hidden="true" class="ri-error-warning-line text-[20px]" />
            <strong class="mt-2 text-[12px] font-semibold">Cette configuration ne fonctionne pas</strong>
            <p class="mt-1 max-w-sm text-[11px] leading-4">{{ manualPreviewError }}</p>
          </div>
        </article>
        <div
          class="t-resize group/insert relative md:col-span-6"
          :class="dropTargetIs(group.id, groupBlocks(group.id).length) ? 'h-24' : 'h-10'"
          @dragenter.prevent="draggedBlockId && (dropTarget = { groupId: group.id, index: groupBlocks(group.id).length })"
          @dragover.prevent="draggedBlockId && (dropTarget = { groupId: group.id, index: groupBlocks(group.id).length })"
          @drop="dropBlock(group.id, groupBlocks(group.id).length)"
        >
          <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-md transition-[height,background-color,border-color] duration-150" :class="dropTargetIs(group.id, groupBlocks(group.id).length) ? 'h-16 border border-dashed border-[#000091] bg-[#ececfe]' : 'h-px border border-transparent bg-transparent group-hover/insert:bg-[#cacafb]'"><span v-if="dropTargetIs(group.id, groupBlocks(group.id).length)" class="flex h-full items-center justify-center gap-1.5 text-[11px] font-medium text-[#000091]"><i aria-hidden="true" class="ri-drag-move-2-line text-[15px]" />Déposer le bloc ici</span></div>
        </div>
          </div>

          <div v-if="groupBlocks(group.id).length === 0 && !(builderOpen && panelMode === 'sql' && targetGroupId === group.id && (manualPreviewRows.length || manualPreviewIndicatorValue !== null || manualPreviewError))" class="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-[#c5c5c5] bg-[#fafafa] px-6 text-center">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#ececfe] text-[#000091]"><i aria-hidden="true" class="ri-layout-grid-line text-[18px]" /></div>
            <h3 class="mt-3 text-[14px] font-semibold">Ce groupe est vide</h3>
            <p class="mt-1 max-w-md text-[12px] leading-5 text-[#666666]">Ajoutez des blocs qui seront réunis sous ce titre et partageront les mêmes filtres.</p>
            <div v-if="!previewMode" class="relative mt-3"><button class="agent-focusable inline-flex h-8 items-center gap-1.5 rounded-md bg-[#000091] px-3 text-[11px] font-medium text-white" type="button" @click="groupAddMenuId = groupAddMenuId === group.id ? null : group.id"><i aria-hidden="true" class="ri-add-line text-[14px]" />Ajouter un élément<i aria-hidden="true" class="ri-arrow-down-s-line text-[14px]" /></button><div v-if="groupAddMenuId === group.id" class="absolute left-1/2 top-10 z-30 w-56 -translate-x-1/2 rounded-md border border-[#e5e5e5] bg-white p-1 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]"><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; addTextBlock(null, group.id)"><i aria-hidden="true" class="ri-text text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Texte</strong><span class="text-[11px] text-[#666666]">Titre, analyse ou commentaire</span></span></button><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; openBuilder('indicator', null, group.id)"><i aria-hidden="true" class="ri-hashtag text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Indicateur</strong><span class="text-[11px] text-[#666666]">Une valeur clé ou un total</span></span></button><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; openBuilder('chart', null, group.id)"><i aria-hidden="true" class="ri-bar-chart-box-line text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Graphique</strong><span class="text-[11px] text-[#666666]">Comparer ou suivre des valeurs</span></span></button><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; openBuilder('map', null, group.id)"><i aria-hidden="true" class="ri-map-2-line text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Carte</strong><span class="text-[11px] text-[#666666]">Points ou zones géographiques</span></span></button></div></div>
          </div>
          <div v-else-if="!previewMode" class="relative mt-2 flex justify-center border-t border-dashed border-[#c5c5c5] pt-3">
            <button class="agent-focusable inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e5] bg-white px-3 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="groupAddMenuId = groupAddMenuId === group.id ? null : group.id"><i aria-hidden="true" class="ri-add-line text-[14px]" />Ajouter un élément<i aria-hidden="true" class="ri-arrow-down-s-line text-[14px]" /></button>
            <div v-if="groupAddMenuId === group.id" class="absolute bottom-10 left-1/2 z-30 w-56 -translate-x-1/2 rounded-md border border-[#e5e5e5] bg-white p-1 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]"><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; addTextBlock(null, group.id)"><i aria-hidden="true" class="ri-text text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Texte</strong><span class="text-[11px] text-[#666666]">Titre, analyse ou commentaire</span></span></button><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; openBuilder('indicator', null, group.id)"><i aria-hidden="true" class="ri-hashtag text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Indicateur</strong><span class="text-[11px] text-[#666666]">Une valeur clé ou un total</span></span></button><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; openBuilder('chart', null, group.id)"><i aria-hidden="true" class="ri-bar-chart-box-line text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Graphique</strong><span class="text-[11px] text-[#666666]">Comparer ou suivre des valeurs</span></span></button><button class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-[#f6f6f6]" type="button" @click="groupAddMenuId = null; openBuilder('map', null, group.id)"><i aria-hidden="true" class="ri-map-2-line text-[16px] text-[#161616]" /><span><strong class="block text-[12px] font-medium">Carte</strong><span class="text-[11px] text-[#666666]">Points ou zones géographiques</span></span></button></div>
          </div>
        </section>

        <button v-if="!previewMode" class="agent-focusable flex min-h-14 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#929292] bg-white text-[12px] font-medium text-[#000091] hover:border-[#000091] hover:bg-[#f5f5fe]" type="button" @click="addGroup"><i aria-hidden="true" class="ri-add-line text-[16px]" />Ajouter un groupe</button>
      </div>
        </div>
      </div>
    </div>

      <aside v-if="assistantOpen" class="t-dashboard-assistant fixed bottom-0 left-0 top-[68px] z-[40] flex w-[calc(100vw-48px)] max-w-[430px] flex-col border-r border-[#777777] bg-[linear-gradient(to_bottom,rgb(249,249,255)_0%,rgb(255,255,255)_100%)] shadow-[4px_0_12px_rgba(0,0,0,0.05)] lg:sticky lg:bottom-auto lg:left-auto lg:z-auto lg:w-full lg:max-w-none" aria-label="Assistant du tableau de bord">
        <button aria-label="Redimensionner le panneau assistant" class="group absolute inset-y-0 -right-1 z-30 hidden w-2 cursor-col-resize lg:block" title="Glisser pour redimensionner · Double-cliquer pour réinitialiser" type="button" @dblclick="assistantWidth = DEFAULT_ASSISTANT_WIDTH" @mousedown="startPanelResize('assistant', $event)"><span class="mx-auto block h-full w-px bg-transparent group-hover:bg-[#000091]" /></button>
        <header class="flex min-h-14 items-center justify-between border-b border-[#e5e5e5] bg-[#f6f6f6] px-4">
          <div><p class="text-[11px] text-[#666666]">Visualisations</p><h2 class="text-[14px] font-semibold">Assistant</h2></div>
          <button class="agent-focusable grid size-8 place-items-center rounded-md text-[#555555] hover:bg-white" title="Replier l’assistant" type="button" @click="assistantOpen = false"><i aria-hidden="true" class="ri-sidebar-fold-line text-[17px]" /></button>
        </header>

        <ExplorationConversationScroller :message-count="agentMessages.length" :responding="agentResponding">
          <ExplorationAgentEmptyState
            v-if="agentMessages.length === 0"
            class="min-h-full"
            :ready="Boolean(activeSchema)"
            :ready-description="assistantEmptyDescription"
            :resource-title="selectedResource.title"
            :schema-columns="activeSchema?.columns ?? []"
            :suggestions="assistantSuggestions"
            title="Assistant de visualisation"
            @suggestion="naturalLanguagePrompt = $event"
          />
          <ExplorationAgentMessage
            v-for="(message, messageIndex) in agentMessages"
            :key="message.id"
            :message="message"
            :question="message.role === 'assistant' ? previousUserQuestion(messageIndex) : undefined"
            :responding="agentResponding && message.id === activeAssistantMessageId"
            :source="chartSource(selectedResource)"
            @click.capture="handleAgentVisualizationClick"
            @apply-proposal="() => undefined"
            @decline-proposal="() => undefined"
            @clarify="resolveAgentClarification"
            @dismiss-feedback-prompt="() => undefined"
            @edit="() => undefined"
            @recover="retryAgent"
          />
          <ExplorationAgentThinking v-if="showInitialThinking" />
          <ExplorationStatusMessage v-if="(naturalLanguageError || naturalLanguageAgentError) && !agentResponding" action-label="Réessayer" title="La proposition n’a pas pu être créée" :message="naturalLanguageError || naturalLanguageAgentError?.message || ''" tone="error" @action="retryAgent" />
        </ExplorationConversationScroller>

        <div v-if="proposalKind && !agentResponding" class="mx-3 mb-2 rounded-md border border-[#cacafb] bg-[#f5f5fe] p-3 text-[11px] leading-4 text-[#272747]">
          <div class="flex items-start gap-2">
            <i aria-hidden="true" :class="proposalKind === 'map' ? 'ri-map-2-line' : 'ri-bar-chart-box-line'" class="mt-0.5 shrink-0 text-[15px] text-[#000091]" />
            <div class="min-w-0">
              <p class="font-semibold">{{ proposalTitle }}</p>
              <dl class="mt-1 grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 text-[#555555]">
                <dt>Type</dt><dd>{{ proposalTypeLabel }}</dd>
                <dt>Destination</dt><dd class="truncate" :title="proposalDestinationLabel">{{ proposalDestinationLabel }}</dd>
                <dt>Source</dt><dd class="truncate" :title="selectedResource.title">{{ selectedResource.title }}</dd>
              </dl>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <button class="agent-focusable inline-flex h-7 items-center gap-1.5 rounded-md bg-[#000091] px-2.5 font-medium text-white" type="button" @click="applyAgentProposal"><i aria-hidden="true" class="ri-check-line text-[14px]" />{{ proposalActionLabel }}</button>
            <button class="agent-focusable inline-flex h-7 items-center gap-1.5 rounded-md border border-[#cacafb] bg-white px-2.5 font-medium text-[#000091]" type="button" @click="editAgentProposalManually"><i aria-hidden="true" class="ri-settings-3-line text-[14px]" />Modifier manuellement</button>
            <button class="agent-focusable inline-flex h-7 items-center rounded-md px-2 font-medium text-[#555555] hover:bg-white" type="button" @click="discardAgentProposal">Ignorer</button>
          </div>
        </div>

        <ExplorationAgentComposer
          v-model="naturalLanguagePrompt"
          v-model:selected-model-id="selectedModelId"
          :context-description="assistantContextDescription"
          :context-title="assistantContextTitle"
          :disabled="!activeSchema"
          :resource-organization="selectedResource.organization"
          :resource-title="selectedResource.title"
          :responding="agentResponding"
          @stop="stopAgent"
          @submit="submitNaturalLanguage()"
        />
      </aside>

      <aside v-if="builderOpen" class="t-dashboard-builder fixed bottom-0 right-0 top-[68px] z-[40] flex w-[calc(100vw-48px)] max-w-[430px] flex-col border-l border-[#777777] bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.05)] lg:sticky lg:bottom-auto lg:right-auto lg:z-auto lg:w-full lg:max-w-none" aria-label="Configurer le graphique">
          <button aria-label="Redimensionner le panneau de configuration" class="group absolute inset-y-0 -left-1 z-30 hidden w-2 cursor-col-resize lg:block" title="Glisser pour redimensionner · Double-cliquer pour réinitialiser" type="button" @dblclick="builderWidth = DEFAULT_BUILDER_WIDTH" @mousedown="startPanelResize('builder', $event)"><span class="mx-auto block h-full w-px bg-transparent group-hover:bg-[#000091]" /></button>
          <header class="flex min-h-14 items-center justify-between border-b border-[#e5e5e5] bg-[#f6f6f6] px-5">
            <div>
              <p class="text-[11px] text-[#666666]">Inspecteur · {{ selectedDashboardBlock ? "Bloc sélectionné" : "Nouveau bloc" }}</p>
              <div class="flex items-center gap-2"><h2 class="text-[14px] font-semibold">{{ visualizationKind === "map" ? "Carte" : visualizationKind === "indicator" ? "Indicateur" : "Graphique" }}</h2><span v-if="isEditingVisualization" class="rounded-full px-1.5 py-0.5 text-[10px]" :class="visualizationIsDirty ? 'bg-[#fff4f4] text-[#b34000]' : 'bg-[#e3fdeb] text-[#18753c]'">{{ visualizationIsDirty ? "Brouillon modifié" : "Version enregistrée" }}</span></div>
            </div>
            <div class="flex items-center gap-1">
              <button class="agent-focusable inline-flex h-8 items-center gap-1.5 rounded-md border border-[#cacafb] bg-white px-2.5 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="toggleAssistant(true)"><i aria-hidden="true" class="ri-sparkling-line text-[14px]" />Ouvrir l’assistant</button>
              <button class="agent-focusable flex h-8 w-8 items-center justify-center rounded-md text-[#555555] hover:bg-white" title="Replier la configuration" type="button" @click="closeBuilder"><i aria-hidden="true" class="ri-sidebar-unfold-line text-[17px]" /></button>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-5">
            <ExplorationStatusMessage v-if="builderError" class="mb-4" title="Configuration impossible" :message="builderError" tone="error" />
            <div v-if="builderLoading" class="py-8"><ExplorationAgentThinking label="Préparation des données" /></div>

            <template v-else>
              <section class="mb-4 rounded-md border border-[#e5e5e5] bg-white p-3" aria-labelledby="dashboard-source-title">
                <div class="flex items-start gap-2"><span class="grid size-5 shrink-0 place-items-center rounded-full bg-[#000091] text-[10px] font-semibold text-white">1</span><div class="min-w-0 flex-1"><h3 id="dashboard-source-title" class="text-[12px] font-semibold">Choisir les données</h3><p class="mt-0.5 text-[10px] leading-4 text-[#666666]">Sélectionnez d’abord le jeu de données, puis le fichier tabulaire à interroger.</p></div></div>
                <label class="mt-3 block text-[11px] font-medium text-[#555555]">Jeu de données
                  <select v-model="selectedResourceId" class="mt-1 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[12px]" @change="selectDataset(selectedResourceId)">
                    <option v-for="resource in explorationResources" :key="resource.id" :value="resource.id">{{ resource.title }}</option>
                  </select>
                </label>
                <p class="mt-1 text-[10px] text-[#777777]">{{ selectedDataset.organization }}</p>
                <label class="mt-3 block text-[11px] font-medium text-[#555555]">Ressource
                  <select v-model="selectedDatasetResourceId" :disabled="datasetResourcesLoading || !usableDatasetResources.length" class="mt-1 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[12px] disabled:bg-[#f6f6f6]" @change="selectDatasetResource(selectedDatasetResourceId)">
                    <option v-if="datasetResourcesLoading" value="">Chargement des ressources…</option>
                    <option v-for="resource in usableDatasetResources" :key="resource.id" :value="resource.id">{{ resource.title }} · {{ resource.format }}</option>
                  </select>
                </label>
                <p v-if="datasetResourcesError" class="mt-2 text-[10px] leading-4 text-[#b34000]">{{ datasetResourcesError }}</p>
                <div v-else-if="selectedResourceOverride" class="mt-3 flex items-start gap-2 rounded-sm bg-[#f5f5fe] px-2.5 py-2 text-[10px] leading-4 text-[#272747]"><i aria-hidden="true" class="ri-database-2-line mt-0.5 shrink-0 text-[13px] text-[#000091]" /><p><strong class="block font-medium">Source utilisée par ce bloc</strong><span>{{ resourceContextName(selectedResourceOverride) }}</span></p></div>
              </section>

              <section class="min-h-[560px] overflow-hidden rounded-md border border-[#e5e5e5] bg-white" aria-label="Configuration manuelle">
                <div class="min-h-0 overflow-y-auto p-5 text-[12px]">
                  <div class="space-y-5">
                    <div v-if="manualPreviewLoading || manualPreviewError" class="rounded-md border px-3 py-2 text-[11px] leading-4" :class="manualPreviewError ? 'border-[#ffbdbd] bg-[#fff4f4] text-[#ce0500]' : 'border-[#cacafb] bg-[#f5f5fe] text-[#272747]'">
                      <p class="flex items-start gap-2">
                        <i aria-hidden="true" :class="manualPreviewLoading ? 'ri-loader-4-line animate-spin' : manualPreviewError ? 'ri-error-warning-line' : 'ri-eye-line'" class="mt-0.5 shrink-0 text-[14px]" />
                        <span v-if="manualPreviewLoading">Actualisation de la prévisualisation…</span>
                        <span v-else-if="manualPreviewError"><strong class="font-semibold">Prévisualisation impossible.</strong><br>{{ manualPreviewError }}</span>
                      </p>
                    </div>
                    <fieldset class="rounded-md border border-[#e5e5e5] p-3">
                      <legend class="font-medium">Données transformées</legend>
                      <p class="mt-1 text-[11px] leading-4 text-[#666666]">Aperçu du résultat réellement transmis à la visualisation après la requête et les filtres.</p>
                      <ul v-if="manualPreviewWarnings.length" class="mt-2 space-y-1 text-[11px] leading-4 text-[#b34000]">
                        <li v-for="warning in manualPreviewWarnings" :key="warning" class="flex gap-1.5"><i aria-hidden="true" class="ri-alert-line mt-0.5 shrink-0 text-[13px]" />{{ warning }}</li>
                      </ul>
                      <div v-if="manualPreviewSample.length" class="mt-3 overflow-x-auto rounded-sm border border-[#e5e5e5]">
                        <table class="min-w-full border-collapse bg-white text-left font-mono text-[10px] leading-4">
                          <thead class="bg-[#f6f6f6] text-[#555555]"><tr><th v-for="column in manualPreviewColumns" :key="column" class="whitespace-nowrap border-b border-r border-[#e5e5e5] px-2 py-1.5 font-medium last:border-r-0">{{ column }}</th></tr></thead>
                          <tbody><tr v-for="(row, rowIndex) in manualPreviewSample" :key="rowIndex"><td v-for="column in manualPreviewColumns" :key="column" class="max-w-48 truncate whitespace-nowrap border-b border-r border-[#e5e5e5] px-2 py-1.5 last:border-r-0">{{ row[column] ?? "—" }}</td></tr></tbody>
                        </table>
                      </div>
                      <p v-if="manualPreviewRows.length" class="mt-2 text-[10px] text-[#777777]">{{ manualPreviewRows.length }} ligne{{ manualPreviewRows.length > 1 ? "s" : "" }} · {{ manualPreviewColumns.length }} colonne{{ manualPreviewColumns.length > 1 ? "s" : "" }} affichée{{ manualPreviewColumns.length > 1 ? "s" : "" }}</p>
                      <p v-else-if="!manualPreviewLoading && !manualPreviewError" class="mt-3 rounded-sm bg-[#f6f6f6] px-2.5 py-2 text-[11px] text-[#666666]">Renseignez la configuration pour prévisualiser les données.</p>
                    </fieldset>
                    <fieldset class="rounded-md border border-[#e5e5e5] p-3">
                      <div class="flex items-center justify-between gap-3">
                        <legend class="font-medium">Filtres du bloc</legend>
                        <button class="agent-focusable inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="addBlockFilter"><i aria-hidden="true" class="ri-add-line text-[14px]" />Ajouter</button>
                      </div>
                      <p v-if="!selectedBlockFilters.length" class="mt-2 text-[11px] leading-4 text-[#666666]">Aucun filtre propre à ce bloc. Les filtres du groupe restent appliqués.</p>
                      <div v-for="filter in selectedBlockFilters" :key="filter.id" class="mt-3 rounded-md bg-[#f6f6f6] p-2.5">
                        <div class="grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
                          <select v-model="filter.column" aria-label="Colonne à filtrer" class="h-8 min-w-0 rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]" @change="filter.semanticType = semanticTypeForField(filter.column)"><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select>
                          <select v-model="filter.operator" aria-label="Opérateur du filtre" class="h-8 rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="equals">Est égal à</option><option value="notEquals">Est différent de</option><option value="contains">Contient</option><option value="startsWith">Commence par</option><option value="endsWith">Se termine par</option><option value="greaterThan">Supérieur à</option><option value="greaterThanOrEqual">Supérieur ou égal</option><option value="lessThan">Inférieur à</option><option value="lessThanOrEqual">Inférieur ou égal</option><option value="between">Entre</option><option value="isEmpty">Est vide</option><option value="isNotEmpty">N’est pas vide</option></select>
                          <input v-if="filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty'" v-model="filter.value" aria-label="Valeur du filtre" class="h-8 min-w-0 rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]" placeholder="Valeur">
                          <button class="agent-focusable grid size-8 place-items-center rounded-md text-[#ce0500] hover:bg-white" title="Supprimer ce filtre" type="button" @click="removeBlockFilter(filter.id)"><i aria-hidden="true" class="ri-delete-bin-line text-[14px]" /></button>
                        </div>
                        <div v-if="filter.operator === 'between'" class="mt-2"><input v-model="filter.secondValue" aria-label="Valeur maximale" class="h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]" placeholder="Valeur maximale"></div>
                        <label v-if="['contains', 'startsWith', 'endsWith'].includes(filter.operator)" class="mt-2 inline-flex items-center gap-2 text-[10px] text-[#555555]"><input v-model="filter.caseSensitive" type="checkbox">Respecter la casse</label>
                      </div>
                    </fieldset>
                    <fieldset v-if="visualizationKind === 'chart'">
                      <legend class="font-medium">Type de graphique</legend>
                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <button v-for="type in chartTypes" :key="type.id" class="agent-focusable rounded-md border p-3 text-left" :class="type.id === selectedType ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5] hover:bg-[#f6f6f6]'" type="button" @click="selectedType = type.id">
                          <i aria-hidden="true" :class="[type.icon, 'text-[18px] text-[#000091]']" />
                          <strong class="mt-2 block font-medium">{{ type.label }}</strong>
                          <span class="mt-0.5 block text-[11px] leading-4 text-[#666666]">{{ type.description }}</span>
                        </button>
                      </div>
                    </fieldset>
                    <template v-if="visualizationKind === 'chart'"><label class="block"><span class="font-medium">Regrouper par</span><select v-model="selectedDimension" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label><label class="block"><span class="font-medium">Calcul</span><select v-model="selectedAggregation" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="count">Nombre de lignes</option><option value="countDistinct">Nombre de valeurs distinctes</option><option value="sum">Somme</option><option value="average">Moyenne</option></select></label><label v-if="selectedAggregation !== 'count'" class="block"><span class="font-medium">Colonne à mesurer</span><select v-model="selectedMeasure" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option v-for="column in selectedAggregation === 'countDistinct' ? dimensionColumns : numericColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label><label class="block"><span class="font-medium">Nombre de catégories</span><select v-model.number="selectedLimit" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option :value="5">5</option><option :value="10">10</option><option :value="15">15</option><option :value="20">20</option></select></label>
                      <fieldset class="rounded-md border border-[#e5e5e5] p-3">
                        <div class="flex items-center justify-between gap-2"><legend class="font-medium">Séries supplémentaires</legend><button class="agent-focusable inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[#000091] hover:bg-[#f5f5fe]" type="button" @click="addSeries"><i aria-hidden="true" class="ri-add-line text-[14px]" />Ajouter</button></div>
                        <p v-if="!selectedAdditionalSeries.length" class="mt-2 text-[11px] leading-4 text-[#666666]">Ajoutez une mesure pour comparer plusieurs séries sur le même graphique.</p>
                        <div v-for="(series, index) in selectedAdditionalSeries" :key="series.id" class="mt-3 rounded-md bg-[#f6f6f6] p-2.5">
                          <div class="flex items-center justify-between"><strong class="text-[11px] font-medium">Série {{ index + 2 }}</strong><button class="agent-focusable grid size-7 place-items-center rounded-md text-[#ce0500] hover:bg-white" title="Supprimer cette série" type="button" @click="removeSeries(series.id)"><i aria-hidden="true" class="ri-delete-bin-line text-[13px]" /></button></div>
                          <div class="mt-2 grid gap-2 sm:grid-cols-2"><select v-model="series.aggregation" class="h-8 rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="count">Nombre de lignes</option><option value="countDistinct">Valeurs distinctes</option><option value="sum">Somme</option><option value="average">Moyenne</option></select><select v-model="series.measure" class="h-8 rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="">Toutes les lignes</option><option v-for="column in series.aggregation === 'countDistinct' ? dimensionColumns : numericColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></div>
                          <input v-model="series.label" class="mt-2 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]" placeholder="Libellé de la série">
                        </div>
                      </fieldset>
                    </template>
                    <template v-else-if="visualizationKind === 'indicator'"><label class="block"><span class="font-medium">Calcul</span><select v-model="selectedAggregation" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="count">Nombre de lignes</option><option value="countDistinct">Nombre de valeurs distinctes</option><option value="sum">Somme</option><option value="average">Moyenne</option></select></label><label v-if="selectedAggregation !== 'count'" class="block"><span class="font-medium">Colonne à mesurer</span><select v-model="selectedMeasure" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option v-for="column in selectedAggregation === 'countDistinct' ? dimensionColumns : numericColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label><label class="block"><span class="font-medium">Unité</span><input v-model="selectedUnit" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] px-3" placeholder="%, festivals, €…"></label></template>
                    <template v-else>
                      <fieldset><legend class="font-medium">Type de carte</legend><div class="mt-2 grid grid-cols-2 gap-2"><button class="agent-focusable rounded-md border p-3 text-left" :class="selectedMapType === 'points' ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5]'" type="button" @click="selectedMapType = 'points'"><i aria-hidden="true" class="ri-map-pin-line text-[17px] text-[#000091]" /><strong class="mt-1 block font-medium">Points</strong></button><button class="agent-focusable rounded-md border p-3 text-left" :class="selectedMapType === 'choropleth' ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5]'" type="button" @click="selectedMapType = 'choropleth'"><i aria-hidden="true" class="ri-map-2-line text-[17px] text-[#000091]" /><strong class="mt-1 block font-medium">Choroplèthe</strong></button></div></fieldset>
                      <template v-if="selectedMapType === 'points'"><label class="block"><span class="font-medium">Champ de coordonnées</span><select v-model="selectedCoordinates" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="">Latitude et longitude séparées</option><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label><template v-if="!selectedCoordinates"><label class="block"><span class="font-medium">Latitude</span><select v-model="selectedLatitude" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="">Choisir une colonne</option><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label><label class="block"><span class="font-medium">Longitude</span><select v-model="selectedLongitude" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="">Choisir une colonne</option><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label></template><label class="block"><span class="font-medium">Libellé des points</span><select v-model="selectedLabel" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label></template>
                      <template v-else><label class="block"><span class="font-medium">Découpage géographique</span><select v-model="selectedMapBoundary" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="france-regions">Régions françaises</option><option value="france-departments">Départements français</option></select></label><label class="block"><span class="font-medium">Colonne géographique</span><select v-model="selectedDimension" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label><label class="block"><span class="font-medium">Calcul</span><select v-model="selectedAggregation" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option value="count">Nombre de lignes</option><option value="countDistinct">Nombre de valeurs distinctes</option><option value="sum">Somme</option><option value="average">Moyenne</option></select></label><label v-if="selectedAggregation !== 'count'" class="block"><span class="font-medium">Colonne à mesurer</span><select v-model="selectedMeasure" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] bg-white px-2"><option v-for="column in selectedAggregation === 'countDistinct' ? dimensionColumns : numericColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></label></template>
                    </template>
                    <label class="block"><span class="font-medium">Titre</span><input v-model="selectedTitle" class="mt-1.5 h-9 w-full rounded-md border border-[#e5e5e5] px-3" :placeholder="suggestedTitle"></label>
                    <label class="block"><span class="font-medium">Description</span><textarea v-model="selectedDescription" class="mt-1.5 min-h-20 w-full resize-y rounded-md border border-[#e5e5e5] px-3 py-2 leading-5" :placeholder="defaultDescription()" /></label>
                    <fieldset>
                      <legend class="font-medium">Taille du bloc</legend>
                      <div class="mt-2 grid grid-cols-3 gap-2">
                        <button
                          v-for="size in ([
                            { id: 'small', label: 'Petit', detail: '⅓ de ligne' },
                            { id: 'medium', label: 'Moyen', detail: '½ ligne' },
                            { id: 'large', label: 'Grand', detail: '1 ligne' },
                          ] as const)"
                          :key="size.id"
                          class="agent-focusable rounded-md border px-2 py-2 text-left"
                          :class="selectedSize === size.id ? 'border-[#000091] bg-[#f5f5fe]' : 'border-[#e5e5e5] hover:bg-[#f6f6f6]'"
                          type="button"
                          @click="selectedSize = size.id"
                        >
                          <span class="block text-[12px] font-medium">{{ size.label }}</span>
                          <span class="mt-0.5 block text-[10px] text-[#666666]">{{ size.detail }}</span>
                        </button>
                      </div>
                    </fieldset>
                    <fieldset v-if="visualizationKind === 'chart'" class="rounded-md border border-[#e5e5e5] p-3">
                      <legend class="font-medium">Style du graphique</legend>
                      <div class="mt-3 grid gap-3 sm:grid-cols-2">
                        <label><span class="text-[11px] text-[#555555]">Orientation</span><select v-model="selectedChartOrientation" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="vertical">Verticale</option><option value="horizontal">Horizontale</option></select></label>
                        <label><span class="text-[11px] text-[#555555]">Palette</span><select v-model="selectedChartPalette" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="default">data.gouv.fr</option><option value="blue">Bleus</option><option value="categorical">Catégorielle</option><option value="neutral">Neutres</option></select></label>
                      </div>
                      <div class="mt-3 flex flex-wrap gap-4"><label class="inline-flex items-center gap-2 text-[11px]"><input v-model="selectedShowValues" type="checkbox">Afficher les valeurs</label><label class="inline-flex items-center gap-2 text-[11px]"><input v-model="selectedShowLegend" type="checkbox">Afficher la légende</label></div>
                    </fieldset>
                    <fieldset v-else-if="visualizationKind === 'map'" class="rounded-md border border-[#e5e5e5] p-3">
                      <legend class="font-medium">Style de la carte</legend>
                      <div class="mt-3 grid gap-3 sm:grid-cols-2">
                        <label><span class="text-[11px] text-[#555555]">Fond de carte</span><select v-model="selectedMapBasemap" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="standard">OpenMapTiles Bright</option><option value="light">Positron</option><option value="dark">Sombre</option></select></label>
                        <label><span class="text-[11px] text-[#555555]">Palette</span><select v-model="selectedMapPalette" class="mt-1 h-8 w-full rounded-md border border-[#e5e5e5] bg-white px-2 text-[11px]"><option value="blue">Bleue</option><option value="green">Verte</option><option value="orange">Orange</option><option value="purple">Violette</option></select></label>
                        <label class="sm:col-span-2"><span class="flex justify-between text-[11px] text-[#555555]"><span>Opacité</span><span>{{ Math.round(selectedMapOpacity * 100) }} %</span></span><input v-model.number="selectedMapOpacity" class="mt-2 w-full accent-[#000091]" max="1" min="0.2" step="0.05" type="range"></label>
                      </div>
                      <label class="mt-3 inline-flex items-center gap-2 text-[11px]"><input v-model="selectedMapShowLegend" type="checkbox">Afficher la légende</label>
                    </fieldset>
                    <ExplorationEditableCodeBlock v-model="selectedSql" language="SQL" title="Requête SQL" />
                    <ExplorationEditableCodeBlock v-model="selectedSpecJson" language="JSON" :title="`Spécification ${visualizationKind === 'map' ? 'de la carte' : visualizationKind === 'indicator' ? 'de l’indicateur' : 'du graphique'}`" />
                  </div>
                </div>
              </section>
            </template>
          </div>

          <footer class="flex min-h-16 items-center justify-between gap-3 border-t border-[#e5e5e5] bg-white px-5">
            <button class="agent-focusable inline-flex h-8 items-center rounded-md px-2 text-[12px] font-medium text-[#555555] hover:bg-[#f6f6f6]" type="button" @click="closeBuilder">Annuler</button>
            <p v-if="isEditingVisualization" class="min-w-0 flex-1 text-center text-[10px] leading-4" :class="visualizationIsDirty ? 'text-[#b34000]' : 'text-[#666666]'">{{ visualizationIsDirty ? "Brouillon non enregistré" : "Ce bloc correspond à la version enregistrée" }}</p>
            <button class="agent-focusable inline-flex h-8 items-center gap-2 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white disabled:opacity-40" :disabled="builderLoading || agentResponding || !canContinue()" type="button" @click="saveChart"><i aria-hidden="true" :class="isEditingVisualization ? 'ri-save-line' : 'ri-check-line'" class="text-[14px]" />{{ isEditingVisualization ? "Sauvegarder" : `Ajouter ${visualizationKind === "map" ? "la carte" : visualizationKind === "indicator" ? "l’indicateur" : "le graphique"}` }}</button>
          </footer>
      </aside>
    </div>
  </main>
</template>

<style scoped>
:global(:root) {
  --resize-dur: 300ms;
  --resize-ease: cubic-bezier(0.22, 1, 0.36, 1);
}

.t-resize {
  transition:
    width var(--resize-dur) var(--resize-ease),
    height var(--resize-dur) var(--resize-ease);
  will-change: width, height;
}

.t-dashboard-workspace { min-height: calc(100dvh - 68px); }
.t-dashboard-layout { min-width: 0; }

.t-dashboard-workspace select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E");
  background-position: right 0.6rem center;
  background-repeat: no-repeat;
  background-size: 1rem;
  padding-right: 2rem;
}

@media (min-width: 1024px) {
  .t-dashboard-workspace {
    display: grid;
    grid-template-columns: var(--dashboard-left-panel) minmax(0, 1fr) var(--dashboard-right-panel);
    align-items: start;
    transition: grid-template-columns var(--resize-dur) var(--resize-ease);
  }

  .t-dashboard-layout { grid-column: 2; grid-row: 1; }
  .t-dashboard-assistant { grid-column: 1; grid-row: 1; height: calc(100dvh - 68px); }
  .t-dashboard-builder { grid-column: 3; grid-row: 1; height: calc(100dvh - 68px); }
}

@media (prefers-reduced-motion: reduce) {
  .t-resize,
  .t-dashboard-workspace { transition: none !important; }
}
</style>
