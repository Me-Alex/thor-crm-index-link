import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import type { SpatialAction, SpatialEdge, SpatialGraphModel, SpatialMetric, SpatialNode, SpatialSourceHealthDetail } from "./types";

interface BuildSpatialGraphOptions {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
  selectedNodeId?: string | undefined;
}

const formatCurrency = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "EUR"
});

const listingPositions = [
  { x: 500, y: 220, width: 380 },
  { x: 480, y: 545, width: 310 },
  { x: 820, y: 555, width: 300 },
  { x: 625, y: 705, width: 285 }
];

const workflowStatuses: TenantWorkflowStatus[] = ["new", "in_progress", "contacted", "ignored", "archived"];

export function buildSpatialGraphModel(options: BuildSpatialGraphOptions): SpatialGraphModel {
  const selectedListingId = options.selectedNodeId?.startsWith("listing-")
    ? options.selectedNodeId.replace("listing-", "")
    : undefined;
  const primaryListing = options.listings.find((listing) => listing.id === selectedListingId) ?? options.listings[0];

  if (!primaryListing) {
    return buildEmptyGraph(options);
  }

  const primaryNodeId = `listing-${primaryListing.id}`;
  const requestedSelectedNodeId = options.selectedNodeId ?? primaryNodeId;
  const nodes: SpatialNode[] = [
    ...buildListingNodes(options.listings, primaryListing.id),
    buildSourceClusterNode(options.sourceHealth),
    buildWorkflowNode(primaryListing, options.workflowItems),
    buildSavedSearchNode(options.savedSearches),
    buildSourceHealthNode(options.sourceHealth),
    buildPriceHistoryNode(primaryListing),
    buildAlertDeliveryNode(options.alertDeliveries)
  ];
  const edges: SpatialEdge[] = [
    { id: "edge-source-cluster", from: primaryNodeId, to: "source-cluster", tone: "source", label: "sources" },
    { id: "edge-workflow", from: primaryNodeId, to: `workflow-${primaryListing.id}`, tone: "workflow", label: "tenant" },
    { id: "edge-health", from: "source-cluster", to: "source-health", tone: "health", label: "health" },
    { id: "edge-saved", from: "saved-search", to: primaryNodeId, tone: "muted", label: "matches" },
    { id: "edge-history", from: primaryNodeId, to: `price-history-${primaryListing.id}`, tone: "primary", label: "price" },
    { id: "edge-alert", from: "alert-delivery", to: primaryNodeId, tone: "muted", label: "alert" }
  ];

  return {
    nodes,
    edges,
    selectedNodeId: nodes.some((node) => node.id === requestedSelectedNodeId) ? requestedSelectedNodeId : primaryNodeId,
    primaryListingId: primaryListing.id,
    summary: buildSummary(options)
  };
}

function buildListingNodes(listings: DemoListing[], primaryListingId: string): SpatialNode[] {
  const orderedListings = [
    ...listings.filter((listing) => listing.id === primaryListingId),
    ...listings.filter((listing) => listing.id !== primaryListingId).slice(0, 3)
  ];

  return orderedListings.map((listing, index) => {
    const position = listingPositions[index] ?? listingPositions[listingPositions.length - 1]!;
    const primarySource = listing.sources[0];
    const actions: SpatialAction[] = primarySource
      ? [{ id: `open-source-${listing.id}`, label: "Open source", type: "open_url", url: primarySource.url }]
      : [];

    return {
      id: `listing-${listing.id}`,
      kind: "listing",
      title: listing.title,
      eyebrow: index === 0 ? "Canonical candidate" : "Related listing",
      subtitle: `${listing.city} · ${listing.neighborhood}`,
      body: "Index + link: normalized fields with a link to the original source, without re-hosting portal content.",
      x: position.x,
      y: position.y,
      width: position.width,
      tone: index === 0 ? "primary" : "muted",
      listingId: listing.id,
      noteCount: 0,
      ...(primarySource ? { sourceUrl: primarySource.url } : {}),
      metrics: [
        { label: "Price", value: formatCurrency.format(listing.priceEur), tone: listing.changedToday ? "warning" : "neutral" },
        { label: "Area", value: `${listing.areaSqm} mp` },
        { label: "Rooms", value: String(listing.rooms) },
        { label: "Match", value: `${Math.round(listing.matchScore * 100)}%`, tone: "good" }
      ],
      actions
    };
  });
}

function buildSourceClusterNode(sourceHealth: SourceHealth[]): SpatialNode {
  const activeSources = sourceHealth.filter((source) => source.mode === "on").length;

  return {
    id: "source-cluster",
    kind: "source_cluster",
    title: "Source cluster",
    eyebrow: "Ingestion",
    subtitle: `${activeSources}/${sourceHealth.length} sources active`,
    body: "Source adapters stay isolated; actions point back to external source URLs only.",
    x: 350,
    y: 170,
    width: 290,
    tone: "source",
    metrics: sourceHealth.slice(0, 3).map((source) => ({
      label: source.name,
      value: source.mode,
      tone: source.mode === "on" ? "good" : source.mode === "degraded" ? "warning" : "danger"
    })),
    actions: [{ id: "focus-source-health", label: "View health", type: "focus_node", nodeId: "source-health" }]
  };
}

function buildWorkflowNode(listing: DemoListing, workflowItems: TenantWorkflowItem[]): SpatialNode {
  const workflowItem = workflowItems.find((item) => item.listingId === listing.id);

  return {
    id: `workflow-${listing.id}`,
    kind: "tenant_workflow",
    title: "Tenant workflow",
    eyebrow: "Agency",
    subtitle: workflowItem ? `Status: ${workflowLabel(workflowItem.status)}` : "Local status",
    body: `Assignee: ${workflowItem?.assignee ?? listing.assignee}`,
    x: 870,
    y: 130,
    width: 320,
    tone: "workflow",
    listingId: listing.id,
    noteCount: workflowItem?.notes.length ?? 0,
    metrics: [
      { label: "Status", value: workflowItem ? workflowLabel(workflowItem.status) : listing.status },
      { label: "Agent", value: workflowItem?.assignee ?? listing.assignee },
      { label: "Updated", value: workflowItem?.updatedAt ?? "demo" }
    ],
    actions: [...buildWorkflowActions(listing.id), { id: `add-note-${listing.id}`, label: "Adauga nota", type: "add_note", listingId: listing.id }]
  };
}

function buildSavedSearchNode(savedSearches: SavedSearch[]): SpatialNode {
  const firstSearch = savedSearches[0];

  return {
    id: "saved-search",
    kind: "saved_search",
    title: firstSearch?.name ?? "Saved searches",
    eyebrow: "Saved searches",
    subtitle: firstSearch?.criteria ?? "No saved search",
    body: firstSearch ? `${firstSearch.matches} matches · ${firstSearch.frequency}` : "Create tenant-scoped searches and alerts.",
    x: 560,
    y: 40,
    width: 360,
    tone: "saved",
    metrics: [
      { label: "Total", value: String(savedSearches.length) },
      { label: "Frequency", value: firstSearch?.frequency ?? "n/a" }
    ],
    actions: []
  };
}

function buildSourceHealthNode(sourceHealth: SourceHealth[]): SpatialNode {
  const averages = averageSourceHealth(sourceHealth);

  return {
    id: "source-health",
    kind: "source_health",
    title: "Source health",
    eyebrow: "Operations",
    subtitle: `${averages.timeToIndexMinutes} min time-to-index`,
    body: "Health model per sursa pentru mode, crawl, parse, matching, latest seen si indexing latency.",
    x: 340,
    y: 455,
    width: 300,
    tone: averages.parseSuccessRate >= 0.85 ? "health" : "warning",
    sourceHealthDetails: sourceHealth.map(toSourceHealthDetail),
    metrics: [
      { label: "Crawl", value: `${Math.round(averages.crawlSuccessRate * 100)}%`, tone: "good" },
      {
        label: "Parse",
        value: `${Math.round(averages.parseSuccessRate * 100)}%`,
        tone: averages.parseSuccessRate >= 0.85 ? "good" : "warning"
      },
      { label: "Match", value: `${Math.round(averages.matchRate * 100)}%` }
    ],
    actions: []
  };
}

function buildPriceHistoryNode(listing: DemoListing): SpatialNode {
  const latestPoint = listing.history[listing.history.length - 1];

  return {
    id: `price-history-${listing.id}`,
    kind: "price_history",
    title: "Price history",
    eyebrow: "History",
    subtitle: latestPoint ? `${latestPoint.date} · ${latestPoint.availability}` : "No history",
    body: latestPoint ? `Latest indexed price observation: ${formatCurrency.format(latestPoint.priceEur)}.` : "No price observations.",
    x: 880,
    y: 365,
    width: 320,
    tone: "history",
    listingId: listing.id,
    metrics: listing.history.slice(-3).map((point) => ({
      label: point.date,
      value: formatCurrency.format(point.priceEur),
      tone: point.availability === "changed" ? "warning" : "neutral"
    })),
    actions: []
  };
}

function buildAlertDeliveryNode(alertDeliveries: AlertDelivery[]): SpatialNode {
  const latestAlert = alertDeliveries[0];

  return {
    id: "alert-delivery",
    kind: "alert_delivery",
    title: latestAlert?.title ?? "Alert delivery",
    eyebrow: "Alerts",
    subtitle: latestAlert ? `${latestAlert.channel} · ${latestAlert.status}` : "No alert",
    body: latestAlert ? `Latest delivery: ${latestAlert.deliveredAt}.` : "Alert deliveries appear here when saved searches match.",
    x: 410,
    y: 690,
    width: 360,
    tone: "alert",
    metrics: [
      { label: "Total", value: String(alertDeliveries.length) },
      { label: "Status", value: latestAlert?.status ?? "n/a" }
    ],
    actions: []
  };
}

function buildEmptyGraph(options: BuildSpatialGraphOptions): SpatialGraphModel {
  return {
    nodes: [
      {
        id: "empty-state",
        kind: "empty_state",
        title: "Nu exista listinguri indexate",
        eyebrow: "Empty state",
        subtitle: "Worker API did not return indexed listings.",
        body: "Start a scan or check source health. The workspace remains index + link only.",
        x: 390,
        y: 230,
        width: 430,
        tone: "muted",
        metrics: [
          { label: "Sources", value: String(options.sourceHealth.length) },
          { label: "Saved searches", value: String(options.savedSearches.length) }
        ],
        actions: []
      }
    ],
    edges: [],
    selectedNodeId: "empty-state",
    summary: buildSummary(options)
  };
}

function averageSourceHealth(sourceHealth: SourceHealth[]) {
  if (sourceHealth.length === 0) {
    return { crawlSuccessRate: 0, parseSuccessRate: 0, matchRate: 0, timeToIndexMinutes: 0 };
  }

  const totals = sourceHealth.reduce(
    (accumulator, source) => ({
      crawlSuccessRate: accumulator.crawlSuccessRate + source.crawlSuccessRate,
      parseSuccessRate: accumulator.parseSuccessRate + source.parseSuccessRate,
      matchRate: accumulator.matchRate + source.matchRate,
      timeToIndexMinutes: accumulator.timeToIndexMinutes + source.timeToIndexMinutes
    }),
    { crawlSuccessRate: 0, parseSuccessRate: 0, matchRate: 0, timeToIndexMinutes: 0 }
  );

  return {
    crawlSuccessRate: totals.crawlSuccessRate / sourceHealth.length,
    parseSuccessRate: totals.parseSuccessRate / sourceHealth.length,
    matchRate: totals.matchRate / sourceHealth.length,
    timeToIndexMinutes: Math.round(totals.timeToIndexMinutes / sourceHealth.length)
  };
}

function toSourceHealthDetail(source: SourceHealth): SpatialSourceHealthDetail {
  const optionalDetails = source as SourceHealth & { listingCount?: number; latestSeenAt?: string };

  return {
    id: source.id,
    name: source.name,
    mode: source.mode,
    ...(typeof optionalDetails.listingCount === "number" ? { listingCount: optionalDetails.listingCount } : {}),
    ...(typeof optionalDetails.latestSeenAt === "string" ? { latestSeenAt: optionalDetails.latestSeenAt } : {}),
    crawlSuccessRate: source.crawlSuccessRate,
    parseSuccessRate: source.parseSuccessRate,
    fieldCoverageRate: source.fieldCoverageRate,
    matchRate: source.matchRate,
    timeToIndexMinutes: source.timeToIndexMinutes
  };
}

function buildWorkflowActions(listingId: string): SpatialAction[] {
  return workflowStatuses.map((status) => ({
    id: `set-${status}-${listingId}`,
    label: workflowLabel(status),
    type: "update_status",
    listingId,
    status
  }));
}

function workflowLabel(status: TenantWorkflowStatus): string {
  const labels: Record<TenantWorkflowStatus, string> = {
    new: "New",
    in_progress: "In progress",
    contacted: "Contacted",
    ignored: "Ignored",
    archived: "Archived"
  };

  return labels[status];
}

function buildSummary(options: BuildSpatialGraphOptions) {
  return {
    listingCount: options.listings.length,
    sourceCount: options.sourceHealth.length,
    activeSourceCount: options.sourceHealth.filter((source) => source.mode === "on").length,
    savedSearchCount: options.savedSearches.length,
    alertCount: options.alertDeliveries.length
  };
}
