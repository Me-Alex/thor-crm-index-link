import type { SavedSearch } from "../data/demoData";
import { ListingsApiError, resolveWorkerApiBaseUrl } from "./listingsApi";
import { demoOrgId } from "./tenantWorkflowApi";

type WorkerAlertFrequency = "near_real_time" | "hourly" | "daily";
type WorkerAlertChannel = "in_app" | "email" | "webhook";

interface WorkerSavedSearchResponse {
  data: WorkerSavedSearch[];
  count: number;
}

interface WorkerSavedSearchMutationResponse {
  data: WorkerSavedSearch;
}

interface WorkerSavedSearch {
  id: string;
  name: string;
  criteria: Record<string, unknown>;
  alerts: Array<{
    channel: WorkerAlertChannel;
    frequency: WorkerAlertFrequency;
    isEnabled: boolean;
  }>;
}

interface SavedSearchApiOptions {
  baseUrl?: string;
  orgId?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

export interface SavedSearchMutationOptions extends SavedSearchApiOptions {
  name: string;
  criteria: string;
  frequency: SavedSearch["frequency"];
  alertChannel: SavedSearch["alertChannel"];
  alertsEnabled: boolean;
}

export interface UpdateSavedSearchOptions extends SavedSearchMutationOptions {
  searchId: string;
}

export interface DeleteSavedSearchOptions extends SavedSearchApiOptions {
  searchId: string;
}

export async function fetchTenantSavedSearches(options: SavedSearchApiOptions = {}): Promise<SavedSearch[]> {
  const payload = await fetchSavedSearchJson(collectionPath(options.orgId), {
    ...options,
    method: "GET"
  });
  if (!isWorkerSavedSearchResponse(payload)) {
    throw new ListingsApiError("Worker saved searches API returned an invalid payload");
  }

  return payload.data.map(toSavedSearch);
}

export async function createTenantSavedSearch(options: SavedSearchMutationOptions): Promise<SavedSearch> {
  const payload = await fetchSavedSearchJson(collectionPath(options.orgId), {
    ...options,
    method: "POST",
    body: savedSearchRequestBody(options)
  });
  if (!isWorkerSavedSearchMutationResponse(payload)) {
    throw new ListingsApiError("Worker saved searches API returned an invalid create payload");
  }

  return toSavedSearch(payload.data);
}

export async function updateTenantSavedSearch(options: UpdateSavedSearchOptions): Promise<SavedSearch> {
  const payload = await fetchSavedSearchJson(itemPath(options.orgId, options.searchId), {
    ...options,
    method: "PATCH",
    body: savedSearchRequestBody(options)
  });
  if (!isWorkerSavedSearchMutationResponse(payload)) {
    throw new ListingsApiError("Worker saved searches API returned an invalid update payload");
  }

  return toSavedSearch(payload.data);
}

export async function deleteTenantSavedSearch(options: DeleteSavedSearchOptions): Promise<void> {
  await fetchSavedSearchJson(itemPath(options.orgId, options.searchId), {
    ...options,
    method: "DELETE"
  });
}

async function fetchSavedSearchJson(
  path: string,
  options: SavedSearchApiOptions & { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: string }
): Promise<unknown> {
  const baseUrl = resolveWorkerApiBaseUrl(options.baseUrl);
  if (!baseUrl) {
    throw new ListingsApiError("VITE_WORKER_API_URL is not configured");
  }
  if (!options.accessToken) {
    throw new ListingsApiError("Supabase user access token is not available");
  }

  const response = await (options.fetchImpl ?? fetch)(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${options.accessToken}`,
      ...(options.body ? { "content-type": "application/json" } : {})
    },
    ...(options.body ? { body: options.body } : {})
  });

  if (!response.ok) {
    throw new ListingsApiError(`Worker saved searches API returned ${response.status}`);
  }

  return response.json();
}

function savedSearchRequestBody(options: SavedSearchMutationOptions): string {
  return JSON.stringify({
    name: options.name,
    criteria: { query: options.criteria },
    alert: {
      channel: options.alertChannel,
      frequency: toWorkerFrequency(options.frequency),
      thresholdMinutes: 5,
      isEnabled: options.alertsEnabled
    }
  });
}

function collectionPath(orgId = demoOrgId): string {
  return `/api/orgs/${encodeURIComponent(orgId)}/saved-searches`;
}

function itemPath(orgId = demoOrgId, searchId: string): string {
  return `${collectionPath(orgId)}/${encodeURIComponent(searchId)}`;
}

function toSavedSearch(search: WorkerSavedSearch): SavedSearch {
  return {
    id: search.id,
    name: search.name,
    criteria: criteriaSummary(search.criteria),
    matches: 0,
    frequency: fromWorkerFrequency(search.alerts[0]?.frequency ?? "daily"),
    alertChannel: search.alerts[0]?.channel ?? "in_app",
    alertsEnabled: search.alerts[0]?.isEnabled ?? false
  };
}

function criteriaSummary(criteria: Record<string, unknown>): string {
  return typeof criteria.query === "string" ? criteria.query : JSON.stringify(criteria);
}

function toWorkerFrequency(frequency: SavedSearch["frequency"]): WorkerAlertFrequency {
  return frequency === "near real-time" ? "near_real_time" : frequency;
}

function fromWorkerFrequency(frequency: WorkerAlertFrequency): SavedSearch["frequency"] {
  return frequency === "near_real_time" ? "near real-time" : frequency;
}

function isWorkerSavedSearchResponse(payload: unknown): payload is WorkerSavedSearchResponse {
  return isRecord(payload) && Array.isArray(payload.data) && payload.data.every(isWorkerSavedSearch) && typeof payload.count === "number";
}

function isWorkerSavedSearchMutationResponse(payload: unknown): payload is WorkerSavedSearchMutationResponse {
  return isRecord(payload) && isWorkerSavedSearch(payload.data);
}

function isWorkerSavedSearch(value: unknown): value is WorkerSavedSearch {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isRecord(value.criteria) &&
    Array.isArray(value.alerts) &&
    value.alerts.every(isWorkerSavedSearchAlert)
  );
}

function isWorkerSavedSearchAlert(value: unknown): value is WorkerSavedSearch["alerts"][number] {
  return isRecord(value) && isWorkerAlertChannel(value.channel) && isWorkerAlertFrequency(value.frequency) && typeof value.isEnabled === "boolean";
}

function isWorkerAlertFrequency(value: unknown): value is WorkerAlertFrequency {
  return value === "near_real_time" || value === "hourly" || value === "daily";
}

function isWorkerAlertChannel(value: unknown): value is WorkerAlertChannel {
  return value === "in_app" || value === "email" || value === "webhook";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
