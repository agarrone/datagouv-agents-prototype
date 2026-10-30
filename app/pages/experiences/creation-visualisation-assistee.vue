<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { ChatAddToolOutputFunction } from "ai";
import { DEFAULT_AGENT_MODEL_ID, type AgentModelId } from "~~/shared/agents/models";
import { recentConversationMessages } from "~~/shared/agents/conversation-limits";
import {
  chartColorPalettes,
  isChartPalettePreset,
  type ChartPaletteChoice,
} from "~~/shared/agents/chart-appearance";
import {
  explorationResources,
  findInitialDatasetResource,
  type DatagouvDatasetResource,
  type ExplorationResource,
} from "~~/shared/data/exploration-resources";
import type { ChartSpec, DatasetRow, ExplorationMessage } from "~~/shared/types/exploration";
import type { DashboardVisualizationDefinition } from "~~/shared/types/dashboard-visualization";
import {
  DASHBOARD_VISUALIZATION_HANDOFF_KEY,
  readVisualizationLibrary,
  writeVisualizationLibrary,
  type DashboardVisualizationHandoff,
  type SavedVisualization,
} from "~~/shared/types/saved-visualization";
import { classifyExplorationError } from "~~/shared/errors/exploration";

type ChartKind = "bar" | "line" | "area" | "pie" | "scatter";
type Aggregation = "count" | "sum" | "avg";
type SortDirection = "asc" | "desc";
type FilterOperator = "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";

type FilterRule = {
  id: string;
  conjunction: "and" | "or";
  column: string;
  operator: FilterOperator;
  value: string;
};

type FilterGroup = {
  id: string;
  rules: FilterRule[];
};

useSeoMeta({
  title: "Création de visualisation assistée — Expérience",
  description: "Expérimentation d’un éditeur de graphique configurable manuellement ou en langage naturel.",
  robots: "noindex, nofollow",
});

const dataset = useDatasetEngine();
const route = useRoute();
const router = useRouter();
const visualizationId = ref(typeof route.query.visualizationId === "string" ? route.query.visualizationId : crypto.randomUUID());
const savedRevision = ref(0);
const saveStatus = ref<"idle" | "saved" | "published" | "error">("idle");
const loadingSavedVisualization = ref(false);
const selectedDatasetId = ref("");
const selectedResourceId = ref("");
const datasetResources = ref<DatagouvDatasetResource[]>([]);
const datasetResourcesLoading = ref(false);
const datasetResourcesError = ref("");
const publisher = ref("Antonin Garrone");
const loading = ref(false);
const previewLoading = ref(false);
const error = ref("");
const rows = ref<DatasetRow[]>([]);
const sql = ref("");
const specJson = ref("");
const panelMode = ref<"assistant" | "manual">("assistant");
const centerMode = ref<"preview" | "data">("preview");
const assistantPrompt = ref("");
const selectedModelId = ref<AgentModelId>(DEFAULT_AGENT_MODEL_ID);
const hasChart = ref(false);
const agentChartSpec = ref<ChartSpec | null>(null);
const syncingConfiguration = ref(false);
const manualAppearanceEnabled = ref(true);

const title = ref("Nombre de festivals par région");
const description = ref("Répartition des festivals répertoriés dans chaque région française.");
const chartType = ref<ChartKind>("bar");
const dimension = ref("");
const dimensionType = ref<"category" | "date">("category");
const aggregation = ref<Aggregation>("count");
const measure = ref("");
const sortDirection = ref<SortDirection>("desc");
const limit = ref(12);
const xLabel = ref("Région");
const yLabel = ref("Nombre de festivals");
const yMin = ref<string>("");
const yMax = ref<string>("");
const unit = ref("");
const unitPosition = ref<"suffix" | "prefix">("suffix");
const showValues = ref(true);
const showLegend = ref(false);
const paletteChoice = ref<ChartPaletteChoice>("france");
const customColors = ref(["#000091", "#E1000F", "#18753C", "#A558A0"]);
const filterGroups = ref<FilterGroup[]>([]);

const publishers = ["Antonin Garrone", "data.gouv.fr", "Ministère de la Culture"];
const selectedDataset = computed(() => explorationResources.find(item => item.id === selectedDatasetId.value));
const selectedResource = computed<ExplorationResource | undefined>(() => {
  const datasetChoice = selectedDataset.value;
  const resourceChoice = datasetResources.value.find(item => item.id === selectedResourceId.value);
  if (!datasetChoice || !resourceChoice?.parquetUrl) return undefined;
  return {
    ...datasetChoice,
    id: resourceChoice.id,
    parquetUrl: resourceChoice.parquetUrl,
    resourceName: resourceChoice.title,
  };
});
const columns = computed(() => dataset.schema.value?.columns ?? []);
const numericColumns = computed(() => columns.value.filter(column => /INT|DECIMAL|DOUBLE|FLOAT|REAL|NUMERIC/i.test(column.type)));
const dimensionColumns = computed(() => columns.value.filter(column => column.name !== measure.value));

const paletteOptions = Object.entries(chartColorPalettes).map(([value, definition]) => ({
  value: value as keyof typeof chartColorPalettes,
  ...definition,
}));
const activePaletteColors = computed(() => paletteChoice.value === "custom"
  ? customColors.value
  : [...chartColorPalettes[paletteChoice.value].colors]);

const chartTypeOptions: { value: ChartKind; label: string; icon: string }[] = [
  { value: "bar", label: "Histogramme", icon: "ri-bar-chart-line" },
  { value: "line", label: "Courbe", icon: "ri-line-chart-line" },
  { value: "area", label: "Aires", icon: "ri-area-chart-line" },
  { value: "pie", label: "Donut", icon: "ri-donut-chart-line" },
  { value: "scatter", label: "Nuage de points", icon: "ri-bubble-chart-line" },
];

function isChartKind(value: ChartSpec["type"]): value is ChartKind {
  return chartTypeOptions.some(option => option.value === value);
}

function selectChartType(value: ChartKind) {
  chartType.value = value;
  if (value === "pie") showLegend.value = true;
}

function addCustomColor() {
  if (customColors.value.length >= 8) return;
  customColors.value.push("#6A6AF4");
}

function removeCustomColor(index: number) {
  if (customColors.value.length <= 1) return;
  customColors.value.splice(index, 1);
}

const chartSpec = computed<ChartSpec>(() => ({
  type: chartType.value,
  title: title.value,
  description: description.value,
  xField: "category",
  xLabel: xLabel.value || dimension.value,
  series: [{ field: "value", label: yLabel.value || "Valeur" }],
}));
const activeChartSpec = computed(() => agentChartSpec.value ?? chartSpec.value);
const previewAppearance = computed(() => (
  agentChartSpec.value && !manualAppearanceEnabled.value ? undefined : appearance.value
));

const appearance = computed(() => ({
  orientation: "vertical" as const,
  palette: activePaletteColors.value,
  showLegend: showLegend.value,
  showValues: showValues.value,
  yMin: finiteNumber(yMin.value),
  yMax: finiteNumber(yMax.value),
  unit: unit.value,
  unitPosition: unitPosition.value,
}));

const activeFiltersCount = computed(() => filterGroups.value.reduce((count, group) => (
  count + group.rules.filter(rule => rule.column && rule.value).length
), 0));

function finiteNumber(value: string) {
  if (!value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function applyPaletteColors(colors: readonly string[] | undefined) {
  if (!colors?.length) return;
  const preset = Object.entries(chartColorPalettes).find(([, definition]) => (
    definition.colors.length === colors.length
    && definition.colors.every((color, index) => color.toLowerCase() === colors[index]?.toLowerCase())
  ));
  if (preset && isChartPalettePreset(preset[0])) paletteChoice.value = preset[0];
  else {
    paletteChoice.value = "custom";
    customColors.value = [...colors];
  }
}

function visualizationResourceName(resource: ExplorationResource) {
  return resource.resourceName?.trim() || "Ressource tabulaire";
}

async function loadDatasetResources() {
  const datasetChoice = selectedDataset.value;
  selectedResourceId.value = "";
  datasetResources.value = [];
  datasetResourcesError.value = "";
  if (!datasetChoice) return;

  datasetResourcesLoading.value = true;
  try {
    const response = await $fetch<{ resources: DatagouvDatasetResource[] }>("/nuxt-api/datasets/resources", {
      query: { dataset: datasetChoice.datasetReference },
    });
    datasetResources.value = response.resources;
    const initialResource = findInitialDatasetResource(response.resources, datasetChoice);
    if (initialResource?.parquetUrl) selectedResourceId.value = initialResource.id;
    else datasetResourcesError.value = "Aucune ressource tabulaire compatible n’est disponible pour ce jeu de données.";
  } catch {
    datasetResourcesError.value = "Les ressources data.gouv.fr ne sont pas disponibles pour le moment.";
  } finally {
    datasetResourcesLoading.value = false;
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function ruleSql(rule: FilterRule) {
  const column = quoteIdentifier(rule.column);
  if (rule.operator === "contains") return `CAST(${column} AS VARCHAR) ILIKE ${quoteLiteral(`%${rule.value}%`)}`;
  if (rule.operator === "notEquals") return `CAST(${column} AS VARCHAR) <> ${quoteLiteral(rule.value)}`;
  if (rule.operator === "greaterThan") return `TRY_CAST(${column} AS DOUBLE) > ${Number(rule.value) || 0}`;
  if (rule.operator === "lessThan") return `TRY_CAST(${column} AS DOUBLE) < ${Number(rule.value) || 0}`;
  return `CAST(${column} AS VARCHAR) = ${quoteLiteral(rule.value)}`;
}

function buildWhereClause() {
  const groups = filterGroups.value.map((group) => {
    const rules = group.rules.filter(rule => rule.column && rule.value);
    if (!rules.length) return "";
    return `(${rules.map((rule, index) => `${index ? rule.conjunction.toUpperCase() : ""} ${ruleSql(rule)}`.trim()).join(" ")})`;
  }).filter(Boolean);
  return groups.length ? `WHERE ${groups.join(" AND ")}` : "";
}

function generatedSql() {
  if (!dimension.value) return "SELECT * FROM data LIMIT 20";
  const dimensionExpression = dimensionType.value === "date"
    ? `CAST(${quoteIdentifier(dimension.value)} AS DATE)`
    : quoteIdentifier(dimension.value);
  const valueExpression = aggregation.value === "count" || !measure.value
    ? "COUNT(*)"
    : `${aggregation.value.toUpperCase()}(TRY_CAST(${quoteIdentifier(measure.value)} AS DOUBLE))`;
  return [
    `SELECT ${dimensionExpression} AS category, ${valueExpression} AS value`,
    "FROM data",
    buildWhereClause(),
    "GROUP BY 1",
    `ORDER BY value ${sortDirection.value.toUpperCase()} NULLS LAST`,
    `LIMIT ${Math.min(50, Math.max(3, limit.value))}`,
  ].filter(Boolean).join("\n");
}

function syncSpecificationEditor() {
  specJson.value = JSON.stringify({
    ...activeChartSpec.value,
    appearance: appearance.value,
  }, null, 2);
}

function syncEditors() {
  sql.value = generatedSql();
  syncSpecificationEditor();
}

function syncManualPresentation() {
  if (syncingConfiguration.value || !hasChart.value) return;
  const current = activeChartSpec.value;
  agentChartSpec.value = {
    ...current,
    type: chartType.value,
    title: title.value,
    description: description.value,
    xLabel: xLabel.value,
    series: current.series.map((series, index) => index === 0 ? { ...series, label: yLabel.value } : series),
  };
  manualAppearanceEnabled.value = true;
  syncSpecificationEditor();
}

async function refreshPreview(useEditorSql = false) {
  if (!hasChart.value || !dataset.schema.value || !dimension.value) return;
  previewLoading.value = true;
  error.value = "";
  try {
    if (!useEditorSql) {
      agentChartSpec.value = null;
      syncEditors();
    }
    const result = await dataset.executeSql(sql.value);
    rows.value = result.rows;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "La prévisualisation n’a pas pu être générée.";
  } finally {
    previewLoading.value = false;
  }
}

function chooseDefaults(resource: ExplorationResource) {
  const names = columns.value.map(column => column.name);
  const preferred = resource.id === "festivals-france"
    ? names.find(name => /région principale de déroulement/i.test(name))
    : undefined;
  dimension.value = preferred ?? names.find(name => /région|département|catégorie|type|année|date/i.test(name)) ?? names[0] ?? "";
  measure.value = numericColumns.value[0]?.name ?? "";
}

async function loadResource() {
  if (!selectedResource.value) return;
  loading.value = true;
  error.value = "";
  rows.value = [];
  try {
    await dataset.load(selectedResource.value);
    chooseDefaults(selectedResource.value);
    syncEditors();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Cette ressource ne peut pas être chargée.";
  } finally {
    loading.value = false;
  }
}

function addFilterGroup() {
  filterGroups.value.push({
    id: crypto.randomUUID(),
    rules: [{ id: crypto.randomUUID(), conjunction: "and", column: dimension.value, operator: "equals", value: "" }],
  });
}

function addFilterRule(group: FilterGroup) {
  group.rules.push({ id: crypto.randomUUID(), conjunction: "and", column: dimension.value, operator: "equals", value: "" });
}

function removeFilterRule(group: FilterGroup, ruleId: string) {
  group.rules = group.rules.filter(rule => rule.id !== ruleId);
  if (!group.rules.length) filterGroups.value = filterGroups.value.filter(item => item.id !== group.id);
  void refreshPreview();
}

function applySpecification() {
  try {
    const parsed = JSON.parse(specJson.value) as ChartSpec & { appearance?: typeof appearance.value };
    syncingConfiguration.value = true;
    agentChartSpec.value = parsed;
    manualAppearanceEnabled.value = true;
    if (isChartKind(parsed.type)) chartType.value = parsed.type;
    title.value = parsed.title ?? title.value;
    description.value = parsed.description ?? description.value;
    xLabel.value = parsed.xLabel ?? xLabel.value;
    yLabel.value = parsed.series?.[0]?.label ?? yLabel.value;
    if (parsed.appearance) {
      applyPaletteColors(parsed.appearance.palette);
      showLegend.value = parsed.appearance.showLegend ?? showLegend.value;
      showValues.value = parsed.appearance.showValues ?? showValues.value;
      unit.value = parsed.appearance.unit ?? unit.value;
    }
    void refreshPreview(true);
    void nextTick(() => { syncingConfiguration.value = false; });
  } catch {
    syncingConfiguration.value = false;
    error.value = "La spécification JSON n’est pas valide.";
  }
}

const runtimeBridge: { addToolOutput?: ChatAddToolOutputFunction<ExplorationMessage> } = {};
const toolRuntime = useExplorationToolRuntime(dataset, (output) => {
  if (!runtimeBridge.addToolOutput) throw new Error("Le runtime des tools n’est pas initialisé.");
  return runtimeBridge.addToolOutput(output);
}, {
  onSqlReady(agentSql) {
    sql.value = agentSql;
  },
  onChartReady(spec, result) {
    syncingConfiguration.value = true;
    hasChart.value = true;
    agentChartSpec.value = spec;
    manualAppearanceEnabled.value = false;
    rows.value = result.rows;
    title.value = spec.title;
    description.value = spec.description ?? "";
    if (isChartKind(spec.type)) chartType.value = spec.type;
    xLabel.value = spec.xLabel ?? spec.xField;
    yLabel.value = spec.series?.[0]?.label ?? yLabel.value;
    specJson.value = JSON.stringify(spec, null, 2);
    void nextTick(() => { syncingConfiguration.value = false; });
  },
  onChartUpdate(update) {
    if (!hasChart.value) throw new Error("Créez d’abord un graphique avant de le modifier.");
    syncingConfiguration.value = true;
    const fields: string[] = [];

    if (update.title !== undefined) { title.value = update.title; fields.push("title"); }
    if (update.description !== undefined) { description.value = update.description; fields.push("description"); }
    if (update.type !== undefined) { chartType.value = update.type; fields.push("type"); }
    if (update.xLabel !== undefined) { xLabel.value = update.xLabel; fields.push("xLabel"); }
    if (update.yLabel !== undefined) { yLabel.value = update.yLabel; fields.push("yLabel"); }

    const patch = update.appearance;
    if (patch?.palettePreset !== undefined) { paletteChoice.value = patch.palettePreset; fields.push("appearance.palettePreset"); }
    if (patch?.customColors !== undefined) { paletteChoice.value = "custom"; customColors.value = [...patch.customColors]; fields.push("appearance.customColors"); }
    if (patch?.showLegend !== undefined) { showLegend.value = patch.showLegend; fields.push("appearance.showLegend"); }
    if (patch?.showValues !== undefined) { showValues.value = patch.showValues; fields.push("appearance.showValues"); }
    if (patch?.yMin !== undefined) { yMin.value = patch.yMin === null ? "" : String(patch.yMin); fields.push("appearance.yMin"); }
    if (patch?.yMax !== undefined) { yMax.value = patch.yMax === null ? "" : String(patch.yMax); fields.push("appearance.yMax"); }
    if (patch?.unit !== undefined) { unit.value = patch.unit; fields.push("appearance.unit"); }
    if (patch?.unitPosition !== undefined) { unitPosition.value = patch.unitPosition; fields.push("appearance.unitPosition"); }

    const current = activeChartSpec.value;
    agentChartSpec.value = {
      ...current,
      type: chartType.value,
      title: title.value,
      description: description.value,
      xLabel: xLabel.value,
      series: current.series.map((series, index) => index === 0 ? { ...series, label: yLabel.value } : series),
    };
    manualAppearanceEnabled.value = true;
    void nextTick(() => {
      syncSpecificationEditor();
      syncingConfiguration.value = false;
    });
    return { updated: true as const, fields };
  },
});

function visualizationAgentContext() {
  return {
    exists: hasChart.value,
    title: title.value,
    description: description.value,
    sql: sql.value,
    specification: activeChartSpec.value,
    appearance: appearance.value,
  };
}

function shouldContinueAgent(options: { messages: ExplorationMessage[] }) {
  return lastAssistantMessageIsCompleteWithToolCalls(options);
}

const {
  addToolOutput,
  clearError: clearAssistantError,
  error: assistantError,
  messages: agentMessages,
  regenerate: regenerateAssistant,
  sendMessage: sendAgentMessage,
  status: agentStatus,
  stop: stopAgent,
} = useChat<ExplorationMessage>({
  transport: new DefaultChatTransport({
    api: "/nuxt-api/agents/visualization",
    prepareSendMessagesRequest({ id, messages, trigger, messageId }) {
      const resource = selectedResource.value;
      if (!resource) throw new Error("Aucune ressource sélectionnée.");
      return {
        body: {
          id,
          messages: recentConversationMessages(messages),
          trigger,
          messageId,
          modelId: selectedModelId.value,
          turnStartedAt: Date.now(),
          visualization: visualizationAgentContext(),
          resource: {
            datasetId: resource.datasetReference,
            resourceId: datagouvResourceId(resource),
            title: resource.title,
            organization: resource.organization,
            resourceName: visualizationResourceName(resource),
            url: resource.parquetUrl,
            schema: dataset.schema.value ? {
              rowCount: dataset.schema.value.rowCount,
              columns: dataset.schema.value.columns,
            } : undefined,
          },
        },
      };
    },
  }),
  sendAutomaticallyWhen: shouldContinueAgent,
  onToolCall: toolRuntime.handleToolCall,
});
runtimeBridge.addToolOutput = addToolOutput;

const agentResponding = computed(() => agentStatus.value === "submitted" || agentStatus.value === "streaming");
const chartCreationPending = computed(() => {
  if (!agentResponding.value) return false;
  const activeMessage = [...agentMessages.value].reverse().find(message => message.role === "assistant");
  return activeMessage?.parts.some(part => (
    part.type === "tool-create_chart"
    && part.state !== "output-available"
    && part.state !== "output-error"
  )) ?? false;
});

function datagouvResourceId(resource: ExplorationResource) {
  const fileName = resource.parquetUrl.split("/").at(-1) ?? "";
  return fileName.replace(/\.parquet(?:\?.*)?$/i, "") || resource.id;
}

const assistantErrorPresentation = computed(() => assistantError.value
  ? classifyExplorationError(assistantError.value)
  : undefined);

const activeAssistantMessageId = computed(() => {
  if (!agentResponding.value) return undefined;
  return [...agentMessages.value].reverse().find(message => message.role === "assistant")?.id;
});

const showInitialThinking = computed(() => agentResponding.value && !activeAssistantMessageId.value);

function previousUserQuestion(messageIndex: number) {
  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    const message = agentMessages.value[index];
    if (message?.role !== "user") continue;
    return message.parts.filter(part => part.type === "text").map(part => part.text).join("\n").trim();
  }
  return "";
}

async function resolveClarification(toolCallId: string, choice: string) {
  clearAssistantError();
  await addToolOutput({ tool: "request_clarification", toolCallId, output: { choice } });
}

async function retryAssistant() {
  clearAssistantError();
  await regenerateAssistant();
}

async function submitAssistant() {
  const prompt = assistantPrompt.value.trim();
  if (!prompt || !selectedResource.value || !dataset.schema.value || agentResponding.value) return;
  clearAssistantError();
  assistantPrompt.value = "";
  await sendAgentMessage({ text: prompt });
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
watch([
  dimension, dimensionType, aggregation, measure, sortDirection, limit,
], () => {
  if (syncingConfiguration.value || loading.value || !dataset.schema.value) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refreshPreview(), 250);
});

watch([
  chartType, title, description, xLabel, yLabel, yMin, yMax, unit, unitPosition,
  showValues, showLegend, paletteChoice, customColors,
], syncManualPresentation, { deep: true });

watch([sql, specJson], () => {
  if (!syncingConfiguration.value && (saveStatus.value === "saved" || saveStatus.value === "published")) saveStatus.value = "idle";
});

watch(selectedDatasetId, () => {
  if (loadingSavedVisualization.value) return;
  hasChart.value = false;
  rows.value = [];
  agentChartSpec.value = null;
  manualAppearanceEnabled.value = true;
  agentMessages.value = [];
  toolRuntime.reset();
  void loadDatasetResources();
});

watch(selectedResourceId, () => {
  if (loadingSavedVisualization.value) return;
  hasChart.value = false;
  rows.value = [];
  agentChartSpec.value = null;
  manualAppearanceEnabled.value = true;
  agentMessages.value = [];
  toolRuntime.reset();
  if (selectedResourceId.value) void loadResource();
});

function startManualChart() {
  if (!selectedResource.value || !dataset.schema.value) return;
  hasChart.value = true;
  void refreshPreview();
}

function savedDefinition(): DashboardVisualizationDefinition | null {
  const resource = selectedResource.value;
  if (!resource || !hasChart.value || !rows.value.length) return null;
  return {
    version: 1,
    kind: "chart",
    title: activeChartSpec.value.title || title.value,
    description: activeChartSpec.value.description || description.value,
    size: "large",
    data: {
      resourceId: resource.id,
      datasetReference: resource.datasetReference,
      resourceName: visualizationResourceName(resource),
      resourceUrl: resource.parquetUrl,
      engine: "duckdb-sql",
      query: sql.value,
    },
    filters: [],
    specification: activeChartSpec.value,
    appearance: appearance.value,
  };
}

async function saveVisualization(status: SavedVisualization["status"]) {
  const resource = selectedResource.value;
  const definition = savedDefinition();
  if (!resource || !definition) {
    error.value = "Créez un graphique valide avant de l’enregistrer.";
    return;
  }
  try {
    const library = readVisualizationLibrary(localStorage);
    const previous = library.find(item => item.id === visualizationId.value);
    const record: SavedVisualization = {
      id: visualizationId.value,
      status,
      definition,
      resource: {
        id: resource.id,
        datasetId: selectedDatasetId.value,
        datasetReference: resource.datasetReference,
        title: resource.title,
        resourceName: visualizationResourceName(resource),
        organization: resource.organization,
        parquetUrl: resource.parquetUrl,
      },
      rows: rows.value,
      revision: (previous?.revision ?? savedRevision.value) + 1,
      savedAt: new Date().toISOString(),
    };
    writeVisualizationLibrary(localStorage, [record, ...library.filter(item => item.id !== record.id)]);
    savedRevision.value = record.revision;
    saveStatus.value = status === "published" ? "published" : "saved";

    const dashboardId = typeof route.query.dashboardId === "string" ? route.query.dashboardId : "";
    const groupId = typeof route.query.groupId === "string" ? route.query.groupId : "";
    if (dashboardId && groupId) {
      const handoff: DashboardVisualizationHandoff = {
        visualizationId: record.id,
        dashboardId,
        groupId,
        blockId: typeof route.query.blockId === "string" ? route.query.blockId : undefined,
        requestedAt: new Date().toISOString(),
      };
      localStorage.setItem(DASHBOARD_VISUALIZATION_HANDOFF_KEY, JSON.stringify(handoff));
      await router.push("/experiences/tableau-de-bord-visualisations");
    }
  }
  catch {
    saveStatus.value = "error";
    error.value = "La visualisation n’a pas pu être enregistrée localement.";
  }
}

async function loadSavedVisualization() {
  const requestedId = typeof route.query.visualizationId === "string" ? route.query.visualizationId : "";
  if (!requestedId) return;
  const record = readVisualizationLibrary(localStorage).find(item => item.id === requestedId);
  if (!record || record.definition.kind !== "chart") return;
  loadingSavedVisualization.value = true;
  visualizationId.value = record.id;
  savedRevision.value = record.revision;
  selectedDatasetId.value = record.resource.datasetId;
  await loadDatasetResources();
  if (datasetResources.value.some(item => item.id === record.resource.id)) selectedResourceId.value = record.resource.id;
  await loadResource();
  syncingConfiguration.value = true;
  hasChart.value = true;
  rows.value = record.rows;
  sql.value = record.definition.data.query;
  agentChartSpec.value = record.definition.specification;
  title.value = record.definition.title;
  description.value = record.definition.description;
  if (isChartKind(record.definition.specification.type)) chartType.value = record.definition.specification.type;
  xLabel.value = record.definition.specification.xLabel ?? record.definition.specification.xField;
  yLabel.value = record.definition.specification.series[0]?.label ?? yLabel.value;
  applyPaletteColors(record.definition.appearance.palette);
  showLegend.value = record.definition.appearance.showLegend;
  showValues.value = record.definition.appearance.showValues;
  yMin.value = record.definition.appearance.yMin === undefined ? "" : String(record.definition.appearance.yMin);
  yMax.value = record.definition.appearance.yMax === undefined ? "" : String(record.definition.appearance.yMax);
  unit.value = record.definition.appearance.unit ?? "";
  unitPosition.value = record.definition.appearance.unitPosition ?? "suffix";
  specJson.value = JSON.stringify({ ...record.definition.specification, appearance: record.definition.appearance }, null, 2);
  saveStatus.value = record.status === "published" ? "published" : "saved";
  await nextTick();
  syncingConfiguration.value = false;
  loadingSavedVisualization.value = false;
}

onMounted(() => void loadSavedVisualization());
</script>

<template>
  <main class="min-h-dvh bg-[#ededed] text-[#161616]">
    <ExperimentNotice />
    <header class="border-b border-[#dddddd] bg-white">
      <div class="mx-auto flex min-h-16 w-full max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div class="min-w-0">
          <NuxtLink class="inline-flex items-center gap-1 text-[11px] text-[#000091] underline underline-offset-4" to="/experiences"><i aria-hidden="true" class="ri-arrow-left-line" />Expérimentations</NuxtLink>
          <h1 class="mt-1 truncate text-[18px] font-bold leading-6">Création de visualisation assistée</h1>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="hidden text-[11px] text-[#666666] sm:inline">{{ saveStatus === 'published' ? 'Publiée' : saveStatus === 'saved' ? 'Brouillon enregistré' : saveStatus === 'error' ? 'Échec de l’enregistrement' : 'Modifications non enregistrées' }}</span>
          <button class="h-9 rounded-md border border-[#000091] bg-white px-3 text-[12px] font-medium text-[#000091] disabled:opacity-50" type="button" :disabled="!hasChart || !rows.length" @click="saveVisualization('draft')">Enregistrer le brouillon</button>
          <button class="h-9 rounded-md bg-[#000091] px-3 text-[12px] font-medium text-white disabled:opacity-50" type="button" :disabled="!hasChart || !rows.length" @click="saveVisualization('published')">{{ route.query.dashboardId ? 'Enregistrer et ajouter' : 'Publier' }}</button>
        </div>
      </div>
    </header>

    <div class="visualization-shell">
      <section class="source-context" aria-label="Source de données">
        <div class="source-context__heading">
          <div class="min-w-0"><h2 class="text-[12px] font-bold">Source de données</h2><p class="mt-0.5 truncate text-[10px] text-[#666666]">Contexte commun à la prévisualisation et à l’assistant</p></div>
        </div>
        <div class="source-context__fields">
          <label class="source-field"><span>Publier avec</span><select v-model="publisher" class="form-select"><option v-for="item in publishers" :key="item">{{ item }}</option></select></label>
          <label class="source-field source-field--dataset"><span>Jeu de données</span><select v-model="selectedDatasetId" class="form-select"><option value="" disabled>Sélectionner un jeu de données</option><option v-for="resource in explorationResources" :key="resource.id" :value="resource.id">{{ resource.title }}</option></select></label>
          <label class="source-field"><span>Ressource</span><select v-model="selectedResourceId" class="form-select" :disabled="!selectedDatasetId || datasetResourcesLoading"><option value="" disabled>{{ !selectedDatasetId ? 'Choisissez d’abord un jeu de données' : datasetResourcesLoading ? 'Chargement des ressources…' : 'Sélectionner une ressource' }}</option><option v-for="resource in datasetResources" :key="resource.id" :value="resource.id" :disabled="!resource.parquetUrl">{{ resource.title }} · {{ resource.format || 'format inconnu' }}{{ resource.parquetUrl ? '' : ' — non interrogeable' }}</option></select><span v-if="datasetResourcesError" class="mt-1 text-[#ce0500]">{{ datasetResourcesError }}</span></label>
        </div>
        <div class="source-context__status" :class="selectedResourceId ? 'text-[#18753c]' : 'text-[#777777]'">
          <i :class="loading || datasetResourcesLoading ? 'ri-loader-4-line animate-spin' : selectedResourceId ? 'ri-checkbox-circle-line' : 'ri-information-line'" class="text-sm" />
          <span>{{ loading ? 'Chargement…' : datasetResourcesLoading ? 'Lecture des ressources…' : selectedResourceId ? `${columns.length} colonnes disponibles` : 'Source à sélectionner' }}</span>
        </div>
      </section>

      <div class="visualization-workspace">
        <section class="visualization-center min-w-0 bg-white" aria-label="Visualisation et données">
          <header class="shrink-0 bg-white">
            <div class="flex h-14 items-center gap-2 border-b border-[#e5e5e5] bg-[#f6f6f6] px-4">
              <div class="min-w-0 flex-1">
                <h2 class="truncate text-[12px] font-bold">Visualisation</h2>
                <p class="mt-0.5 truncate text-[11px] text-[#555555]">Prévisualisation et données source</p>
              </div>
            </div>
            <nav class="center-tabs" role="tablist" aria-label="Affichage central">
              <button role="tab" :aria-selected="centerMode === 'preview'" :class="centerMode === 'preview' ? 'center-tab--active' : ''" class="center-tab" type="button" @click="centerMode = 'preview'"><i aria-hidden="true" class="ri-bar-chart-box-line text-base leading-none" />Prévisualisation</button>
              <button role="tab" :aria-selected="centerMode === 'data'" :class="centerMode === 'data' ? 'center-tab--active' : ''" class="center-tab" type="button" @click="centerMode = 'data'"><i aria-hidden="true" class="ri-table-line text-base leading-none" />Données<span v-if="dataset.schema.value" class="text-[10px] font-normal text-[#777777]">{{ dataset.schema.value.rowCount.toLocaleString('fr-FR') }}</span></button>
            </nav>
          </header>

          <div v-if="centerMode === 'preview'" class="flex min-h-0 flex-1 flex-col">
            <div class="relative min-h-[420px] flex-1 p-4 sm:p-7">
              <div v-if="chartCreationPending" class="absolute inset-0 z-10 bg-white p-4 sm:p-7">
                <ExplorationVisualizationLoading class="h-full" kind="graphique" />
              </div>
              <div v-else-if="loading || previewLoading" class="absolute inset-0 z-10 grid place-items-center bg-white/80"><div class="text-center text-[12px] text-[#555555]"><i aria-hidden="true" class="ri-loader-4-line mb-2 block animate-spin text-2xl text-[#000091]" />Mise à jour de la prévisualisation</div></div>
              <div v-if="error" class="mb-4 flex items-start gap-2 rounded-md border border-[#ffbdbd] bg-[#fff4f4] px-3 py-2 text-[12px] leading-5 text-[#ce0500]"><i aria-hidden="true" class="ri-error-warning-line mt-0.5" /><span>{{ error }}</span></div>
              <ExplorationAgentChart v-if="hasChart && rows.length && selectedResource" :appearance="previewAppearance" :play-completion-sound="false" renderer="svg" :rows="rows" :source="`${selectedResource.title} · ${selectedResource.organization}`" :spec="activeChartSpec" :truncated="false" />
              <div v-else-if="!loading && !error" class="grid h-full min-h-[360px] place-items-center text-center">
                <div class="max-w-sm">
                  <span class="mx-auto grid size-14 place-items-center rounded-full bg-[#eeeeee] text-[#777777]"><i aria-hidden="true" class="ri-bar-chart-box-line text-2xl" /></span>
                  <p class="mt-4 text-[15px] font-semibold">Aucun graphique créé</p>
                  <p class="mt-1 text-[12px] leading-5 text-[#666666]">{{ selectedResourceId ? 'Utilisez l’assistant ou l’édition manuelle pour créer votre première visualisation.' : 'Sélectionnez un jeu de données et une ressource pour commencer.' }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="min-h-0 flex-1 overflow-hidden">
            <ExplorationDatasetTableSkeleton v-if="loading" />
            <ExplorationDatasetExplorer v-else-if="dataset.schema.value" :columns="columns" :row-count="dataset.schema.value.rowCount" />
            <div v-else class="grid h-full min-h-[420px] place-items-center bg-[#fafafa] p-8 text-center"><div class="max-w-sm"><i aria-hidden="true" class="ri-table-line text-2xl text-[#777777]" /><h2 class="mt-3 text-[14px] font-bold">Aucune donnée à afficher</h2><p class="mt-1 text-[11px] leading-5 text-[#555555]">Sélectionnez une ressource dans le bandeau supérieur pour examiner son contenu.</p></div></div>
          </div>
        </section>

      <aside class="visualization-editor flex min-h-0 flex-col border-l border-[#777777] bg-white" aria-label="Assistant et configuration du graphique">
        <ExplorationAgentPanelHeader
          v-model="panelMode"
          secondary-icon="ri-settings-3-line"
          secondary-label="Édition manuelle"
          secondary-value="manual"
          subtitle="Assistant de création de visualisation"
          title="Créer une visualisation"
        />

        <div v-if="panelMode === 'manual'" class="space-y-6 overflow-y-auto p-5">
          <div v-if="!hasChart" class="grid min-h-[420px] place-items-center text-center">
            <div class="max-w-xs"><span class="mx-auto grid size-12 place-items-center rounded-full bg-[#eeeeee] text-[#777777]"><i aria-hidden="true" class="ri-settings-3-line text-xl" /></span><h3 class="mt-4 text-[14px] font-semibold">Aucun graphique à configurer</h3><p class="mt-1 text-[12px] leading-5 text-[#666666]">{{ selectedResourceId ? 'Démarrez un graphique pour accéder aux axes, filtres et options de style.' : 'Sélectionnez d’abord un jeu de données et une ressource.' }}</p><button class="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-[#000091] px-4 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="!selectedResourceId || loading" @click="startManualChart">Créer manuellement</button></div>
          </div>
          <template v-else>
          <section>
            <div class="flex items-center justify-between"><h3 class="text-[12px] font-bold">Filtres</h3><span class="text-[10px] text-[#666666]">{{ activeFiltersCount }} actif{{ activeFiltersCount > 1 ? 's' : '' }}</span></div>
            <div v-for="(group, groupIndex) in filterGroups" :key="group.id" class="mt-3 rounded-md border border-[#dddddd] p-3">
              <div class="mb-2 flex items-center justify-between"><span class="text-[10px] font-semibold text-[#555555]">Groupe {{ groupIndex + 1 }}</span><span v-if="groupIndex" class="text-[10px] text-[#666666]">ET avec le groupe précédent</span></div>
              <div v-for="(rule, ruleIndex) in group.rules" :key="rule.id" class="grid grid-cols-[62px_minmax(0,1fr)_92px_minmax(70px,1fr)_30px] gap-1.5" :class="ruleIndex ? 'mt-2' : ''">
                <select v-model="rule.conjunction" class="form-select" :disabled="ruleIndex === 0"><option value="and">Et</option><option value="or">Ou</option></select>
                <select v-model="rule.column" class="form-select"><option v-for="column in columns" :key="column.name" :value="column.name">{{ column.name }}</option></select>
                <select v-model="rule.operator" class="form-select"><option value="equals">est</option><option value="notEquals">n’est pas</option><option value="contains">contient</option><option value="greaterThan">est supérieur à</option><option value="lessThan">est inférieur à</option></select>
                <input v-model="rule.value" class="form-control" placeholder="Valeur" @change="refreshPreview()">
                <button aria-label="Supprimer la règle" class="grid size-[34px] place-items-center rounded-sm bg-[#000091] text-white" type="button" @click="removeFilterRule(group, rule.id)"><i aria-hidden="true" class="ri-delete-bin-line" /></button>
              </div>
              <button class="mt-3 text-[11px] font-medium text-[#000091]" type="button" @click="addFilterRule(group)">+ Ajouter une règle</button>
            </div>
            <button class="mt-3 text-[11px] font-medium text-[#000091]" type="button" @click="addFilterGroup">+ Ajouter un groupe</button>
          </section>

          <section class="border-t border-[#e5e5e5] pt-5">
            <h3 class="text-[12px] font-bold">Contenu</h3>
            <label class="mt-3 block text-[11px] font-medium">Titre</label><input v-model="title" class="form-control mt-1">
            <label class="mt-3 block text-[11px] font-medium">Description</label><textarea v-model="description" rows="3" class="form-control mt-1 resize-y" />
          </section>

          <section class="border-t border-[#e5e5e5] pt-5">
            <h3 class="text-[12px] font-bold">Type de graphique</h3>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button v-for="option in chartTypeOptions" :key="option.value" class="chart-type-button" :class="chartType === option.value ? 'chart-type-button--active' : ''" type="button" @click="selectChartType(option.value)"><i aria-hidden="true" :class="option.icon" />{{ option.label }}</button>
            </div>
          </section>

          <section class="border-t border-[#e5e5e5] pt-5">
            <h3 class="text-[12px] font-bold">Axe X</h3>
            <label class="mt-3 block text-[11px] font-medium">Choisir quoi afficher</label><select v-model="dimension" class="form-select mt-1"><option v-for="column in dimensionColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select>
            <label class="mt-3 block text-[11px] font-medium">Type</label><select v-model="dimensionType" class="form-select mt-1"><option value="category">Discret (catégories)</option><option value="date">Temporel (date)</option></select>
            <label class="mt-3 block text-[11px] font-medium">Trier par</label><select v-model="sortDirection" class="form-select mt-1"><option value="desc">Valeurs décroissantes</option><option value="asc">Valeurs croissantes</option></select>
            <label class="mt-3 block text-[11px] font-medium">Nombre de valeurs</label><input v-model.number="limit" min="3" max="50" type="number" class="form-control mt-1">
          </section>

          <section class="border-t border-[#e5e5e5] pt-5">
            <h3 class="text-[12px] font-bold">Axe Y</h3>
            <label class="mt-3 block text-[11px] font-medium">Calcul</label><select v-model="aggregation" class="form-select mt-1"><option value="count">Compter les lignes</option><option value="sum">Somme</option><option value="avg">Moyenne</option></select>
            <template v-if="aggregation !== 'count'"><label class="mt-3 block text-[11px] font-medium">Colonne Y</label><select v-model="measure" class="form-select mt-1"><option v-for="column in numericColumns" :key="column.name" :value="column.name">{{ column.name }}</option></select></template>
          </section>

          <details class="border-t border-[#e5e5e5] pt-5" open>
            <summary class="cursor-pointer text-[12px] font-bold">Styles</summary>
            <label class="mt-3 block text-[11px] font-medium">Label de l’axe X</label><input v-model="xLabel" class="form-control mt-1">
            <label class="mt-3 block text-[11px] font-medium">Label de l’axe Y</label><input v-model="yLabel" class="form-control mt-1">
            <div class="mt-3 grid grid-cols-2 gap-2"><label class="block text-[11px] font-medium">Minimum<input v-model="yMin" inputmode="decimal" class="form-control mt-1"></label><label class="block text-[11px] font-medium">Maximum<input v-model="yMax" inputmode="decimal" class="form-control mt-1"></label></div>
            <div class="mt-3 grid grid-cols-2 gap-2"><label class="block text-[11px] font-medium">Unité<input v-model="unit" class="form-control mt-1" placeholder="€, %, kg"></label><label class="block text-[11px] font-medium">Position<select v-model="unitPosition" class="form-select mt-1"><option value="suffix">Suffixe</option><option value="prefix">Préfixe</option></select></label></div>
            <fieldset class="mt-4">
              <legend class="text-[11px] font-medium">Couleurs</legend>
              <div class="mt-2 space-y-1.5">
                <button v-for="option in paletteOptions" :key="option.value" type="button" class="palette-option w-full" :class="paletteChoice === option.value ? 'palette-option--active' : ''" :aria-pressed="paletteChoice === option.value" @click="paletteChoice = option.value">
                  <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
                  <span class="flex shrink-0 gap-1" aria-hidden="true"><span v-for="color in option.colors" :key="color" class="size-4 rounded-full border border-black/10" :style="{ backgroundColor: color }" /></span>
                </button>
                <button type="button" class="palette-option w-full" :class="paletteChoice === 'custom' ? 'palette-option--active' : ''" :aria-pressed="paletteChoice === 'custom'" @click="paletteChoice = 'custom'">
                  <span class="flex-1">Personnalisée</span>
                  <i aria-hidden="true" class="ri-palette-line text-base" />
                </button>
              </div>
              <div v-if="paletteChoice === 'custom'" class="mt-3 rounded-md border border-[#dddddd] p-3">
                <div class="space-y-2">
                  <div v-for="(color, index) in customColors" :key="index" class="flex items-center gap-2">
                    <input v-model="customColors[index]" :aria-label="`Couleur ${index + 1}`" class="h-8 w-10 cursor-pointer rounded border border-[#dddddd] bg-white p-0.5" type="color">
                    <input v-model="customColors[index]" :aria-label="`Valeur de la couleur ${index + 1}`" class="form-control font-mono uppercase" maxlength="7" pattern="#[0-9A-Fa-f]{6}">
                    <button :aria-label="`Supprimer la couleur ${index + 1}`" class="grid size-8 shrink-0 place-items-center rounded text-[#555555] hover:bg-[#f6f6f6] disabled:opacity-30" :disabled="customColors.length <= 1" type="button" @click="removeCustomColor(index)"><i aria-hidden="true" class="ri-delete-bin-line" /></button>
                  </div>
                </div>
                <button class="mt-2 text-[11px] font-medium text-[#000091] disabled:opacity-50" :disabled="customColors.length >= 8" type="button" @click="addCustomColor">+ Ajouter une couleur</button>
              </div>
            </fieldset>
            <div class="mt-3 flex flex-wrap gap-4"><label class="inline-flex items-center gap-2 text-[11px]"><input v-model="showValues" type="checkbox">Afficher les valeurs</label><label class="inline-flex items-center gap-2 text-[11px]"><input v-model="showLegend" type="checkbox">Afficher la légende</label></div>
          </details>

          <details class="code-disclosure">
            <summary><span class="flex items-center gap-2"><i aria-hidden="true" class="ri-terminal-line" />Requête SQL</span><i aria-hidden="true" class="ri-arrow-down-s-line disclosure-arrow" /></summary>
            <div class="border-t border-[#e5e5e5]">
              <div class="flex min-h-8 items-center justify-between bg-[#f6f6f6] px-3 font-mono text-[10px] text-[#555555]"><span>SQL</span><span>SELECT et WITH uniquement</span></div>
              <ExplorationSqlEditor v-model="sql" :columns="columns.map(column => column.name)" />
            </div>
          </details>
          <details class="code-disclosure">
            <summary><span class="flex items-center gap-2"><i aria-hidden="true" class="ri-braces-line" />Spécification du graphique</span><i aria-hidden="true" class="ri-arrow-down-s-line disclosure-arrow" /></summary>
            <div class="border-t border-[#e5e5e5]">
              <div class="flex min-h-8 items-center justify-between bg-[#f6f6f6] px-3 font-mono text-[10px] text-[#555555]"><span>JSON</span><span>Configuration du rendu</span></div>
              <textarea v-model="specJson" rows="14" spellcheck="false" aria-label="Spécification JSON du graphique" class="json-editor" />
            </div>
          </details>
          <button class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#000091] px-4 text-[12px] font-medium text-white hover:bg-[#1212ff]" type="button" @click="applySpecification"><i aria-hidden="true" class="ri-refresh-line" />Appliquer le SQL et la spécification</button>
          </template>
        </div>

        <template v-else>
          <ExplorationConversationScroller
            :message-count="agentMessages.length"
            :responding="agentResponding"
            transparent
          >
            <ExplorationAgentEmptyState
              v-if="!agentMessages.length"
              class="min-h-full"
              :loading="loading"
              :ready="Boolean(selectedResource && columns.length)"
              :resource-title="selectedResource ? visualizationResourceName(selectedResource) : undefined"
              :schema-columns="columns"
              @load="loadResource"
              @suggestion="assistantPrompt = $event"
            />
            <ExplorationAgentMessage
              v-for="(message, messageIndex) in agentMessages"
              :key="message.id"
              :message="message"
              :question="message.role === 'assistant' ? previousUserQuestion(messageIndex) : undefined"
              :responding="agentResponding && message.id === activeAssistantMessageId"
              :source="selectedResource ? `${selectedResource.title} · ${selectedResource.organization}` : undefined"
              @clarify="resolveClarification"
            />
            <ExplorationAgentThinking v-if="showInitialThinking" />
            <ExplorationStatusMessage
              v-if="assistantErrorPresentation && !agentResponding"
              action-label="Réessayer"
              :code="assistantErrorPresentation.code"
              :details="assistantErrorPresentation.technicalDetails"
              :message="assistantErrorPresentation.message"
              :request-id="assistantErrorPresentation.requestId"
              :source-label="assistantErrorPresentation.sourceLabel"
              :title="assistantErrorPresentation.title"
              tone="error"
              @action="retryAssistant"
            />
          </ExplorationConversationScroller>
          <ExplorationAgentComposer
            v-model="assistantPrompt"
            v-model:selected-model-id="selectedModelId"
            context-description="L’assistant crée ou modifie le graphique affiché dans la prévisualisation."
            context-initially-open
            context-title="Visualisation en cours"
            :disabled="!selectedResource || !columns.length"
            disabled-placeholder="Sélectionnez d’abord un jeu de données et une ressource"
            :resource-organization="selectedResource?.organization"
            :resource-title="selectedResource ? visualizationResourceName(selectedResource) : undefined"
            :responding="agentResponding"
            @stop="stopAgent"
            @submit="submitAssistant"
          />
        </template>
      </aside>
    </div>
    </div>
  </main>
</template>

<style scoped>
.visualization-shell { display: flex; height: calc(100dvh - 48px); min-height: 680px; max-height: 860px; width: calc(100% - 32px); max-width: 1440px; margin: 24px auto 64px; flex-direction: column; overflow: hidden; border: 1px solid #e5e5e5; border-radius: 6px; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 5%); }
.source-context { display: grid; min-height: 88px; grid-template-columns: minmax(190px, 0.8fr) minmax(0, 3fr) minmax(145px, 0.6fr); align-items: center; gap: 20px; border-bottom: 1px solid #d5d5d5; background: #fff; padding: 12px 20px; }
.source-context__heading { display: flex; min-width: 0; align-items: center; gap: 10px; }
.source-context__fields { display: grid; min-width: 0; grid-template-columns: minmax(130px, 0.75fr) minmax(220px, 1.5fr) minmax(170px, 1fr); gap: 12px; }
.source-field { display: block; min-width: 0; color: #555555; font-size: 10px; font-weight: 500; }
.source-field > span { margin-bottom: 4px; display: block; }
.source-context__status { display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; font-size: 10px; }
.visualization-workspace { display: grid; min-height: 0; flex: 1; grid-template-columns: minmax(0, 1fr) minmax(360px, 430px); }
.visualization-center { display: flex; min-height: 0; flex-direction: column; overflow: hidden; }
.visualization-editor { min-height: 0; overflow-y: auto; }
.center-tabs { display: flex; height: 44px; flex-shrink: 0; align-items: stretch; gap: 20px; border-bottom: 1px solid #e5e5e5; background: #fff; padding: 0 20px; }
.center-tab { position: relative; display: inline-flex; align-items: center; gap: 6px; border-bottom: 2px solid transparent; padding: 0 2px; color: #555555; font-size: 12px; font-weight: 400; }
.center-tab:hover { color: #000091; }
.center-tab--active { border-bottom-color: #000091; color: #000091; }
.form-control, .form-select { display: block; min-height: 36px; width: 100%; min-width: 0; border: 1px solid #e5e5e5; border-radius: 6px; background-color: #fff; padding: 7px 10px; color: #161616; font-size: 11px; outline: none; transition: border-color 120ms ease, box-shadow 120ms ease; }
.form-control:focus, .form-select:focus { border-color: #000091; box-shadow: 0 0 0 2px #ececfe; }
.form-control:disabled, .form-select:disabled { cursor: not-allowed; background-color: #f6f6f6; color: #777777; }
.form-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3Cpath fill='%23161616' d='m7 10l5 5l5-5z'/%3E%3C/svg%3E"); background-position: right 9px center; background-repeat: no-repeat; background-size: 16px; padding-right: 34px; }
.chart-type-button { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; gap: 7px; border: 1px solid #dddddd; border-radius: 4px; background: white; color: #555555; font-size: 11px; }
.chart-type-button--active { border-color: #000091; background: #ececfe; color: #000091; font-weight: 600; }
.palette-option { display: flex; min-height: 38px; cursor: pointer; align-items: center; gap: 10px; border: 1px solid #dddddd; border-radius: 4px; background: #fff; padding: 7px 10px; color: #555555; font-size: 11px; }
.palette-option:hover { border-color: #929292; }
.palette-option--active { border-color: #000091; background: #ececfe; color: #000091; font-weight: 600; box-shadow: 0 0 0 1px #000091; }
.code-disclosure { overflow: hidden; border: 1px solid #e5e5e5; border-radius: 2px; background: #fff; }
.code-disclosure > summary { display: flex; min-height: 40px; cursor: pointer; list-style: none; align-items: center; justify-content: space-between; gap: 12px; padding: 0 12px; color: #555555; font-size: 12px; font-weight: 600; }
.code-disclosure > summary::-webkit-details-marker { display: none; }
.code-disclosure .disclosure-arrow { transition: transform 160ms ease; }
.code-disclosure[open] .disclosure-arrow { transform: rotate(180deg); }
.json-editor { display: block; min-height: 210px; width: 100%; resize: vertical; border: 0; border-top: 1px solid #e5e5e5; background: #fff; padding: 12px; color: #555555; font-family: var(--font-mono); font-size: 12px; line-height: 1.6; outline: none; tab-size: 2; }
.json-editor:focus { box-shadow: inset 0 0 0 2px #000091; }
@media (max-width: 1180px) {
  .source-context { grid-template-columns: minmax(160px, 0.6fr) minmax(0, 3fr); }
  .source-context__status { display: none; }
  .visualization-workspace { grid-template-columns: minmax(0, 1fr) minmax(330px, 390px); }
}
@media (max-width: 760px) {
  .visualization-shell { height: auto; min-height: 0; max-height: none; width: calc(100% - 16px); margin: 8px auto 20px; overflow: visible; }
  .source-context { display: block; padding: 14px; }
  .source-context__fields { margin-top: 14px; display: grid; grid-template-columns: 1fr; }
  .visualization-workspace { display: flex; flex-direction: column; }
  .visualization-center { min-height: 620px; }
  .visualization-editor { min-height: 620px; border-left: 0; border-top: 1px solid #777777; }
}
</style>
