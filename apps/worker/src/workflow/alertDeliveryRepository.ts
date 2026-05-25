import type { Env } from "../runtime/env";
import { planAlertDeliveries } from "./alerts";
import type { ExistingAlertDelivery, SavedSearch, SavedSearchCriteria, WorkflowListing } from "./types";
import type { PropertyType, TransactionType } from "../ingest/types";

export interface AlertDeliveryRepositoryOptions {
  fetch?: typeof fetch;
}

interface CanonicalListingRow {
  id: string;
  title: string;
  description_excerpt: string | null;
  property_type: PropertyType;
  transaction_type: TransactionType;
  price_eur: number | string | null;
  area_sqm: number | string | null;
  rooms: number | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
}

interface AlertRow {
  id: string;
  org_id: string;
  saved_search_id: string;
  channel: "in_app" | "email" | "webhook";
  is_enabled: boolean;
}

interface SavedSearchRow {
  id: string;
  org_id: string;
  name: string;
  criteria: SavedSearchCriteria | null;
}

interface AlertDeliveryRow {
  org_id: string;
  alert_id: string;
  canonical_listing_id: string | null;
}

const canonicalListingSelect = [
  "id",
  "title",
  "description_excerpt",
  "property_type",
  "transaction_type",
  "price_eur",
  "area_sqm",
  "rooms",
  "city",
  "district",
  "neighborhood"
].join(",");

export async function planAndPersistAlertDeliveriesForListing(
  env: Env,
  canonicalListingId: string,
  evaluatedAt: string,
  options: AlertDeliveryRepositoryOptions = {}
): Promise<number> {
  assertAlertRepositoryConfig(env);

  const listing = await loadWorkflowListing(env, canonicalListingId, options);
  if (!listing) {
    return 0;
  }

  return planAndPersistAlertDeliveriesForWorkflowListing(env, listing, evaluatedAt, options);
}

export async function planAndPersistAlertDeliveriesForWorkflowListing(
  env: Env,
  listing: WorkflowListing,
  evaluatedAt: string,
  options: AlertDeliveryRepositoryOptions = {}
): Promise<number> {
  assertAlertRepositoryConfig(env);

  const alerts = await loadEnabledInAppAlerts(env, options);
  if (alerts.length === 0) {
    return 0;
  }

  const savedSearches = await loadSavedSearches(env, alerts, options);
  if (savedSearches.length === 0) {
    return 0;
  }

  const existingDeliveries = await loadExistingDeliveries(env, listing.canonicalListingId, alerts, options);
  const alertByTenantAndSearch = new Map(alerts.map((alert) => [`${alert.org_id}:${alert.saved_search_id}`, alert]));
  const tenantIds = [...new Set(alerts.map((alert) => alert.org_id))];
  const writes = tenantIds.flatMap((tenantId) =>
    planAlertDeliveries({
      tenantId,
      changedListings: [listing],
      savedSearches,
      existingDeliveries,
      evaluatedAt
    }).map((candidate) => {
      const alert = alertByTenantAndSearch.get(`${candidate.tenantId}:${candidate.savedSearchId}`);
      if (!alert) {
        throw new Error("alert_delivery_missing_alert_mapping");
      }

      return {
        org_id: candidate.tenantId,
        alert_id: alert.id,
        canonical_listing_id: candidate.canonicalListingId,
        status: "pending",
        payload: {
          delivery_key: candidate.deliveryKey,
          evaluated_at: candidate.evaluatedAt,
          matched_reasons: candidate.matchedReasons
        }
      };
    })
  );

  if (writes.length === 0) {
    return 0;
  }

  await insertAlertDeliveries(env, writes, options);
  return writes.length;
}

async function loadWorkflowListing(
  env: Env,
  canonicalListingId: string,
  options: AlertDeliveryRepositoryOptions
): Promise<WorkflowListing | undefined> {
  const url = supabaseRestUrl(env, "canonical_listings");
  url.searchParams.set("select", canonicalListingSelect);
  url.searchParams.set("id", `eq.${canonicalListingId}`);
  url.searchParams.set("limit", "1");

  const rows = await supabaseJson<CanonicalListingRow[]>(env, url, { method: "GET" }, options);
  const row = rows[0];
  return row ? rowToWorkflowListing(row) : undefined;
}

async function loadEnabledInAppAlerts(env: Env, options: AlertDeliveryRepositoryOptions): Promise<AlertRow[]> {
  const url = supabaseRestUrl(env, "alerts");
  url.searchParams.set("select", "id,org_id,saved_search_id,channel,is_enabled");
  url.searchParams.set("is_enabled", "eq.true");
  url.searchParams.set("channel", "eq.in_app");

  return supabaseJson<AlertRow[]>(env, url, { method: "GET" }, options);
}

async function loadSavedSearches(
  env: Env,
  alerts: AlertRow[],
  options: AlertDeliveryRepositoryOptions
): Promise<SavedSearch[]> {
  const savedSearchIds = [...new Set(alerts.map((alert) => alert.saved_search_id))];
  if (savedSearchIds.length === 0) {
    return [];
  }

  const url = supabaseRestUrl(env, "saved_searches");
  url.searchParams.set("select", "id,org_id,name,criteria");
  url.searchParams.set("id", `in.(${savedSearchIds.join(",")})`);

  const rows = await supabaseJson<SavedSearchRow[]>(env, url, { method: "GET" }, options);
  return rows.map((row) => ({
    savedSearchId: row.id,
    tenantId: row.org_id,
    name: row.name,
    alertsEnabled: true,
    criteria: row.criteria ?? {}
  }));
}

async function loadExistingDeliveries(
  env: Env,
  canonicalListingId: string,
  alerts: AlertRow[],
  options: AlertDeliveryRepositoryOptions
): Promise<ExistingAlertDelivery[]> {
  const alertById = new Map(alerts.map((alert) => [alert.id, alert]));
  const url = supabaseRestUrl(env, "alert_deliveries");
  url.searchParams.set("select", "org_id,alert_id,canonical_listing_id");
  url.searchParams.set("canonical_listing_id", `eq.${canonicalListingId}`);

  const rows = await supabaseJson<AlertDeliveryRow[]>(env, url, { method: "GET" }, options);
  return rows.flatMap((row) => {
    const alert = alertById.get(row.alert_id);
    if (!alert || !row.canonical_listing_id) {
      return [];
    }

    return [
      {
        tenantId: row.org_id,
        savedSearchId: alert.saved_search_id,
        canonicalListingId: row.canonical_listing_id
      }
    ];
  });
}

async function insertAlertDeliveries(
  env: Env,
  writes: Array<Record<string, unknown>>,
  options: AlertDeliveryRepositoryOptions
): Promise<void> {
  const url = supabaseRestUrl(env, "alert_deliveries");
  await supabaseJson(
    env,
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal"
      },
      body: JSON.stringify(writes)
    },
    options
  );
}

async function supabaseJson<T>(
  env: Env,
  url: URL,
  init: RequestInit,
  options: AlertDeliveryRepositoryOptions
): Promise<T> {
  const fetcher = options.fetch ?? fetch;
  const headers = new Headers(init.headers);
  headers.set("apikey", env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set("authorization", `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetcher(url.toString(), {
    ...init,
    headers
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`alert_delivery_repository_request_failed:${response.status}:${body}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function rowToWorkflowListing(row: CanonicalListingRow): WorkflowListing {
  const priceEur = numberValue(row.price_eur);
  const areaSqm = numberValue(row.area_sqm);
  const listing: WorkflowListing = {
    canonicalListingId: row.id,
    title: row.title,
    propertyType: propertyTypeValue(row.property_type),
    transactionType: transactionTypeValue(row.transaction_type),
    searchText: [row.title, row.description_excerpt, row.city, row.district, row.neighborhood].filter(Boolean).join(" ")
  };

  if (priceEur !== undefined) listing.priceEur = priceEur;
  if (areaSqm !== undefined) listing.areaSqm = areaSqm;
  if (row.rooms !== null) listing.rooms = row.rooms;
  if (row.city) listing.city = row.city;
  if (row.district) listing.district = row.district;
  if (row.neighborhood) listing.neighborhood = row.neighborhood;

  return listing;
}

function numberValue(value: number | string | null): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function propertyTypeValue(value: string): PropertyType {
  return value === "apartment" || value === "house" || value === "land" || value === "commercial" || value === "other"
    ? value
    : "other";
}

function transactionTypeValue(value: string): TransactionType {
  return value === "rent" ? "rent" : "sale";
}

function supabaseRestUrl(env: Env, table: string): URL {
  return new URL(`/rest/v1/${table}`, env.SUPABASE_URL);
}

function assertAlertRepositoryConfig(env: Env): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("alert_delivery_repository_config_missing");
  }
}
