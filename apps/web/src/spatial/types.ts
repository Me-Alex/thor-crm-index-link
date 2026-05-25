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
  | { id: string; label: string; type: "focus_node"; nodeId: string }
  | { id: string; label: string; type: "add_note"; listingId: string };

export interface SpatialSourceHealthDetail {
  id: string;
  name: string;
  mode: string;
  listingCount?: number;
  latestSeenAt?: string;
  crawlSuccessRate: number;
  parseSuccessRate: number;
  fieldCoverageRate: number;
  matchRate: number;
  timeToIndexMinutes: number;
}

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
  noteCount?: number;
  sourceHealthDetails?: SpatialSourceHealthDetail[];
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
