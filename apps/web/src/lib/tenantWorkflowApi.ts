import type { DemoListing, ListingStatus } from "../data/demoData";
import { ListingsApiError, resolveWorkerApiBaseUrl } from "./listingsApi";

export const demoOrgId = "11111111-1111-4111-8111-111111111111";
export const demoTenantId = demoOrgId;
export const tenantWorkflowAccessTokenStorageKey = "thor_crm_supabase_access_token";

export type TenantWorkflowStatus = "new" | "in_progress" | "contacted" | "ignored" | "archived";

export interface TenantWorkflowTag {
  id: string;
  name: string;
  color: string;
}

export interface TenantWorkflowNote {
  id: string;
  body: string;
  authorUserId: string;
  createdAt: string;
}

export interface TenantWorkflowItem {
  id: string;
  orgId: string;
  tenantId: string;
  listingId: string;
  title: string;
  status: TenantWorkflowStatus;
  assignee: string;
  sourceName: string;
  sourceUrl: string;
  updatedAt: string;
  tags: TenantWorkflowTag[];
  notes: TenantWorkflowNote[];
}

export interface FetchTenantWorkflowOptions {
  baseUrl?: string;
  orgId?: string;
  listings?: DemoListing[];
  accessToken?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface UpdateTenantWorkflowStatusOptions extends FetchTenantWorkflowOptions {
  listingId: string;
  status: TenantWorkflowStatus;
}

export interface CreateTenantWorkflowNoteOptions extends FetchTenantWorkflowOptions {
  listingId: string;
  body: string;
}

interface TenantListingWorkflowResponse {
  data: {
    state: {
      status: TenantWorkflowStatus;
      assigneeUserId: string | null;
      lastSeenByOrgAt: string | null;
      updatedAt: string | null;
    };
    tags: Array<{
      id: string;
      name: string;
      color: string;
    }>;
    notes: Array<{
      id: string;
      body: string;
      authorUserId: string;
      createdAt: string;
    }>;
  };
}

interface TenantListingNoteResponse {
  data: TenantWorkflowNote;
}

const DEFAULT_TIMEOUT_MS = 5000;

export function buildDemoTenantWorkflow(
  listings: DemoListing[],
  tenantId = demoTenantId
): TenantWorkflowItem[] {
  return listings.map((listing) => {
    const primarySource = listing.sources[0];
    const latestHistoryPoint = listing.history[listing.history.length - 1];

    return {
      id: `workflow-${listing.id}`,
      orgId: tenantId,
      tenantId,
      listingId: listing.id,
      title: listing.title,
      status: workflowStatusFromListing(listing.status),
      assignee: listing.assignee,
      sourceName: primarySource?.name ?? "Sursa originala",
      sourceUrl: primarySource?.url ?? "#",
      updatedAt: latestHistoryPoint?.date ?? "demo",
      tags: listing.tags.map((tag, index) => ({
        id: `demo-tag-${listing.id}-${index}`,
        name: tag,
        color: "#64748b"
      })),
      notes: []
    };
  });
}

export async function fetchTenantWorkflow(
  options: FetchTenantWorkflowOptions = {}
): Promise<TenantWorkflowItem[]> {
  const orgId = options.orgId ?? demoOrgId;
  const listings = options.listings ?? [];
  const accessToken = options.accessToken;
  if (!accessToken) {
    throw new ListingsApiError("Supabase user access token is not available");
  }

  const workflowItems = await Promise.all(
    listings.map(async (listing) => {
      const payload = await fetchTenantWorkflowJson(
        `/api/orgs/${encodeURIComponent(orgId)}/listings/${encodeURIComponent(listing.id)}/workflow`,
        {
          ...options,
          accessToken
        }
      );

      if (!isTenantListingWorkflowResponse(payload)) {
        throw new ListingsApiError("Worker tenant workflow API returned an invalid workflow payload");
      }

      return toTenantWorkflowItem(listing, orgId, payload);
    })
  );

  return workflowItems;
}

export async function updateTenantWorkflowStatus(
  options: UpdateTenantWorkflowStatusOptions
): Promise<Record<string, unknown>> {
  const orgId = options.orgId ?? demoOrgId;
  if (!options.accessToken) {
    throw new ListingsApiError("Supabase user access token is not available");
  }

  const payload = await fetchTenantWorkflowJson(`/api/orgs/${encodeURIComponent(orgId)}/listings/${encodeURIComponent(options.listingId)}/state`, {
    ...options,
    accessToken: options.accessToken,
    method: "PATCH",
    body: JSON.stringify({ status: options.status })
  });

  if (!isRecord(payload)) {
    throw new ListingsApiError("Worker tenant workflow API returned an invalid update payload");
  }

  return payload;
}

export async function createTenantWorkflowNote(
  options: CreateTenantWorkflowNoteOptions
): Promise<TenantWorkflowNote> {
  const orgId = options.orgId ?? demoOrgId;
  if (!options.accessToken) {
    throw new ListingsApiError("Supabase user access token is not available");
  }

  const payload = await fetchTenantWorkflowJson(
    `/api/orgs/${encodeURIComponent(orgId)}/listings/${encodeURIComponent(options.listingId)}/notes`,
    {
      ...options,
      accessToken: options.accessToken,
      method: "POST",
      body: JSON.stringify({ body: options.body })
    }
  );

  if (!isTenantListingNoteResponse(payload)) {
    throw new ListingsApiError("Worker tenant workflow API returned an invalid note payload");
  }

  return payload.data;
}

export function resolveTenantWorkflowAccessToken(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.sessionStorage.getItem(tenantWorkflowAccessTokenStorageKey)?.trim() || undefined;
}

function workflowStatusFromListing(status: ListingStatus): TenantWorkflowStatus {
  if (status === "In lucru") {
    return "in_progress";
  }

  if (status === "Contactat") {
    return "contacted";
  }

  if (status === "Ignorat") {
    return "ignored";
  }

  return "new";
}

async function fetchTenantWorkflowJson(
  path: string,
  options: FetchTenantWorkflowOptions & { method?: "GET" | "POST" | "PATCH"; body?: string; accessToken: string }
): Promise<unknown> {
  const baseUrl = resolveWorkerApiBaseUrl(options.baseUrl);
  if (!baseUrl) {
    throw new ListingsApiError("VITE_WORKER_API_URL is not configured");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${options.accessToken}`,
        ...(options.body ? { "content-type": "application/json" } : {})
      },
      ...(options.body ? { body: options.body } : {}),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ListingsApiError(`Worker tenant workflow API returned ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ListingsApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ListingsApiError("Worker tenant workflow API request timed out");
    }

    throw new ListingsApiError("Worker tenant workflow API request failed");
  } finally {
    clearTimeout(timeout);
  }
}

function toTenantWorkflowItem(
  listing: DemoListing,
  orgId: string,
  payload: TenantListingWorkflowResponse
): TenantWorkflowItem {
  const primarySource = listing.sources[0];
  return (
    {
      id: `workflow-${listing.id}`,
      orgId,
      tenantId: orgId,
      listingId: listing.id,
      title: listing.title,
      status: payload.data.state.status,
      assignee: payload.data.state.assigneeUserId ?? listing.assignee,
      sourceName: primarySource?.name ?? "Sursa originala",
      sourceUrl: primarySource?.url ?? "#",
      updatedAt: payload.data.state.updatedAt ?? payload.data.state.lastSeenByOrgAt ?? "live",
      tags: payload.data.tags,
      notes: payload.data.notes
    }
  );
}

function isTenantListingWorkflowResponse(payload: unknown): payload is TenantListingWorkflowResponse {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.state)) {
    return false;
  }

  const state = payload.data.state;
  return (
    isTenantWorkflowStatus(state.status) &&
    (state.assigneeUserId === null || typeof state.assigneeUserId === "string") &&
    (state.lastSeenByOrgAt === null || typeof state.lastSeenByOrgAt === "string") &&
    (state.updatedAt === null || typeof state.updatedAt === "string") &&
    Array.isArray(payload.data.tags) &&
    payload.data.tags.every(isTenantWorkflowTag) &&
    Array.isArray(payload.data.notes) &&
    payload.data.notes.every(isTenantWorkflowNote)
  );
}

function isTenantListingNoteResponse(payload: unknown): payload is TenantListingNoteResponse {
  return isRecord(payload) && isTenantWorkflowNote(payload.data);
}

function isTenantWorkflowTag(value: unknown): value is TenantWorkflowTag {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.color === "string"
  );
}

function isTenantWorkflowNote(value: unknown): value is TenantWorkflowNote {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.body === "string" &&
    typeof value.authorUserId === "string" &&
    typeof value.createdAt === "string"
  );
}

function isTenantWorkflowStatus(status: unknown): status is TenantWorkflowStatus {
  return (
    status === "new" ||
    status === "in_progress" ||
    status === "contacted" ||
    status === "ignored" ||
    status === "archived"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
