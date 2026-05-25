import {
  workerHealthUrl,
  type DemoListing,
  type ListingStatus,
  type PropertyType,
  type SourceHealth,
  type SourceLink,
  type SourceMode,
  type TransactionType
} from "../data/demoData";

export class ListingsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingsApiError";
  }
}

export interface FetchWorkerListingsOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface WorkerListingsResponse {
  data: WorkerApiListing[];
  count: number;
}

interface WorkerSourceHealthResponse {
  data: WorkerApiSourceHealth[];
  count: number;
}

interface WorkerApiSourceHealth {
  id: string;
  name: string;
  mode: SourceMode;
  listingCount: number;
  latestSeenAt: string | null;
  crawlSuccessRate: number;
  parseSuccessRate: number;
  matchRate: number;
  timeToIndexMinutes: number;
}

interface WorkerApiListing {
  id: string;
  recordType: "source_listing" | "canonical_listing";
  sourceId: string | null;
  sourceListingKey: string | null;
  sourceListingId: string | null;
  canonicalListingId: string | null;
  title: string;
  descriptionExcerpt: string;
  priceEur: number | null;
  areaSqm: number | null;
  rooms: number | null;
  floor: number | null;
  propertyType: PropertyType;
  transactionType: TransactionType;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  url: string | null;
  sourceLinks: Array<{
    sourceId: string;
    url: string;
  }>;
  observedAt: string | null;
  lastSeenAt: string | null;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_WORKER_API_BASE_URL = workerHealthUrl.replace(/\/health$/, "");

export function resolveWorkerApiBaseUrl(baseUrl = import.meta.env.VITE_WORKER_API_URL || DEFAULT_WORKER_API_BASE_URL): string | undefined {
  const normalized = baseUrl?.trim().replace(/\/+$/, "");
  return normalized ? normalized : undefined;
}

export async function fetchWorkerListings(options: FetchWorkerListingsOptions = {}): Promise<DemoListing[]> {
  const payload = await fetchWorkerJson("/api/listings", options);
  if (!isWorkerListingsResponse(payload)) {
    throw new ListingsApiError("Worker listings API returned an invalid listings payload");
  }

  return payload.data.map(toDemoListing);
}

export async function fetchWorkerHealth(
  options: FetchWorkerListingsOptions = {}
): Promise<Record<string, unknown>> {
  const payload = await fetchWorkerJson("/health", options);
  if (!isRecord(payload)) {
    throw new ListingsApiError("Worker health API returned an invalid health payload");
  }

  return payload;
}

export async function fetchWorkerSourceHealth(options: FetchWorkerListingsOptions = {}): Promise<SourceHealth[]> {
  const payload = await fetchWorkerJson("/api/source-health", options);
  if (!isWorkerSourceHealthResponse(payload)) {
    throw new ListingsApiError("Worker source health API returned an invalid payload");
  }

  return payload.data.map(toSourceHealth);
}

async function fetchWorkerJson(path: string, options: FetchWorkerListingsOptions): Promise<unknown> {
  const baseUrl = resolveWorkerApiBaseUrl(options.baseUrl);
  if (!baseUrl) {
    throw new ListingsApiError("VITE_WORKER_API_URL is not configured");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ListingsApiError(`Worker API returned ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ListingsApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ListingsApiError("Worker listings API request timed out");
    }

    throw new ListingsApiError("Worker listings API request failed");
  } finally {
    clearTimeout(timeout);
  }
}

function isWorkerListingsResponse(payload: unknown): payload is WorkerListingsResponse {
  return (
    isRecord(payload) &&
    Array.isArray(payload.data) &&
    payload.data.every(isWorkerApiListingLike) &&
    typeof payload.count === "number"
  );
}

function isWorkerApiListingLike(listing: unknown): listing is WorkerApiListing {
  if (!isRecord(listing)) {
    return false;
  }

  return (
    typeof listing.id === "string" &&
    (listing.recordType === "source_listing" || listing.recordType === "canonical_listing") &&
    typeof listing.title === "string" &&
    (listing.city === null || typeof listing.city === "string") &&
    (listing.district === null || typeof listing.district === "string") &&
    (listing.neighborhood === null || typeof listing.neighborhood === "string") &&
    isPropertyType(listing.propertyType) &&
    isTransactionType(listing.transactionType) &&
    (listing.priceEur === null || typeof listing.priceEur === "number") &&
    (listing.areaSqm === null || typeof listing.areaSqm === "number") &&
    (listing.rooms === null || typeof listing.rooms === "number") &&
    (listing.floor === null || typeof listing.floor === "number") &&
    (listing.url === null || typeof listing.url === "string") &&
    Array.isArray(listing.sourceLinks) &&
    listing.sourceLinks.every(isSourceLinkLike)
  );
}

function isWorkerSourceHealthResponse(payload: unknown): payload is WorkerSourceHealthResponse {
  return (
    isRecord(payload) &&
    Array.isArray(payload.data) &&
    payload.data.every(isWorkerApiSourceHealthLike) &&
    typeof payload.count === "number"
  );
}

function isWorkerApiSourceHealthLike(source: unknown): source is WorkerApiSourceHealth {
  return (
    isRecord(source) &&
    typeof source.id === "string" &&
    typeof source.name === "string" &&
    isSourceMode(source.mode) &&
    typeof source.listingCount === "number" &&
    (source.latestSeenAt === null || typeof source.latestSeenAt === "string") &&
    typeof source.crawlSuccessRate === "number" &&
    typeof source.parseSuccessRate === "number" &&
    typeof source.matchRate === "number" &&
    typeof source.timeToIndexMinutes === "number"
  );
}

function isSourceLinkLike(source: unknown): boolean {
  return (
    isRecord(source) &&
    typeof source.sourceId === "string" &&
    typeof source.url === "string"
  );
}

function isPropertyType(value: unknown): value is PropertyType {
  return value === "apartment" || value === "house" || value === "land" || value === "commercial" || value === "other";
}

function isTransactionType(value: unknown): value is TransactionType {
  return value === "sale" || value === "rent";
}

function isSourceMode(value: unknown): value is SourceMode {
  return value === "on" || value === "degraded" || value === "off";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDemoListing(listing: WorkerApiListing): DemoListing {
  const sourceLinks = toSourceLinks(listing);
  const observedDate = dateOnly(listing.lastSeenAt ?? listing.observedAt);
  const priceEur = listing.priceEur ?? 0;

  return {
    id: listing.canonicalListingId ?? listing.sourceListingId ?? listing.id,
    title: listing.title,
    city: listing.city ?? "",
    district: listing.district ?? "",
    neighborhood: listing.neighborhood ?? "",
    propertyType: listing.propertyType,
    transactionType: listing.transactionType,
    priceEur,
    areaSqm: listing.areaSqm ?? 0,
    rooms: listing.rooms ?? 0,
    ...(listing.floor !== null ? { floor: listing.floor } : {}),
    status: tenantStatusFromApi(listing),
    assignee: "Neasignat",
    tags: listing.recordType === "canonical_listing" ? ["canonic"] : ["sursa"],
    matchScore: listing.recordType === "canonical_listing" ? 0.75 : 1,
    changedToday: isToday(listing.lastSeenAt),
    sources: sourceLinks,
    history: observedDate ? [{ date: observedDate, priceEur, availability: "active" }] : []
  };
}

function toSourceLinks(listing: WorkerApiListing): SourceLink[] {
  const links = listing.sourceLinks.length
    ? listing.sourceLinks
    : listing.url && listing.sourceId
      ? [{ sourceId: listing.sourceId, url: listing.url }]
      : [];

  return links.map((source) => ({
    name: sourceName(source.sourceId),
    url: source.url,
    matchScore: listing.recordType === "canonical_listing" ? 0.75 : 1
  }));
}

function sourceName(sourceId: string): string {
  return sourceId === "demo" ? "Demo Source" : sourceId;
}

function toSourceHealth(source: WorkerApiSourceHealth): SourceHealth {
  return {
    id: source.id,
    name: source.name,
    mode: source.mode,
    crawlSuccessRate: source.crawlSuccessRate,
    parseSuccessRate: source.parseSuccessRate,
    matchRate: source.matchRate,
    timeToIndexMinutes: source.timeToIndexMinutes
  };
}

function tenantStatusFromApi(listing: WorkerApiListing): ListingStatus {
  return listing.recordType === "canonical_listing" ? "In lucru" : "Nou";
}

function dateOnly(value: string | null): string | undefined {
  return value?.slice(0, 10) || undefined;
}

function isToday(value: string | null): boolean {
  const date = dateOnly(value);
  return Boolean(date && date === new Date().toISOString().slice(0, 10));
}
