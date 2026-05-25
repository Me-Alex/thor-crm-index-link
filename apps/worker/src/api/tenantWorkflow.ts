import { badGateway, badRequest, forbidden, jsonResponse, serviceUnavailable, unauthorized } from "../http/responses";
import type { Env } from "../runtime/env";

export interface TenantWorkflowApiOptions {
  fetch?: typeof fetch;
}

type TenantListingStatus = "new" | "in_progress" | "contacted" | "ignored" | "archived";

interface AuthContext {
  userId: string;
  role: string;
}

interface AuthUserRow {
  id?: unknown;
}

interface OrganizationMemberRow {
  role: string;
}

interface TenantListingStateRow {
  status: TenantListingStatus;
  assignee_user_id: string | null;
  last_seen_by_org_at: string | null;
  updated_at: string | null;
}

interface TenantListingTagRow {
  tag_id: string;
}

interface TagRow {
  id: string;
  name: string;
  color: string;
}

interface NoteRow {
  id: string;
  body: string;
  author_user_id: string;
  created_at: string;
}

interface AlertDeliveryRow {
  id: string;
  alert_id: string;
  canonical_listing_id: string | null;
  status: string;
  delivered_at: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface StateUpdateInput {
  status?: TenantListingStatus;
  assigneeUserId?: string | null;
  lastSeenByOrgAt?: string | null;
}

class SupabaseApiError extends Error {
  constructor(
    readonly status: number,
    readonly category: "missing_config" | "auth_failed" | "rest_failed" | "invalid_response"
  ) {
    super(`supabase_api_error:${category}:${status}`);
  }
}

const tenantListingStatuses = new Set<TenantListingStatus>(["new", "in_progress", "contacted", "ignored", "archived"]);

export async function getTenantListingWorkflow(
  request: Request,
  env: Env,
  orgId: string,
  canonicalListingId: string,
  options: TenantWorkflowApiOptions = {}
): Promise<Response> {
  const auth = await authorizeOrgMember(request, env, orgId, options);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const stateRows = await queryRows<TenantListingStateRow>(env, options, "tenant_listing_states", {
      select: "status,assignee_user_id,last_seen_by_org_at,updated_at",
      org_id: `eq.${orgId}`,
      canonical_listing_id: `eq.${canonicalListingId}`,
      limit: "1"
    });
    const tagLinkRows = await queryRows<TenantListingTagRow>(env, options, "tenant_listing_tags", {
      select: "tag_id",
      org_id: `eq.${orgId}`,
      canonical_listing_id: `eq.${canonicalListingId}`
    });
    const tagRows = await getTagsForLinks(env, options, orgId, tagLinkRows);
    const noteRows = await queryRows<NoteRow>(env, options, "notes", {
      select: "id,body,author_user_id,created_at",
      org_id: `eq.${orgId}`,
      canonical_listing_id: `eq.${canonicalListingId}`,
      order: "created_at.desc",
      limit: "20"
    });

    return jsonResponse({
      data: {
        state: mapTenantState(stateRows[0]),
        tags: tagRows.map(mapTag),
        notes: noteRows.map(mapNote)
      }
    });
  } catch (error) {
    return supabaseFailureResponse(error);
  }
}

export async function updateTenantListingState(
  request: Request,
  env: Env,
  orgId: string,
  canonicalListingId: string,
  options: TenantWorkflowApiOptions = {}
): Promise<Response> {
  const parsedBody = await parseStateUpdateBody(request);
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const auth = await authorizeOrgMember(request, env, orgId, options);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const rows = await upsertTenantListingState(env, options, orgId, canonicalListingId, parsedBody);
    return jsonResponse({
      data: mapTenantState(rows[0])
    });
  } catch (error) {
    return supabaseFailureResponse(error);
  }
}

export async function createTenantListingNote(
  request: Request,
  env: Env,
  orgId: string,
  canonicalListingId: string,
  options: TenantWorkflowApiOptions = {}
): Promise<Response> {
  const parsedBody = await parseNoteBody(request);
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const auth = await authorizeOrgMember(request, env, orgId, options);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    await upsertTenantListingState(env, options, orgId, canonicalListingId, { status: "new" });
    const rows = await writeRows<NoteRow>(
      env,
      options,
      "notes",
      {
        org_id: orgId,
        canonical_listing_id: canonicalListingId,
        author_user_id: auth.userId,
        body: parsedBody.body
      },
      {},
      "return=representation"
    );

    return jsonResponse(
      {
        data: mapRequiredNote(rows[0])
      },
      { status: 201 }
    );
  } catch (error) {
    return supabaseFailureResponse(error);
  }
}

export async function listTenantAlertDeliveries(
  request: Request,
  env: Env,
  orgId: string,
  options: TenantWorkflowApiOptions = {}
): Promise<Response> {
  const auth = await authorizeOrgMember(request, env, orgId, options);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const url = new URL(request.url);
    const rows = await queryRows<AlertDeliveryRow>(env, options, "alert_deliveries", {
      select: "id,alert_id,canonical_listing_id,status,delivered_at,error_message,payload,created_at",
      org_id: `eq.${orgId}`,
      order: "created_at.desc",
      limit: String(parseLimit(url.searchParams.get("limit")))
    });

    return jsonResponse({
      data: rows.map(mapAlertDelivery),
      count: rows.length
    });
  } catch (error) {
    return supabaseFailureResponse(error);
  }
}

async function authorizeOrgMember(
  request: Request,
  env: Env,
  orgId: string,
  options: TenantWorkflowApiOptions
): Promise<AuthContext | Response> {
  const bearerToken = extractBearerToken(request);
  if (!bearerToken) {
    return unauthorized("Authentication required");
  }

  try {
    const userId = await getAuthenticatedUserId(env, options, bearerToken);
    const members = await queryRows<OrganizationMemberRow>(env, options, "organization_members", {
      select: "role",
      org_id: `eq.${orgId}`,
      user_id: `eq.${userId}`,
      limit: "1"
    });

    const membership = members[0];
    if (!membership) {
      return forbidden("User is not a member of this organization");
    }

    return {
      userId,
      role: membership.role
    };
  } catch (error) {
    if (error instanceof SupabaseApiError && error.category === "auth_failed") {
      return unauthorized("Authentication required");
    }
    return supabaseFailureResponse(error);
  }
}

async function getAuthenticatedUserId(env: Env, options: TenantWorkflowApiOptions, bearerToken: string): Promise<string> {
  ensureSupabaseConfigured(env);
  const response = await fetchWithOptions(options)(new URL("/auth/v1/user", env.SUPABASE_URL).toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${bearerToken}`
    }
  });

  if (!response.ok) {
    throw new SupabaseApiError(response.status, "auth_failed");
  }

  const body = (await response.json()) as AuthUserRow;
  if (typeof body.id !== "string" || !body.id.trim()) {
    throw new SupabaseApiError(502, "invalid_response");
  }

  return body.id;
}

async function getTagsForLinks(
  env: Env,
  options: TenantWorkflowApiOptions,
  orgId: string,
  tagLinks: TenantListingTagRow[]
): Promise<TagRow[]> {
  const tagIds = [...new Set(tagLinks.map((row) => row.tag_id).filter(Boolean))];
  if (tagIds.length === 0) {
    return [];
  }

  return queryRows<TagRow>(env, options, "tags", {
    select: "id,name,color",
    org_id: `eq.${orgId}`,
    id: `in.(${tagIds.join(",")})`
  });
}

async function upsertTenantListingState(
  env: Env,
  options: TenantWorkflowApiOptions,
  orgId: string,
  canonicalListingId: string,
  input: StateUpdateInput
): Promise<TenantListingStateRow[]> {
  const payload: Record<string, unknown> = {
    org_id: orgId,
    canonical_listing_id: canonicalListingId
  };
  if (input.status) {
    payload.status = input.status;
  }
  if ("assigneeUserId" in input) {
    payload.assignee_user_id = input.assigneeUserId;
  }
  if ("lastSeenByOrgAt" in input) {
    payload.last_seen_by_org_at = input.lastSeenByOrgAt;
  }

  return writeRows<TenantListingStateRow>(
    env,
    options,
    "tenant_listing_states",
    payload,
    {
      on_conflict: "org_id,canonical_listing_id"
    },
    "resolution=merge-duplicates,return=representation"
  );
}

async function queryRows<Row>(
  env: Env,
  options: TenantWorkflowApiOptions,
  table: string,
  params: Record<string, string>
): Promise<Row[]> {
  ensureSupabaseConfigured(env);
  const url = supabaseRestUrl(env, table);
  setSearchParams(url, params);
  const response = await fetchWithOptions(options)(url.toString(), {
    method: "GET",
    headers: serviceHeaders(env)
  });

  return parseRows<Row>(response);
}

async function writeRows<Row>(
  env: Env,
  options: TenantWorkflowApiOptions,
  table: string,
  payload: Record<string, unknown>,
  params: Record<string, string>,
  prefer: string
): Promise<Row[]> {
  ensureSupabaseConfigured(env);
  const url = supabaseRestUrl(env, table);
  setSearchParams(url, params);
  const response = await fetchWithOptions(options)(url.toString(), {
    method: "POST",
    headers: {
      ...serviceHeaders(env),
      "content-type": "application/json",
      prefer
    },
    body: JSON.stringify(payload)
  });

  return parseRows<Row>(response);
}

async function parseRows<Row>(response: Response): Promise<Row[]> {
  if (!response.ok) {
    throw new SupabaseApiError(response.status, "rest_failed");
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) {
    throw new SupabaseApiError(502, "invalid_response");
  }

  return body as Row[];
}

function supabaseFailureResponse(error: unknown): Response {
  if (error instanceof SupabaseApiError && error.category === "missing_config") {
    return serviceUnavailable({
      error: "service_unavailable",
      message: "Supabase is not configured"
    });
  }

  if (error instanceof SupabaseApiError) {
    return badGateway("supabase_rest_error", "Unable to process tenant workflow");
  }

  throw error;
}

async function parseStateUpdateBody(request: Request): Promise<StateUpdateInput | Response> {
  const body = await readJsonObject(request);
  if (body instanceof Response) {
    return body;
  }

  const status = body.status;
  if (status !== undefined && !isTenantListingStatus(status)) {
    return badRequest("Invalid tenant listing status");
  }

  const update: StateUpdateInput = {};
  if (status) {
    update.status = status;
  }
  if ("assigneeUserId" in body) {
    if (body.assigneeUserId !== null && typeof body.assigneeUserId !== "string") {
      return badRequest("Invalid assignee user id");
    }
    update.assigneeUserId = body.assigneeUserId;
  }
  if ("lastSeenByOrgAt" in body) {
    if (body.lastSeenByOrgAt !== null && typeof body.lastSeenByOrgAt !== "string") {
      return badRequest("Invalid last seen timestamp");
    }
    update.lastSeenByOrgAt = body.lastSeenByOrgAt;
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No supported state fields provided");
  }

  return update;
}

async function parseNoteBody(request: Request): Promise<{ body: string } | Response> {
  const body = await readJsonObject(request);
  if (body instanceof Response) {
    return body;
  }

  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!noteBody) {
    return badRequest("Note body is required");
  }
  if (noteBody.length > 10000) {
    return badRequest("Note body is too long");
  }

  return { body: noteBody };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return badRequest("JSON object body is required");
    }

    return body;
  } catch {
    return badRequest("Invalid JSON body");
  }
}

function mapTenantState(row: TenantListingStateRow | undefined) {
  return {
    status: row?.status ?? "new",
    assigneeUserId: row?.assignee_user_id ?? null,
    lastSeenByOrgAt: row?.last_seen_by_org_at ?? null,
    updatedAt: row?.updated_at ?? null
  };
}

function mapTag(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color
  };
}

function mapNote(row: NoteRow) {
  return {
    id: row.id,
    body: row.body,
    authorUserId: row.author_user_id,
    createdAt: row.created_at
  };
}

function mapRequiredNote(row: NoteRow | undefined) {
  if (!row) {
    throw new SupabaseApiError(502, "invalid_response");
  }

  return mapNote(row);
}

function mapAlertDelivery(row: AlertDeliveryRow) {
  return {
    id: row.id,
    alertId: row.alert_id,
    canonicalListingId: row.canonical_listing_id,
    status: row.status,
    deliveredAt: row.delivered_at,
    errorMessage: row.error_message,
    payload: row.payload,
    createdAt: row.created_at
  };
}

function setSearchParams(url: URL, params: Record<string, string>): void {
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
}

function serviceHeaders(env: Env): Record<string, string> {
  return {
    accept: "application/json",
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  };
}

function supabaseRestUrl(env: Env, table: string): URL {
  return new URL(`/rest/v1/${table}`, env.SUPABASE_URL);
}

function ensureSupabaseConfigured(env: Env): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new SupabaseApiError(503, "missing_config");
  }
}

function fetchWithOptions(options: TenantWorkflowApiOptions): typeof fetch {
  return options.fetch ?? fetch;
}

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(Math.max(parsed, 1), 100);
}

function isTenantListingStatus(value: unknown): value is TenantListingStatus {
  return typeof value === "string" && tenantListingStatuses.has(value as TenantListingStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
