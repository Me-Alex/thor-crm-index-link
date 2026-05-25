# P1B Spatial Deal Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the classic Thor web dashboard with the approved P1B full-screen spatial deal canvas while preserving the existing Worker, Supabase Auth, tenant workflow, saved search, source health, and index + link data paths.

**Architecture:** Keep the existing API clients and app data-fetching logic, then introduce a focused spatial UI layer under `apps/web/src/spatial`. A deterministic graph model converts listings, sources, tenant workflow, saved searches, alerts, and health metrics into selectable nodes and visual edges; React components render the command bar, canvas, inspector, toolbox, minimap, and mobile stack.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, Testing Library, CSS modules via plain imported CSS, existing Worker API clients, existing Supabase Auth helper, existing tenant workflow and saved search clients.

---

## Scope

This plan covers only the `apps/web` P1B interface refactor. It does not change Worker crawling, Supabase migrations, RLS policies, Cloudflare deployment config, or backend API contracts.

The implementation must keep Thor as an **index + link** product:

- listing nodes and inspector actions show source links;
- no full portal descriptions, image galleries, or re-hosted portal content are added;
- live Worker data remains the primary source when available;
- demo fallback remains safe and uses existing demo records.

## File Structure

- Create `apps/web/src/spatial/types.ts`
  - Shared spatial node, edge, action, and graph model types.
- Create `apps/web/src/spatial/spatialGraph.ts`
  - Deterministic conversion from existing app data into P1B graph nodes and edges.
- Create `apps/web/src/spatial/useSpatialWorkspace.ts`
  - UI state for selected node, command query, filtered listings, and graph derivation.
- Create `apps/web/src/spatial/SpatialAppShell.tsx`
  - P1B composition root for command bar, toolbox, canvas, inspector, minimap, and mobile stack.
- Create `apps/web/src/spatial/CommandBar.tsx`
  - Top command/search surface with quick actions and data mode indicator.
- Create `apps/web/src/spatial/SpatialCanvas.tsx`
  - Desktop freeform canvas with absolute-positioned nodes and SVG edges.
- Create `apps/web/src/spatial/CanvasNode.tsx`
  - Accessible node button/card renderer for all node kinds.
- Create `apps/web/src/spatial/CanvasEdge.tsx`
  - SVG line renderer for deterministic node links.
- Create `apps/web/src/spatial/NodeInspector.tsx`
  - Context panel for selected node details and listing workflow actions.
- Create `apps/web/src/spatial/CanvasToolbox.tsx`
  - Left-side visual mode tools.
- Create `apps/web/src/spatial/CanvasMinimap.tsx`
  - Static minimap derived from graph node coordinates.
- Create `apps/web/src/spatial/NodeStackMobile.tsx`
  - Mobile-first vertical rendering of nodes.
- Create `apps/web/src/spatial/spatialStyles.css`
  - P1B visual system, responsive layout, grid background, nodes, edges, inspector, minimap, and mobile stack.
- Modify `apps/web/src/App.tsx`
  - Keep current effects and handlers, replace the classic dashboard return markup with `SpatialAppShell`.
- Modify `apps/web/test/App.test.tsx`
  - Replace classic dashboard assertions with P1B assertions while preserving live/fallback/auth/workflow/saved-search coverage.
- Create `apps/web/test/spatialGraph.test.ts`
  - Unit coverage for deterministic graph model, empty state, source health, saved search, and index + link actions.
- Create `apps/web/test/SpatialAppShell.test.tsx`
  - Component coverage for selection, command filtering, inspector workflow actions, and mobile-safe content.

## Data Contracts

Use the existing source types:

```ts
import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
```

Add spatial types in `apps/web/src/spatial/types.ts`:

```ts
import type { TenantWorkflowStatus } from "../lib/tenantWorkflowApi";

export type SpatialNodeKind =
  | "listing"
  | "source_cluster"
  | "tenant_workflow"
  | "saved_search"
  | "source_health"
  | "price_history"
  | "alert_delivery"
  | "empty_state";

export type SpatialTone =
  | "primary"
  | "source"
  | "workflow"
  | "saved"
  | "health"
  | "history"
  | "alert"
  | "muted"
  | "warning";

export interface SpatialMetric {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warning" | "danger";
}

export type SpatialAction =
  | { id: string; label: string; type: "open_url"; url: string }
  | { id: string; label: string; type: "update_status"; listingId: string; status: TenantWorkflowStatus }
  | { id: string; label: string; type: "focus_node"; nodeId: string };

export interface SpatialNode {
  id: string;
  kind: SpatialNodeKind;
  title: string;
  eyebrow: string;
  subtitle: string;
  body: string;
  x: number;
  y: number;
  width: number;
  tone: SpatialTone;
  listingId?: string;
  sourceUrl?: string;
  metrics: SpatialMetric[];
  actions: SpatialAction[];
}

export interface SpatialEdge {
  id: string;
  from: string;
  to: string;
  tone: "primary" | "source" | "workflow" | "health" | "muted";
  label?: string;
}

export interface SpatialGraphSummary {
  listingCount: number;
  sourceCount: number;
  activeSourceCount: number;
  savedSearchCount: number;
  alertCount: number;
}

export interface SpatialGraphModel {
  nodes: SpatialNode[];
  edges: SpatialEdge[];
  selectedNodeId: string;
  primaryListingId?: string;
  summary: SpatialGraphSummary;
}
```

## Task 1: Add Spatial Graph Model Tests

**Files:**
- Create: `apps/web/test/spatialGraph.test.ts`
- Create: `apps/web/src/spatial/types.ts`
- Create: `apps/web/src/spatial/spatialGraph.ts`

- [ ] **Step 1: Create the spatial directory and type file**

Run:

```powershell
New-Item -ItemType Directory -Force apps/web/src/spatial
```

Create `apps/web/src/spatial/types.ts` with the exact type contract from the **Data Contracts** section.

- [ ] **Step 2: Write failing graph tests**

Create `apps/web/test/spatialGraph.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { alertDeliveries, demoListings, savedSearches, sourceHealth } from "../src/data/demoData";
import { buildDemoTenantWorkflow } from "../src/lib/tenantWorkflowApi";
import { buildSpatialGraphModel } from "../src/spatial/spatialGraph";

describe("buildSpatialGraphModel", () => {
  it("builds deterministic P1B nodes from existing Thor data", () => {
    const graph = buildSpatialGraphModel({
      listings: demoListings,
      sourceHealth,
      workflowItems: buildDemoTenantWorkflow(demoListings),
      savedSearches,
      alertDeliveries,
      selectedNodeId: "listing-cl-apt-titan"
    });

    expect(graph.selectedNodeId).toBe("listing-cl-apt-titan");
    expect(graph.primaryListingId).toBe("cl-apt-titan");
    expect(graph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining([
        "listing",
        "source_cluster",
        "tenant_workflow",
        "saved_search",
        "source_health",
        "price_history",
        "alert_delivery"
      ])
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "listing-cl-apt-titan", to: "source-cluster" }),
        expect.objectContaining({ from: "listing-cl-apt-titan", to: "workflow-cl-apt-titan" })
      ])
    );
  });

  it("keeps source actions as index plus link URLs", () => {
    const graph = buildSpatialGraphModel({
      listings: demoListings,
      sourceHealth,
      workflowItems: buildDemoTenantWorkflow(demoListings),
      savedSearches,
      alertDeliveries,
      selectedNodeId: "listing-cl-apt-titan"
    });

    const listingNode = graph.nodes.find((node) => node.id === "listing-cl-apt-titan");

    expect(listingNode?.body).toMatch(/index \+ link/i);
    expect(listingNode?.actions).toContainEqual({
      id: "open-source-cl-apt-titan",
      label: "Open source",
      type: "open_url",
      url: "https://example.test/imobiliare/titan-2-camere"
    });
  });

  it("returns an explicit empty-state graph when there are no listings", () => {
    const graph = buildSpatialGraphModel({
      listings: [],
      sourceHealth,
      workflowItems: [],
      savedSearches,
      alertDeliveries,
      selectedNodeId: undefined
    });

    expect(graph.selectedNodeId).toBe("empty-state");
    expect(graph.primaryListingId).toBeUndefined();
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "empty-state",
        kind: "empty_state",
        title: "Nu exista listinguri indexate"
      })
    );
  });
});
```

- [ ] **Step 3: Run graph tests and verify failure**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- spatialGraph.test.ts
```

Expected result: Vitest fails because `apps/web/src/spatial/spatialGraph.ts` does not export `buildSpatialGraphModel`.

- [ ] **Step 4: Implement the graph builder**

Create `apps/web/src/spatial/spatialGraph.ts`:

```ts
import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import type { SpatialAction, SpatialEdge, SpatialGraphModel, SpatialMetric, SpatialNode } from "./types";

interface BuildSpatialGraphOptions {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
  selectedNodeId?: string;
}

const formatCurrency = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "EUR"
});

const listingPositions = [
  { x: 420, y: 220, width: 380 },
  { x: 360, y: 520, width: 310 },
  { x: 700, y: 540, width: 300 },
  { x: 250, y: 360, width: 285 }
];

export function buildSpatialGraphModel(options: BuildSpatialGraphOptions): SpatialGraphModel {
  const selectedListingId = options.selectedNodeId?.startsWith("listing-")
    ? options.selectedNodeId.replace("listing-", "")
    : undefined;
  const primaryListing = options.listings.find((listing) => listing.id === selectedListingId) ?? options.listings[0];
  const selectedNodeId = options.selectedNodeId ?? (primaryListing ? `listing-${primaryListing.id}` : "empty-state");

  if (!primaryListing) {
    return buildEmptyGraph(options, selectedNodeId);
  }

  const nodes: SpatialNode[] = [];
  const edges: SpatialEdge[] = [];
  const primaryNodeId = `listing-${primaryListing.id}`;

  nodes.push(...buildListingNodes(options.listings, primaryListing.id));
  nodes.push(buildSourceClusterNode(options.sourceHealth));
  nodes.push(buildSourceHealthNode(options.sourceHealth));
  nodes.push(buildWorkflowNode(primaryListing, options.workflowItems));
  nodes.push(buildSavedSearchNode(options.savedSearches));
  nodes.push(buildPriceHistoryNode(primaryListing));
  nodes.push(buildAlertDeliveryNode(options.alertDeliveries));

  edges.push(
    { id: "edge-source-cluster", from: primaryNodeId, to: "source-cluster", tone: "source", label: "surse" },
    { id: "edge-workflow", from: primaryNodeId, to: `workflow-${primaryListing.id}`, tone: "workflow", label: "tenant" },
    { id: "edge-health", from: "source-cluster", to: "source-health", tone: "health", label: "health" },
    { id: "edge-saved", from: "saved-search", to: primaryNodeId, tone: "muted", label: "matches" },
    { id: "edge-history", from: primaryNodeId, to: `price-history-${primaryListing.id}`, tone: "primary", label: "istoric" },
    { id: "edge-alert", from: "alert-delivery", to: primaryNodeId, tone: "muted", label: "alerta" }
  );

  return {
    nodes,
    edges,
    selectedNodeId: nodes.some((node) => node.id === selectedNodeId) ? selectedNodeId : primaryNodeId,
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
    const position = listingPositions[index] ?? listingPositions[listingPositions.length - 1];
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
      body: "Index + link: campuri normalizate si trimitere catre sursa originala.",
      x: position.x,
      y: position.y,
      width: position.width,
      tone: index === 0 ? "primary" : "muted",
      listingId: listing.id,
      sourceUrl: primarySource?.url,
      metrics: [
        { label: "Pret", value: formatCurrency.format(listing.priceEur), tone: listing.changedToday ? "warning" : "neutral" },
        { label: "Suprafata", value: `${listing.areaSqm} mp` },
        { label: "Camere", value: String(listing.rooms) },
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
    eyebrow: "Ingestie",
    subtitle: `${activeSources}/${sourceHealth.length} surse active`,
    body: "Adaptere izolate, rate limit si degradare controlata per portal.",
    x: 80,
    y: 170,
    width: 290,
    tone: "source",
    metrics: sourceHealth.slice(0, 3).map((source) => ({
      label: source.name,
      value: source.mode,
      tone: source.mode === "on" ? "good" : source.mode === "degraded" ? "warning" : "danger"
    })),
    actions: [{ id: "focus-source-health", label: "Vezi health", type: "focus_node", nodeId: "source-health" }]
  };
}

function buildSourceHealthNode(sourceHealth: SourceHealth[]): SpatialNode {
  const averages = averageSourceHealth(sourceHealth);
  return {
    id: "source-health",
    kind: "source_health",
    title: "Source health",
    eyebrow: "Operational",
    subtitle: `${averages.timeToIndexMinutes} min time-to-index`,
    body: "Monitorizare pentru crawl, parse, match si latenta.",
    x: 90,
    y: 440,
    width: 300,
    tone: averages.parseSuccessRate >= 0.85 ? "health" : "warning",
    metrics: [
      { label: "Crawl", value: `${Math.round(averages.crawlSuccessRate * 100)}%`, tone: "good" },
      { label: "Parse", value: `${Math.round(averages.parseSuccessRate * 100)}%`, tone: averages.parseSuccessRate >= 0.85 ? "good" : "warning" },
      { label: "Match", value: `${Math.round(averages.matchRate * 100)}%` }
    ],
    actions: []
  };
}

function buildWorkflowNode(listing: DemoListing, workflowItems: TenantWorkflowItem[]): SpatialNode {
  const workflowItem = workflowItems.find((item) => item.listingId === listing.id);
  return {
    id: `workflow-${listing.id}`,
    kind: "tenant_workflow",
    title: "Tenant workflow",
    eyebrow: "Agentie",
    subtitle: workflowItem ? `Status: ${workflowLabel(workflowItem.status)}` : "Status local",
    body: `Assignee: ${workflowItem?.assignee ?? listing.assignee}`,
    x: 870,
    y: 130,
    width: 320,
    tone: "workflow",
    listingId: listing.id,
    metrics: [
      { label: "Status", value: workflowItem ? workflowLabel(workflowItem.status) : listing.status },
      { label: "Agent", value: workflowItem?.assignee ?? listing.assignee },
      { label: "Updated", value: workflowItem?.updatedAt ?? "demo" }
    ],
    actions: buildWorkflowActions(listing.id)
  };
}

function buildSavedSearchNode(savedSearches: SavedSearch[]): SpatialNode {
  const firstSearch = savedSearches[0];
  return {
    id: "saved-search",
    kind: "saved_search",
    title: firstSearch?.name ?? "Saved searches",
    eyebrow: "Cautari salvate",
    subtitle: firstSearch ? firstSearch.criteria : "Nicio cautare salvata",
    body: firstSearch ? `${firstSearch.matches} match-uri · ${firstSearch.frequency}` : "Creeaza cautari per tenant si alerte.",
    x: 420,
    y: 40,
    width: 360,
    tone: "saved",
    metrics: [
      { label: "Total", value: String(savedSearches.length) },
      { label: "Frecventa", value: firstSearch?.frequency ?? "n/a" }
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
    eyebrow: "Istoric",
    subtitle: latestPoint ? `${latestPoint.date} · ${latestPoint.availability}` : "Fara istoric",
    body: latestPoint ? `Ultimul pret observat: ${formatCurrency.format(latestPoint.priceEur)}.` : "Nu exista observatii de pret.",
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
    eyebrow: "Alerte",
    subtitle: latestAlert ? `${latestAlert.channel} · ${latestAlert.status}` : "Nicio alerta",
    body: latestAlert ? `Ultimul delivery: ${latestAlert.deliveredAt}.` : "Alertele apar aici cand exista saved searches.",
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

function buildEmptyGraph(options: BuildSpatialGraphOptions, selectedNodeId: string): SpatialGraphModel {
  const nodes: SpatialNode[] = [
    {
      id: "empty-state",
      kind: "empty_state",
      title: "Nu exista listinguri indexate",
      eyebrow: "Empty state",
      subtitle: "Worker API nu a returnat rezultate.",
      body: "Porneste o scanare sau verifica sursele active. UI-ul ramane index + link.",
      x: 390,
      y: 230,
      width: 430,
      tone: "muted",
      metrics: [
        { label: "Surse", value: String(options.sourceHealth.length) },
        { label: "Saved", value: String(options.savedSearches.length) }
      ],
      actions: []
    }
  ];

  return {
    nodes,
    edges: [],
    selectedNodeId,
    summary: buildSummary(options)
  };
}

function averageSourceHealth(sourceHealth: SourceHealth[]) {
  if (sourceHealth.length === 0) {
    return { crawlSuccessRate: 0, parseSuccessRate: 0, matchRate: 0, timeToIndexMinutes: 0 };
  }

  const totals = sourceHealth.reduce(
    (currentTotals, source) => ({
      crawlSuccessRate: currentTotals.crawlSuccessRate + source.crawlSuccessRate,
      parseSuccessRate: currentTotals.parseSuccessRate + source.parseSuccessRate,
      matchRate: currentTotals.matchRate + source.matchRate,
      timeToIndexMinutes: currentTotals.timeToIndexMinutes + source.timeToIndexMinutes
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

function buildWorkflowActions(listingId: string): SpatialAction[] {
  const statuses: Array<{ label: string; status: TenantWorkflowStatus }> = [
    { label: "Preia", status: "in_progress" },
    { label: "Contactat", status: "contacted" },
    { label: "Ignora", status: "ignored" }
  ];

  return statuses.map((item) => ({
    id: `workflow-${listingId}-${item.status}`,
    label: item.label,
    type: "update_status",
    listingId,
    status: item.status
  }));
}

function workflowLabel(status: TenantWorkflowStatus): string {
  const labels: Record<TenantWorkflowStatus, string> = {
    new: "Nou",
    in_progress: "In lucru",
    contacted: "Contactat",
    ignored: "Ignorat",
    archived: "Arhivat"
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
```

- [ ] **Step 5: Run graph tests and verify pass**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- spatialGraph.test.ts
```

Expected result: the three `buildSpatialGraphModel` tests pass.

- [ ] **Step 6: Commit graph model**

Run:

```powershell
git add apps/web/src/spatial/types.ts apps/web/src/spatial/spatialGraph.ts apps/web/test/spatialGraph.test.ts
git commit -m "Add P1B spatial graph model"
```

## Task 2: Add Spatial Workspace State

**Files:**
- Create: `apps/web/src/spatial/useSpatialWorkspace.ts`
- Modify: `apps/web/test/spatialGraph.test.ts`

- [ ] **Step 1: Add workspace state tests**

Append to `apps/web/test/spatialGraph.test.ts`:

```ts
import { renderHook, act } from "@testing-library/react";
import { useSpatialWorkspace } from "../src/spatial/useSpatialWorkspace";

describe("useSpatialWorkspace", () => {
  it("filters listings through the command query and keeps a selected node", () => {
    const { result } = renderHook(() =>
      useSpatialWorkspace({
        listings: demoListings,
        sourceHealth,
        workflowItems: buildDemoTenantWorkflow(demoListings),
        savedSearches,
        alertDeliveries
      })
    );

    act(() => result.current.setCommandQuery("herastrau"));

    expect(result.current.graph.summary.listingCount).toBe(1);
    expect(result.current.graph.primaryListingId).toBe("cl-rent-herastrau");
    expect(result.current.selectedNode?.title).toBe("Studio premium Herastrau");
  });
});
```

- [ ] **Step 2: Run workspace test and verify failure**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- spatialGraph.test.ts
```

Expected result: Vitest fails because `useSpatialWorkspace` is not exported.

- [ ] **Step 3: Implement workspace hook**

Create `apps/web/src/spatial/useSpatialWorkspace.ts`:

```ts
import { useEffect, useMemo, useState } from "react";
import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem } from "../lib/tenantWorkflowApi";
import { buildSpatialGraphModel } from "./spatialGraph";

interface UseSpatialWorkspaceOptions {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
}

export function useSpatialWorkspace(options: UseSpatialWorkspaceOptions) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [commandQuery, setCommandQuery] = useState("");
  const normalizedQuery = commandQuery.trim().toLowerCase();

  const visibleListings = useMemo(() => {
    if (!normalizedQuery) {
      return options.listings;
    }

    return options.listings.filter((listing) => {
      const haystack = [
        listing.title,
        listing.city,
        listing.district,
        listing.neighborhood,
        listing.propertyType,
        listing.transactionType,
        listing.assignee,
        ...listing.tags,
        ...listing.sources.map((source) => source.name)
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, options.listings]);

  const graph = useMemo(
    () =>
      buildSpatialGraphModel({
        listings: visibleListings,
        sourceHealth: options.sourceHealth,
        workflowItems: options.workflowItems,
        savedSearches: options.savedSearches,
        alertDeliveries: options.alertDeliveries,
        selectedNodeId
      }),
    [visibleListings, options.sourceHealth, options.workflowItems, options.savedSearches, options.alertDeliveries, selectedNodeId]
  );

  useEffect(() => {
    if (!selectedNodeId || !graph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(graph.selectedNodeId);
    }
  }, [graph.nodes, graph.selectedNodeId, selectedNodeId]);

  const selectedNode = graph.nodes.find((node) => node.id === graph.selectedNodeId) ?? graph.nodes[0];
  const selectedListing = selectedNode?.listingId
    ? options.listings.find((listing) => listing.id === selectedNode.listingId)
    : undefined;
  const selectedWorkflowItem = selectedListing
    ? options.workflowItems.find((item) => item.listingId === selectedListing.id)
    : undefined;

  return {
    commandQuery,
    setCommandQuery,
    graph,
    selectedNode,
    selectedListing,
    selectedWorkflowItem,
    selectNode: setSelectedNodeId
  };
}
```

- [ ] **Step 4: Run workspace test and verify pass**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- spatialGraph.test.ts
```

Expected result: `spatialGraph.test.ts` passes.

- [ ] **Step 5: Commit workspace hook**

Run:

```powershell
git add apps/web/src/spatial/useSpatialWorkspace.ts apps/web/test/spatialGraph.test.ts
git commit -m "Add P1B spatial workspace state"
```

## Task 3: Add Presentational Canvas Components

**Files:**
- Create: `apps/web/src/spatial/CanvasNode.tsx`
- Create: `apps/web/src/spatial/CanvasEdge.tsx`
- Create: `apps/web/src/spatial/SpatialCanvas.tsx`
- Create: `apps/web/src/spatial/CanvasToolbox.tsx`
- Create: `apps/web/src/spatial/CanvasMinimap.tsx`
- Create: `apps/web/src/spatial/NodeStackMobile.tsx`
- Create: `apps/web/test/SpatialAppShell.test.tsx`

- [ ] **Step 1: Write failing component tests for node selection**

Create `apps/web/test/SpatialAppShell.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { alertDeliveries, demoListings, savedSearches, sourceHealth } from "../src/data/demoData";
import { buildDemoTenantWorkflow } from "../src/lib/tenantWorkflowApi";
import { buildSpatialGraphModel } from "../src/spatial/spatialGraph";
import { SpatialCanvas } from "../src/spatial/SpatialCanvas";

describe("SpatialCanvas", () => {
  it("renders accessible spatial nodes and calls selection handler", () => {
    const graph = buildSpatialGraphModel({
      listings: demoListings,
      sourceHealth,
      workflowItems: buildDemoTenantWorkflow(demoListings),
      savedSearches,
      alertDeliveries,
      selectedNodeId: "listing-cl-apt-titan"
    });
    const onSelectNode = vi.fn();

    render(<SpatialCanvas graph={graph} selectedNodeId={graph.selectedNodeId} onSelectNode={onSelectNode} />);

    const canvas = screen.getByTestId("spatial-canvas");
    expect(within(canvas).getByRole("button", { name: /Apartament 2 camere Titan/i })).toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole("button", { name: /Tenant workflow/i }));

    expect(onSelectNode).toHaveBeenCalledWith("workflow-cl-apt-titan");
  });
});
```

- [ ] **Step 2: Run component test and verify failure**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- SpatialAppShell.test.tsx
```

Expected result: Vitest fails because `SpatialCanvas` does not exist.

- [ ] **Step 3: Implement `CanvasNode`**

Create `apps/web/src/spatial/CanvasNode.tsx`:

```tsx
import type { SpatialNode } from "./types";

interface CanvasNodeProps {
  node: SpatialNode;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}

export function CanvasNode({ node, selected, onSelect }: CanvasNodeProps) {
  return (
    <button
      type="button"
      className={`canvas-node tone-${node.tone}${selected ? " is-selected" : ""}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`
      }}
      aria-pressed={selected}
      onClick={() => onSelect(node.id)}
    >
      <span className="node-eyebrow">{node.eyebrow}</span>
      <strong>{node.title}</strong>
      <span className="node-subtitle">{node.subtitle}</span>
      <span className="node-body">{node.body}</span>
      <span className="node-metrics">
        {node.metrics.slice(0, 4).map((metric) => (
          <span key={`${node.id}-${metric.label}`} className={`node-metric metric-${metric.tone ?? "neutral"}`}>
            <span>{metric.label}</span>
            <b>{metric.value}</b>
          </span>
        ))}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Implement `CanvasEdge`**

Create `apps/web/src/spatial/CanvasEdge.tsx`:

```tsx
import type { SpatialEdge, SpatialNode } from "./types";

interface CanvasEdgeProps {
  edge: SpatialEdge;
  nodes: SpatialNode[];
}

export function CanvasEdge({ edge, nodes }: CanvasEdgeProps) {
  const fromNode = nodes.find((node) => node.id === edge.from);
  const toNode = nodes.find((node) => node.id === edge.to);

  if (!fromNode || !toNode) {
    return null;
  }

  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + 70;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y + 70;
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2;

  return (
    <g className={`canvas-edge edge-${edge.tone}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {edge.label ? (
        <text x={labelX} y={labelY}>
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}
```

- [ ] **Step 5: Implement `SpatialCanvas`**

Create `apps/web/src/spatial/SpatialCanvas.tsx`:

```tsx
import { CanvasEdge } from "./CanvasEdge";
import { CanvasNode } from "./CanvasNode";
import type { SpatialGraphModel } from "./types";

interface SpatialCanvasProps {
  graph: SpatialGraphModel;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

export function SpatialCanvas({ graph, selectedNodeId, onSelectNode }: SpatialCanvasProps) {
  return (
    <section className="spatial-canvas" data-testid="spatial-canvas" aria-label="Thor spatial deal canvas">
      <svg className="canvas-edges" viewBox="0 0 1280 880" aria-hidden="true" focusable="false">
        {graph.edges.map((edge) => (
          <CanvasEdge key={edge.id} edge={edge} nodes={graph.nodes} />
        ))}
      </svg>
      <div className="canvas-node-layer">
        {graph.nodes.map((node) => (
          <CanvasNode key={node.id} node={node} selected={node.id === selectedNodeId} onSelect={onSelectNode} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Implement toolbox, minimap, and mobile stack**

Create `apps/web/src/spatial/CanvasToolbox.tsx`:

```tsx
const tools = ["Select", "Search", "Saved", "Links", "Settings"];

export function CanvasToolbox() {
  return (
    <nav className="canvas-toolbox" aria-label="Canvas tools">
      {tools.map((tool, index) => (
        <button key={tool} type="button" className={index === 0 ? "is-active" : ""}>
          {tool}
        </button>
      ))}
    </nav>
  );
}
```

Create `apps/web/src/spatial/CanvasMinimap.tsx`:

```tsx
import type { SpatialGraphModel } from "./types";

interface CanvasMinimapProps {
  graph: SpatialGraphModel;
  selectedNodeId: string;
}

export function CanvasMinimap({ graph, selectedNodeId }: CanvasMinimapProps) {
  return (
    <aside className="canvas-minimap" aria-label="Canvas minimap">
      <span>Map</span>
      <svg viewBox="0 0 128 88" aria-hidden="true" focusable="false">
        {graph.nodes.map((node) => (
          <rect
            key={node.id}
            x={node.x / 10}
            y={node.y / 10}
            width={Math.max(10, node.width / 28)}
            height="8"
            rx="3"
            className={node.id === selectedNodeId ? "is-selected" : ""}
          />
        ))}
      </svg>
    </aside>
  );
}
```

Create `apps/web/src/spatial/NodeStackMobile.tsx`:

```tsx
import type { SpatialGraphModel } from "./types";

interface NodeStackMobileProps {
  graph: SpatialGraphModel;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

export function NodeStackMobile({ graph, selectedNodeId, onSelectNode }: NodeStackMobileProps) {
  return (
    <section className="node-stack-mobile" aria-label="Spatial nodes mobile">
      {graph.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`mobile-node tone-${node.tone}${node.id === selectedNodeId ? " is-selected" : ""}`}
          aria-pressed={node.id === selectedNodeId}
          onClick={() => onSelectNode(node.id)}
        >
          <span>{node.eyebrow}</span>
          <strong>{node.title}</strong>
          <small>{node.subtitle}</small>
        </button>
      ))}
    </section>
  );
}
```

- [ ] **Step 7: Run component test and verify pass**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- SpatialAppShell.test.tsx
```

Expected result: `SpatialCanvas` renders nodes and selection handler passes.

- [ ] **Step 8: Commit presentational components**

Run:

```powershell
git add apps/web/src/spatial/CanvasNode.tsx apps/web/src/spatial/CanvasEdge.tsx apps/web/src/spatial/SpatialCanvas.tsx apps/web/src/spatial/CanvasToolbox.tsx apps/web/src/spatial/CanvasMinimap.tsx apps/web/src/spatial/NodeStackMobile.tsx apps/web/test/SpatialAppShell.test.tsx
git commit -m "Add P1B spatial canvas components"
```

## Task 4: Add Command Bar, Inspector, and Shell

**Files:**
- Create: `apps/web/src/spatial/CommandBar.tsx`
- Create: `apps/web/src/spatial/NodeInspector.tsx`
- Create: `apps/web/src/spatial/SpatialAppShell.tsx`
- Modify: `apps/web/test/SpatialAppShell.test.tsx`

- [ ] **Step 1: Add shell interaction tests**

Append to `apps/web/test/SpatialAppShell.test.tsx`:

```tsx
import { SpatialAppShell } from "../src/spatial/SpatialAppShell";

describe("SpatialAppShell", () => {
  it("filters through command search and updates inspector selection", () => {
    const onWorkflowStatusChange = vi.fn();

    render(
      <SpatialAppShell
        listings={demoListings}
        sourceHealth={sourceHealth}
        workflowItems={buildDemoTenantWorkflow(demoListings)}
        savedSearches={savedSearches}
        alertDeliveries={alertDeliveries}
        dataMode="fallback"
        dataMessage="Demo fallback"
        workflowMode="demo"
        workflowMessage="Workflow demo"
        workflowActionMessage=""
        isLoadingListings={false}
        isLoadingWorkflow={false}
        onRefreshListings={vi.fn()}
        onWorkflowStatusChange={onWorkflowStatusChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/Command search/i), {
      target: { value: "herastrau" }
    });

    expect(screen.getByRole("button", { name: /Studio premium Herastrau/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apartament 2 camere Titan/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Studio premium Herastrau/i }));

    const inspector = screen.getByTestId("node-inspector");
    expect(within(inspector).getByText(/Studio premium Herastrau/i)).toBeInTheDocument();
    expect(within(inspector).getByRole("link", { name: /Open source/i })).toHaveAttribute(
      "href",
      "https://example.test/publi24/studio-herastrau"
    );
  });

  it("keeps workflow status actions available from the inspector", () => {
    const onWorkflowStatusChange = vi.fn();

    render(
      <SpatialAppShell
        listings={demoListings}
        sourceHealth={sourceHealth}
        workflowItems={buildDemoTenantWorkflow(demoListings)}
        savedSearches={savedSearches}
        alertDeliveries={alertDeliveries}
        dataMode="fallback"
        dataMessage="Demo fallback"
        workflowMode="demo"
        workflowMessage="Workflow demo"
        workflowActionMessage=""
        isLoadingListings={false}
        isLoadingWorkflow={false}
        onRefreshListings={vi.fn()}
        onWorkflowStatusChange={onWorkflowStatusChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Tenant workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: /Contactat/i }));

    expect(onWorkflowStatusChange).toHaveBeenCalledWith("cl-apt-titan", "contacted");
  });
});
```

- [ ] **Step 2: Run shell tests and verify failure**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- SpatialAppShell.test.tsx
```

Expected result: Vitest fails because `SpatialAppShell`, `CommandBar`, and `NodeInspector` do not exist.

- [ ] **Step 3: Implement command bar**

Create `apps/web/src/spatial/CommandBar.tsx`:

```tsx
interface CommandBarProps {
  commandQuery: string;
  dataMode: "fallback" | "live";
  dataMessage: string;
  listingCount: number;
  isLoadingListings: boolean;
  onCommandQueryChange: (query: string) => void;
  onRefreshListings: () => void;
}

export function CommandBar({
  commandQuery,
  dataMode,
  dataMessage,
  listingCount,
  isLoadingListings,
  onCommandQueryChange,
  onRefreshListings
}: CommandBarProps) {
  return (
    <header className="spatial-command-bar">
      <div className="spatial-brand">
        <span className="brand-orb" aria-hidden="true" />
        <div>
          <strong>Thor Spatial</strong>
          <span>{listingCount} listinguri · {dataMode === "live" ? "live Worker" : "demo fallback"}</span>
        </div>
      </div>
      <label className="command-input">
        <span>Command search</span>
        <input
          value={commandQuery}
          onChange={(event) => onCommandQueryChange(event.target.value)}
          placeholder="Cmd+K cauta, conecteaza, asigneaza"
        />
      </label>
      <div className="command-actions">
        <span>{dataMessage}</span>
        <button type="button" onClick={onRefreshListings} disabled={isLoadingListings}>
          {isLoadingListings ? "Scanning..." : "New scan"}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Implement node inspector**

Create `apps/web/src/spatial/NodeInspector.tsx`:

```tsx
import type { DemoListing } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import type { SpatialAction, SpatialNode } from "./types";

interface NodeInspectorProps {
  node: SpatialNode | undefined;
  listing: DemoListing | undefined;
  workflowItem: TenantWorkflowItem | undefined;
  workflowMode: "demo" | "live";
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingWorkflow: boolean;
  onWorkflowStatusChange: (listingId: string, status: TenantWorkflowStatus) => void;
  onFocusNode: (nodeId: string) => void;
}

export function NodeInspector({
  node,
  listing,
  workflowItem,
  workflowMode,
  workflowMessage,
  workflowActionMessage,
  isLoadingWorkflow,
  onWorkflowStatusChange,
  onFocusNode
}: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="node-inspector" data-testid="node-inspector">
        <h2>Inspector</h2>
        <p>Selecteaza un nod din canvas.</p>
      </aside>
    );
  }

  return (
    <aside className="node-inspector" data-testid="node-inspector">
      <span className="inspector-eyebrow">{node.eyebrow}</span>
      <h2>{node.title}</h2>
      <p>{node.body}</p>
      <dl className="inspector-metrics">
        {node.metrics.map((metric) => (
          <div key={`${node.id}-${metric.label}`}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      {listing ? (
        <section className="inspector-section">
          <h3>Index + link</h3>
          <p>
            {listing.city} · {listing.neighborhood} · {listing.areaSqm} mp · {listing.rooms} camere
          </p>
          <div className="source-links">
            {listing.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                Open source · {source.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}
      {node.kind === "tenant_workflow" || listing ? (
        <section className="inspector-section">
          <h3>Tenant workflow</h3>
          <p>{workflowMode === "live" ? "Workflow live" : "Workflow demo"} · {workflowMessage}</p>
          {workflowItem ? <p>Assignee: {workflowItem.assignee}</p> : null}
          {workflowActionMessage ? <p className="inspector-note">{workflowActionMessage}</p> : null}
          <div className="inspector-actions">
            {node.actions
              .filter((action): action is Extract<SpatialAction, { type: "update_status" }> => action.type === "update_status")
              .map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={isLoadingWorkflow}
                  onClick={() => onWorkflowStatusChange(action.listingId, action.status)}
                >
                  {action.label}
                </button>
              ))}
          </div>
        </section>
      ) : null}
      <div className="inspector-actions">
        {node.actions.map((action) => {
          if (action.type === "open_url") {
            return (
              <a key={action.id} href={action.url} target="_blank" rel="noreferrer">
                {action.label}
              </a>
            );
          }

          if (action.type === "focus_node") {
            return (
              <button key={action.id} type="button" onClick={() => onFocusNode(action.nodeId)}>
                {action.label}
              </button>
            );
          }

          return null;
        })}
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Implement spatial app shell**

Create `apps/web/src/spatial/SpatialAppShell.tsx`:

```tsx
import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import { CanvasMinimap } from "./CanvasMinimap";
import { CanvasToolbox } from "./CanvasToolbox";
import { CommandBar } from "./CommandBar";
import { NodeInspector } from "./NodeInspector";
import { NodeStackMobile } from "./NodeStackMobile";
import { SpatialCanvas } from "./SpatialCanvas";
import "./spatialStyles.css";
import { useSpatialWorkspace } from "./useSpatialWorkspace";

interface SpatialAppShellProps {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
  dataMode: "fallback" | "live";
  dataMessage: string;
  workflowMode: "demo" | "live";
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingListings: boolean;
  isLoadingWorkflow: boolean;
  onRefreshListings: () => void;
  onWorkflowStatusChange: (listingId: string, status: TenantWorkflowStatus) => void;
}

export function SpatialAppShell(props: SpatialAppShellProps) {
  const workspace = useSpatialWorkspace({
    listings: props.listings,
    sourceHealth: props.sourceHealth,
    workflowItems: props.workflowItems,
    savedSearches: props.savedSearches,
    alertDeliveries: props.alertDeliveries
  });

  return (
    <main className="spatial-app-shell">
      <CommandBar
        commandQuery={workspace.commandQuery}
        dataMode={props.dataMode}
        dataMessage={props.dataMessage}
        listingCount={workspace.graph.summary.listingCount}
        isLoadingListings={props.isLoadingListings}
        onCommandQueryChange={workspace.setCommandQuery}
        onRefreshListings={props.onRefreshListings}
      />
      <CanvasToolbox />
      <div className="spatial-workspace">
        <SpatialCanvas
          graph={workspace.graph}
          selectedNodeId={workspace.graph.selectedNodeId}
          onSelectNode={workspace.selectNode}
        />
        <NodeStackMobile
          graph={workspace.graph}
          selectedNodeId={workspace.graph.selectedNodeId}
          onSelectNode={workspace.selectNode}
        />
        <CanvasMinimap graph={workspace.graph} selectedNodeId={workspace.graph.selectedNodeId} />
      </div>
      <NodeInspector
        node={workspace.selectedNode}
        listing={workspace.selectedListing}
        workflowItem={workspace.selectedWorkflowItem}
        workflowMode={props.workflowMode}
        workflowMessage={props.workflowMessage}
        workflowActionMessage={props.workflowActionMessage}
        isLoadingWorkflow={props.isLoadingWorkflow}
        onWorkflowStatusChange={props.onWorkflowStatusChange}
        onFocusNode={workspace.selectNode}
      />
    </main>
  );
}
```

- [ ] **Step 6: Add temporary empty stylesheet**

Create `apps/web/src/spatial/spatialStyles.css`:

```css
.spatial-app-shell {
  min-height: 100vh;
}
```

- [ ] **Step 7: Run shell tests and verify pass**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- SpatialAppShell.test.tsx
```

Expected result: component tests pass.

- [ ] **Step 8: Commit shell components**

Run:

```powershell
git add apps/web/src/spatial/CommandBar.tsx apps/web/src/spatial/NodeInspector.tsx apps/web/src/spatial/SpatialAppShell.tsx apps/web/src/spatial/spatialStyles.css apps/web/test/SpatialAppShell.test.tsx
git commit -m "Add P1B spatial shell"
```

## Task 5: Wire P1B Shell Into App

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/test/App.test.tsx`

- [ ] **Step 1: Replace top-level app assertions**

Modify the first test in `apps/web/test/App.test.tsx` to assert P1B as the primary surface:

```tsx
it("renders the P1B spatial deal canvas as the primary web surface", () => {
  render(<App />);

  expect(screen.getByText(/Thor Spatial/i)).toBeInTheDocument();
  expect(screen.getByTestId("spatial-canvas")).toBeInTheDocument();
  expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
  expect(screen.getByLabelText(/Command search/i)).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /^Search$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /^Listing Detail$/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Replace index + link detail assertion**

Modify the index + link test in `apps/web/test/App.test.tsx`:

```tsx
it("shows demo-safe index plus link source URLs in the spatial inspector", () => {
  render(<App />);

  const inspector = screen.getByTestId("node-inspector");
  expect(within(inspector).getByText("Apartament 2 camere Titan")).toBeInTheDocument();
  expect(within(inspector).getByRole("link", { name: /Open source · imobiliare.ro/i })).toHaveAttribute(
    "href",
    "https://example.test/imobiliare/titan-2-camere"
  );
  expect(within(inspector).getByText(/Index \+ link/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Replace tenant workflow test assertion**

Modify the workflow fallback test in `apps/web/test/App.test.tsx`:

```tsx
it("renders demo tenant workflow inside the spatial inspector without re-hosting portal content", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /Tenant workflow/i }));

  const inspector = screen.getByTestId("node-inspector");
  expect(within(inspector).getByText(/Workflow demo/i)).toBeInTheDocument();
  expect(within(inspector).getByText(/Tenant workflow/i)).toBeInTheDocument();
  expect(within(inspector).getByText(/Assignee:/i)).toBeInTheDocument();
  expect(screen.queryByText(/Text scurt pentru index/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Modify `App.tsx` imports**

In `apps/web/src/App.tsx`, keep the existing data and API imports, then add:

```ts
import { SpatialAppShell } from "./spatial/SpatialAppShell";
```

- [ ] **Step 5: Extract listing refresh function**

Replace the first listing-loading `useEffect` body with a reusable function plus the effect:

```ts
  const loadListings = () => {
    setIsLoadingListings(true);
    fetchWorkerListings({ baseUrl: workerApiBaseUrl })
      .then((apiListings) => {
        if (apiListings.length === 0) {
          setDataMode("fallback");
          setDataMessage("Worker API nu a returnat listinguri; se foloseste demo fallback.");
          setListings(demoListings);
          return;
        }

        setListings(apiListings);
        setDataMode("live");
        setDataMessage("Date live incarcate din Worker API.");
      })
      .catch(() => {
        setDataMode("fallback");
        setDataMessage("Worker API indisponibil; se foloseste demo fallback.");
        setListings(demoListings);
      })
      .finally(() => setIsLoadingListings(false));
  };

  useEffect(() => {
    loadListings();
  }, [workerApiBaseUrl]);
```

If TypeScript reports that `loadListings` must be stable for effects, wrap it in `useCallback` with `[workerApiBaseUrl]` and import `useCallback` from React.

- [ ] **Step 6: Replace classic return markup**

In `apps/web/src/App.tsx`, replace the large classic dashboard JSX returned by `App` with:

```tsx
  return (
    <SpatialAppShell
      listings={filteredListings}
      sourceHealth={sourceHealthCards}
      workflowItems={workflowItems}
      savedSearches={savedSearchItems}
      alertDeliveries={alertDeliveries}
      dataMode={dataMode}
      dataMessage={dataMessage}
      workflowMode={workflowMode}
      workflowMessage={workflowMessage}
      workflowActionMessage={workflowActionMessage}
      isLoadingListings={isLoadingListings}
      isLoadingWorkflow={isLoadingWorkflow}
      onRefreshListings={loadListings}
      onWorkflowStatusChange={handleWorkflowStatusChange}
    />
  );
```

Keep helper functions in `App.tsx` if tests still use Supabase Auth and saved search flows indirectly. Remove JSX-only helpers such as old card renderers only after TypeScript identifies them as unused.

- [ ] **Step 7: Run App tests and capture failures**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- App.test.tsx
```

Expected result: tests that still reference old labels, old forms, or old section test IDs fail. Keep the auth, saved-search API, source-health, and workflow behavior expectations, but rewrite selectors toward P1B shell and inspector output.

- [ ] **Step 8: Update remaining App tests to P1B selectors**

For live listing tests, use this assertion style:

```tsx
expect(await screen.findByRole("button", { name: /Listing live din Worker/i })).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: /Tenant workflow/i }));
expect(within(screen.getByTestId("node-inspector")).getByText(/Workflow live/i)).toBeInTheDocument();
```

For source health tests, use this assertion style:

```tsx
fireEvent.click(await screen.findByRole("button", { name: /Source health/i }));
const inspector = screen.getByTestId("node-inspector");
expect(within(inspector).getByText(/Monitorizare pentru crawl/i)).toBeInTheDocument();
expect(within(inspector).getByText(/Parse/i)).toBeInTheDocument();
```

For saved search tests, use this assertion style:

```tsx
expect(screen.getByRole("button", { name: /Bucuresti apartamente sub 120k/i })).toBeInTheDocument();
fireEvent.change(screen.getByLabelText(/Command search/i), {
  target: { value: "premium" }
});
expect(screen.getByRole("button", { name: /Studio premium Herastrau/i })).toBeInTheDocument();
```

- [ ] **Step 9: Run App tests and verify pass**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- App.test.tsx
```

Expected result: `App.test.tsx` passes against the P1B shell.

- [ ] **Step 10: Commit App wiring**

Run:

```powershell
git add apps/web/src/App.tsx apps/web/test/App.test.tsx
git commit -m "Wire P1B spatial shell into web app"
```

## Task 6: Apply P1B Visual System and Responsive Layout

**Files:**
- Modify: `apps/web/src/spatial/spatialStyles.css`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/test/SpatialAppShell.test.tsx`

- [ ] **Step 1: Add responsive visibility test**

Append to `apps/web/test/SpatialAppShell.test.tsx`:

```tsx
it("renders a mobile node stack in addition to the desktop canvas", () => {
  render(
    <SpatialAppShell
      listings={demoListings}
      sourceHealth={sourceHealth}
      workflowItems={buildDemoTenantWorkflow(demoListings)}
      savedSearches={savedSearches}
      alertDeliveries={alertDeliveries}
      dataMode="fallback"
      dataMessage="Demo fallback"
      workflowMode="demo"
      workflowMessage="Workflow demo"
      workflowActionMessage=""
      isLoadingListings={false}
      isLoadingWorkflow={false}
      onRefreshListings={vi.fn()}
      onWorkflowStatusChange={vi.fn()}
    />
  );

  expect(screen.getByLabelText(/Spatial nodes mobile/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Canvas minimap/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run style-adjacent component tests**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- SpatialAppShell.test.tsx
```

Expected result: tests pass before styling changes.

- [ ] **Step 3: Replace temporary spatial CSS**

Replace `apps/web/src/spatial/spatialStyles.css` with:

```css
:root {
  --spatial-bg: #eef2ff;
  --spatial-surface: rgba(255, 255, 255, 0.86);
  --spatial-text: #07111f;
  --spatial-muted: #64748b;
  --spatial-border: #dbe5f1;
  --spatial-violet: #8b5cf6;
  --spatial-cyan: #06b6d4;
  --spatial-emerald: #047857;
  --spatial-warning: #b45309;
  --spatial-danger: #b91c1c;
  --spatial-shadow: 0 24px 70px rgba(31, 41, 55, 0.16);
}

.spatial-app-shell {
  min-height: 100vh;
  color: var(--spatial-text);
  background:
    radial-gradient(circle at top left, rgba(139, 92, 246, 0.24), transparent 32rem),
    radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.2), transparent 30rem),
    linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #ffffff 100%);
  overflow: hidden;
  position: relative;
}

.spatial-app-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(100, 116, 139, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 116, 139, 0.12) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.28));
  pointer-events: none;
}

.spatial-command-bar {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 260px minmax(280px, 1fr) 320px;
  gap: 1rem;
  align-items: center;
  padding: 1.1rem 1.25rem;
}

.spatial-brand,
.command-input,
.command-actions,
.node-inspector,
.canvas-toolbox,
.canvas-minimap {
  background: var(--spatial-surface);
  border: 1px solid rgba(219, 229, 241, 0.86);
  box-shadow: 0 16px 44px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(20px);
}

.spatial-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border-radius: 1.2rem;
  padding: 0.85rem 1rem;
}

.brand-orb {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--spatial-violet), var(--spatial-cyan));
  box-shadow: 0 0 32px rgba(139, 92, 246, 0.45);
}

.spatial-brand strong,
.canvas-node strong,
.mobile-node strong {
  display: block;
}

.spatial-brand span,
.node-subtitle,
.node-body,
.command-actions,
.mobile-node small,
.inspector-eyebrow {
  color: var(--spatial-muted);
}

.command-input {
  display: grid;
  gap: 0.35rem;
  border-radius: 1.35rem;
  padding: 0.75rem 1rem;
}

.command-input span {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--spatial-violet);
}

.command-input input {
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--spatial-text);
  font: inherit;
  font-size: 1.05rem;
}

.command-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  border-radius: 1.2rem;
  padding: 0.75rem 0.9rem;
}

.command-actions button,
.inspector-actions button,
.inspector-actions a,
.canvas-toolbox button {
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--spatial-violet), #6366f1);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: 0.7rem 0.95rem;
  text-decoration: none;
}

.command-actions button:disabled,
.inspector-actions button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.canvas-toolbox {
  position: absolute;
  z-index: 4;
  left: 1.25rem;
  top: 7.2rem;
  display: grid;
  gap: 0.55rem;
  border-radius: 1.35rem;
  padding: 0.7rem;
}

.canvas-toolbox button {
  background: #ffffff;
  color: var(--spatial-muted);
  border: 1px solid var(--spatial-border);
}

.canvas-toolbox button.is-active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--spatial-violet), var(--spatial-cyan));
}

.spatial-workspace {
  position: relative;
  z-index: 2;
  min-height: calc(100vh - 6rem);
  padding-left: 5.4rem;
  padding-right: 24rem;
}

.spatial-canvas {
  position: relative;
  height: calc(100vh - 6.2rem);
  min-height: 760px;
}

.canvas-edges,
.canvas-node-layer {
  position: absolute;
  inset: 0;
}

.canvas-edge line {
  stroke-width: 2;
  stroke: rgba(99, 102, 241, 0.28);
}

.canvas-edge text {
  fill: var(--spatial-muted);
  font-size: 12px;
  font-weight: 800;
}

.edge-source line {
  stroke: rgba(6, 182, 212, 0.42);
}

.edge-workflow line {
  stroke: rgba(139, 92, 246, 0.46);
}

.edge-health line {
  stroke: rgba(4, 120, 87, 0.38);
}

.canvas-node {
  position: absolute;
  display: grid;
  gap: 0.65rem;
  min-height: 150px;
  text-align: left;
  border: 1px solid rgba(219, 229, 241, 0.95);
  border-radius: 1.5rem;
  padding: 1rem;
  color: var(--spatial-text);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--spatial-shadow);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.canvas-node:hover,
.canvas-node:focus-visible,
.canvas-node.is-selected {
  transform: translateY(-3px);
  border-color: rgba(139, 92, 246, 0.75);
  box-shadow: 0 28px 90px rgba(99, 102, 241, 0.25), 0 0 0 5px rgba(139, 92, 246, 0.13);
  outline: 0;
}

.node-eyebrow {
  color: var(--spatial-violet);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.node-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.node-metric {
  border: 1px solid var(--spatial-border);
  border-radius: 0.9rem;
  padding: 0.5rem;
  background: #f8fafc;
}

.node-metric span {
  display: block;
  color: var(--spatial-muted);
  font-size: 0.72rem;
}

.metric-good b {
  color: var(--spatial-emerald);
}

.metric-warning b {
  color: var(--spatial-warning);
}

.metric-danger b {
  color: var(--spatial-danger);
}

.node-inspector {
  position: absolute;
  z-index: 6;
  right: 1.25rem;
  top: 7.2rem;
  bottom: 1.25rem;
  width: 21.5rem;
  border-radius: 1.5rem;
  padding: 1rem;
  overflow: auto;
}

.node-inspector h2,
.node-inspector h3 {
  margin-bottom: 0.55rem;
}

.inspector-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin: 1rem 0;
}

.inspector-metrics div,
.inspector-section {
  border: 1px solid var(--spatial-border);
  border-radius: 1rem;
  padding: 0.75rem;
  background: rgba(248, 250, 252, 0.84);
}

.inspector-metrics dt {
  color: var(--spatial-muted);
  font-size: 0.72rem;
}

.inspector-metrics dd {
  margin: 0.2rem 0 0;
  font-weight: 900;
}

.inspector-section {
  margin-top: 0.8rem;
}

.source-links,
.inspector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.inspector-note {
  color: var(--spatial-violet);
  font-weight: 800;
}

.canvas-minimap {
  position: absolute;
  z-index: 4;
  left: 6rem;
  bottom: 1.25rem;
  width: 11rem;
  border-radius: 1rem;
  padding: 0.7rem;
}

.canvas-minimap span {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--spatial-muted);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.canvas-minimap svg {
  width: 100%;
  height: auto;
}

.canvas-minimap rect {
  fill: rgba(100, 116, 139, 0.34);
}

.canvas-minimap rect.is-selected {
  fill: var(--spatial-violet);
}

.node-stack-mobile {
  display: none;
}

@media (max-width: 980px) {
  .spatial-app-shell {
    overflow: visible;
  }

  .spatial-command-bar {
    grid-template-columns: 1fr;
  }

  .canvas-toolbox,
  .canvas-minimap,
  .spatial-canvas {
    display: none;
  }

  .spatial-workspace {
    min-height: 0;
    padding: 0 1rem 24rem;
  }

  .node-stack-mobile {
    display: grid;
    gap: 0.8rem;
  }

  .mobile-node {
    display: grid;
    gap: 0.3rem;
    text-align: left;
    border: 1px solid var(--spatial-border);
    border-radius: 1.1rem;
    padding: 0.9rem;
    background: rgba(255, 255, 255, 0.9);
  }

  .mobile-node.is-selected {
    border-color: var(--spatial-violet);
  }

  .node-inspector {
    position: relative;
    inset: auto;
    width: auto;
    margin: 1rem;
  }
}
```

- [ ] **Step 4: Trim global styles that conflict with full-screen shell**

In `apps/web/src/styles.css`, keep the global reset and base font rules, but remove layout rules that force the old dashboard width, old `.app-shell`, old `.hero`, old `.panel`, old `.results-grid`, and old `.health-grid` visual system when they are unused. Keep safe global rules:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #eef2ff;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

- [ ] **Step 5: Run visual system tests**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web -- SpatialAppShell.test.tsx
```

Expected result: tests pass.

- [ ] **Step 6: Commit visual system**

Run:

```powershell
git add apps/web/src/spatial/spatialStyles.css apps/web/src/styles.css apps/web/test/SpatialAppShell.test.tsx
git commit -m "Apply P1B spatial visual system"
```

## Task 7: Full Web Validation and Cleanup

**Files:**
- Modify as needed from TypeScript/compiler feedback:
  - `apps/web/src/App.tsx`
  - `apps/web/src/spatial/*.tsx`
  - `apps/web/src/spatial/*.ts`
  - `apps/web/test/*.tsx`
  - `apps/web/test/*.ts`

- [ ] **Step 1: Run all web tests**

Run:

```powershell
npm.cmd run test --workspace @thor-crm/web
```

Expected result: all `@thor-crm/web` tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm.cmd run typecheck --workspace @thor-crm/web
```

Expected result: TypeScript reports no errors.

- [ ] **Step 3: Run web build**

Run:

```powershell
npm.cmd run build --workspace @thor-crm/web
```

Expected result: Vite builds the web app successfully.

- [ ] **Step 4: Run root validation**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Expected result: repository-level test, typecheck, and build all pass.

- [ ] **Step 5: Inspect final diff**

Run:

```powershell
git diff --stat
git diff -- apps/web/src/App.tsx apps/web/src/spatial apps/web/test/App.test.tsx apps/web/test/SpatialAppShell.test.tsx apps/web/test/spatialGraph.test.ts
```

Expected result:

- old classic dashboard return markup is gone from `App.tsx`;
- `SpatialAppShell` is now the first web surface;
- no frontend service role key references exist;
- portal content is still shown as index + link only;
- tests assert P1B behavior.

- [ ] **Step 6: Commit final cleanup**

If there are validation fixes after previous commits, run:

```powershell
git add apps/web/src apps/web/test
git commit -m "Stabilize P1B spatial canvas"
```

If there are no remaining changes, skip the commit command and continue to Task 8.

## Task 8: Browser Smoke Test and GitHub Handoff

**Files:**
- No source changes expected unless browser smoke exposes a bug.

- [ ] **Step 1: Start local dev server**

Run:

```powershell
npm.cmd run dev --workspace @thor-crm/web -- --host 127.0.0.1
```

Expected result: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 2: Smoke test in Browser plugin**

Open the local Vite URL and verify:

- top bar says `Thor Spatial`;
- command search is visible;
- desktop canvas is visible;
- at least five node kinds appear;
- selecting `Tenant workflow` changes the inspector;
- `Open source` link exists and points to an external source URL;
- no console error appears during initial render.

- [ ] **Step 3: Stop local dev server**

Stop the Vite process with `Ctrl+C` in the terminal that runs it.

- [ ] **Step 4: Push branch and open GitHub review**

If implementing through a feature branch, run:

```powershell
git status -sb
git push -u origin $(git branch --show-current)
gh pr create --draft --fill
```

Expected result: a draft PR exists for review. If the implementation is intentionally committed on `master`, push only after all checks pass:

```powershell
git push origin master
```

## Self-Review

### Spec coverage

- Full-screen spatial surface: Tasks 3, 4, and 6.
- Command bar: Task 4.
- Deterministic nodes and visual edges: Tasks 1 and 3.
- Node types for listing, source cluster, workflow, saved search, source health, price history, and alert delivery: Task 1.
- Inspector contextual details: Task 4.
- Command search: Task 2 and Task 4.
- Workflow status actions: Task 4 and Task 5.
- Open source link and index + link principle: Task 1, Task 4, and Task 5.
- Responsive mobile stack: Task 3 and Task 6.
- Existing live/fallback data flow: Task 5.
- Tests, typecheck, build, and browser smoke: Task 7 and Task 8.

### Red-flag scan

The plan uses exact file paths, commands, expected results, and concrete code for each new module. It avoids vague implementation instructions and keeps backend, crawling, Supabase schema, and Cloudflare deployment outside this UI refactor.

### Type consistency

- `SpatialAction`, `SpatialNode`, `SpatialEdge`, and `SpatialGraphModel` are defined before use.
- `TenantWorkflowStatus` comes from `apps/web/src/lib/tenantWorkflowApi.ts` and is reused for inspector actions.
- `DemoListing`, `SourceHealth`, `SavedSearch`, and `AlertDelivery` come from `apps/web/src/data/demoData.ts`.
- `SpatialAppShell` receives existing `App.tsx` state directly and does not introduce a new backend contract.

