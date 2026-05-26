import { demoListingFixtureHtml, sourceRegistry } from "@thor-crm/adapters";
import type { SourceRegistryEntry } from "@thor-crm/adapters";
import {
  bootstrapWorkspace,
  commercialReadinessResponse,
  createCheckoutSession,
  createComplianceRequest,
  getBillingStatus,
  listBillingPlans
} from "../api/commercial";
import { listDedupReviewLinks } from "../api/dedupReview";
import { getListingById, listListings } from "../api/listings";
import { listSourceHealth } from "../api/sourceHealth";
import {
  createTenantListingNote,
  createTenantSavedSearch,
  deleteTenantSavedSearch,
  getTenantListingWorkflow,
  listTenantAlertDeliveries,
  listTenantSavedSearches,
  updateTenantListingState,
  updateTenantSavedSearch
} from "../api/tenantWorkflow";
import { handleFetchMessage } from "../queue/fetchPipeline";
import { updateSourceMode, upsertSource, type SourceWrite } from "../queue/sourceRepository";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";
import {
  apiCorsPreflight,
  badRequest,
  jsonResponse,
  methodNotAllowed,
  notFound,
  publicCorsPreflight,
  serviceUnavailable,
  unauthorized,
  withApiCors,
  withPublicCors
} from "./responses";
import type { Env } from "../runtime/env";
import type { FetchPipelineOptions } from "../queue/fetchPipeline";

export interface RouterOptions extends FetchPipelineOptions {}

const demoFixtureUrl = "https://example.test/listings/demo-apt-titan";

export async function handleRequest(request: Request, env: Env, options: RouterOptions = {}): Promise<Response> {
  const url = new URL(request.url);
  const isPublicReadRoute =
    url.pathname === "/health" ||
    url.pathname === "/ready" ||
    url.pathname === "/api/listings" ||
    url.pathname === "/api/billing/plans" ||
    url.pathname === "/api/commercial-readiness" ||
    url.pathname === "/api/source-health" ||
    /^\/api\/listings\/[^/]+$/.test(url.pathname);
  const isTenantApiRoute =
    url.pathname === "/api/onboarding/workspace" ||
    url.pathname === "/api/compliance/requests" ||
    /^\/api\/orgs\/[^/]+\/listings\/[^/]+\/workflow$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/listings\/[^/]+\/state$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/listings\/[^/]+\/notes$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/billing$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/billing\/checkout$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/saved-searches$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/saved-searches\/[^/]+$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/alerts$/.test(url.pathname);

  if (request.method === "OPTIONS" && isPublicReadRoute) {
    return publicCorsPreflight();
  }

  if (request.method === "OPTIONS" && isTenantApiRoute) {
    return apiCorsPreflight();
  }

  if (url.pathname === "/health") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return withPublicCors(
      jsonResponse({
        ok: true,
        service: "thor-crm-index-link-worker",
        environment: env.ENVIRONMENT
      })
    );
  }

  if (url.pathname === "/ready") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return withPublicCors(await readyResponse(env, options));
  }

  if (url.pathname === "/api/listings") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return withPublicCors(await listListings(request, env, options));
  }

  if (url.pathname === "/api/source-health") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return withPublicCors(await listSourceHealth(env, options));
  }

  if (url.pathname === "/api/billing/plans") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return withPublicCors(listBillingPlans());
  }

  if (url.pathname === "/api/commercial-readiness") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return withPublicCors(commercialReadinessResponse());
  }

  if (url.pathname === "/api/onboarding/workspace") {
    if (request.method !== "POST") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(await bootstrapWorkspace(request, env, options));
  }

  if (url.pathname === "/api/compliance/requests") {
    if (request.method !== "POST") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(await createComplianceRequest(request, env, options));
  }

  const tenantBillingMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/billing$/);
  if (tenantBillingMatch) {
    if (request.method !== "GET") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(await getBillingStatus(request, env, decodeURIComponent(tenantBillingMatch[1] ?? ""), options));
  }

  const tenantCheckoutMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/billing\/checkout$/);
  if (tenantCheckoutMatch) {
    if (request.method !== "POST") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(await createCheckoutSession(request, env, decodeURIComponent(tenantCheckoutMatch[1] ?? ""), options));
  }

  const listingDetailMatch = url.pathname.match(/^\/api\/listings\/([^/]+)$/);
  if (listingDetailMatch) {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    const listingId = listingDetailMatch[1];
    if (!listingId) {
      return notFound();
    }

    return withPublicCors(await getListingById(decodeURIComponent(listingId), env, options));
  }

  const tenantWorkflowMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/listings\/([^/]+)\/workflow$/);
  if (tenantWorkflowMatch) {
    if (request.method !== "GET") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(
      await getTenantListingWorkflow(
        request,
        env,
        decodeURIComponent(tenantWorkflowMatch[1] ?? ""),
        decodeURIComponent(tenantWorkflowMatch[2] ?? ""),
        options
      )
    );
  }

  const tenantStateMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/listings\/([^/]+)\/state$/);
  if (tenantStateMatch) {
    if (request.method !== "PATCH") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(
      await updateTenantListingState(
        request,
        env,
        decodeURIComponent(tenantStateMatch[1] ?? ""),
        decodeURIComponent(tenantStateMatch[2] ?? ""),
        options
      )
    );
  }

  const tenantNoteMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/listings\/([^/]+)\/notes$/);
  if (tenantNoteMatch) {
    if (request.method !== "POST") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(
      await createTenantListingNote(
        request,
        env,
        decodeURIComponent(tenantNoteMatch[1] ?? ""),
        decodeURIComponent(tenantNoteMatch[2] ?? ""),
        options
      )
    );
  }

  const tenantAlertsMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/alerts$/);
  if (tenantAlertsMatch) {
    if (request.method !== "GET") {
      return withApiCors(methodNotAllowed());
    }

    return withApiCors(await listTenantAlertDeliveries(request, env, decodeURIComponent(tenantAlertsMatch[1] ?? ""), options));
  }

  const tenantSavedSearchesMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/saved-searches$/);
  if (tenantSavedSearchesMatch) {
    if (request.method === "GET") {
      return withApiCors(await listTenantSavedSearches(request, env, decodeURIComponent(tenantSavedSearchesMatch[1] ?? ""), options));
    }

    if (request.method === "POST") {
      return withApiCors(await createTenantSavedSearch(request, env, decodeURIComponent(tenantSavedSearchesMatch[1] ?? ""), options));
    }

    return withApiCors(methodNotAllowed());
  }

  const tenantSavedSearchMatch = url.pathname.match(/^\/api\/orgs\/([^/]+)\/saved-searches\/([^/]+)$/);
  if (tenantSavedSearchMatch) {
    if (request.method === "PATCH") {
      return withApiCors(
        await updateTenantSavedSearch(
          request,
          env,
          decodeURIComponent(tenantSavedSearchMatch[1] ?? ""),
          decodeURIComponent(tenantSavedSearchMatch[2] ?? ""),
          options
        )
      );
    }

    if (request.method === "DELETE") {
      return withApiCors(
        await deleteTenantSavedSearch(
          request,
          env,
          decodeURIComponent(tenantSavedSearchMatch[1] ?? ""),
          decodeURIComponent(tenantSavedSearchMatch[2] ?? ""),
          options
        )
      );
    }

    return withApiCors(methodNotAllowed());
  }

  if (url.pathname === "/admin/ingest/demo") {
    if (request.method !== "POST") {
      return methodNotAllowed();
    }

    if (!isAuthorizedAdmin(request, env.ADMIN_API_KEY)) {
      return unauthorized();
    }

    await upsertSource(
      env,
      {
        id: "demo",
        name: "Demo Source",
        base_url: "https://example.test",
        robots_policy_url: "https://example.test/robots.txt",
        mode: "off",
        rate_limit_per_minute: 10,
        crawl_config: {
          adapter: "demo",
          purpose: "fixture ingest only"
        },
        source_trust: 0.5
      },
      options
    );

    await handleFetchMessage(
      {
        kind: "fetch",
        sourceId: "demo",
        url: demoFixtureUrl,
        discoveredAt: new Date().toISOString(),
        fixtureHtml: demoListingFixtureHtml
      },
      env,
      options
    );

    return jsonResponse({
      ok: true,
      sourceId: "demo",
      url: demoFixtureUrl,
      status: "ingested"
    });
  }

  if (url.pathname === "/admin/sources/bootstrap") {
    if (request.method !== "POST") {
      return methodNotAllowed();
    }

    if (!isAuthorizedAdmin(request, env.ADMIN_API_KEY)) {
      return unauthorized();
    }

    for (const source of sourceRegistry) {
      await upsertSource(env, sourceRegistryEntryToWrite(source), options);
    }

    return jsonResponse({
      ok: true,
      sourceCount: sourceRegistry.length,
      status: "source_registry_bootstrapped"
    });
  }

  const sourceModeMatch = url.pathname.match(/^\/admin\/sources\/([^/]+)\/mode$/);
  if (sourceModeMatch) {
    if (request.method !== "PATCH") {
      return methodNotAllowed();
    }

    if (!isAuthorizedAdmin(request, env.ADMIN_API_KEY)) {
      return unauthorized();
    }

    const mode = await parseSourceModeBody(request);
    if (mode instanceof Response) {
      return mode;
    }

    const sourceId = decodeURIComponent(sourceModeMatch[1] ?? "");
    await updateSourceMode(env, sourceId, mode, options);

    return jsonResponse({
      ok: true,
      sourceId,
      mode,
      status: "source_mode_updated"
    });
  }

  if (url.pathname === "/admin/dedup/links") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    if (!isAuthorizedAdmin(request, env.ADMIN_API_KEY)) {
      return unauthorized();
    }

    return listDedupReviewLinks(request, env, options);
  }

  return notFound();
}

async function parseSourceModeBody(request: Request): Promise<SourceWrite["mode"] | Response> {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body) || !isSourceMode(body.mode)) {
      return badRequest("Invalid source operating mode");
    }

    return body.mode;
  } catch {
    return badRequest("Invalid JSON body");
  }
}

function sourceRegistryEntryToWrite(source: SourceRegistryEntry): SourceWrite {
  return {
    id: source.id,
    name: source.name,
    base_url: source.baseUrl,
    robots_policy_url: source.robotsPolicyUrl,
    mode: source.mode,
    rate_limit_per_minute: source.rateLimitPerMinute,
    crawl_config: source.crawlConfig,
    source_trust: source.sourceTrust
  };
}

async function readyResponse(env: Env, options: RouterOptions): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "missing_config"
    });
  }

  const endpoint = new URL("/rest/v1/sources", env.SUPABASE_URL);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("limit", "1");
  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(endpoint.toString(), {
    method: "GET",
    headers: supabaseServiceHeaders(env)
  });

  if (!response.ok) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "unreachable",
      upstreamStatus: response.status
    });
  }

  return jsonResponse({
    ok: true,
    service: "thor-crm-index-link-worker",
    supabase: "reachable"
  });
}

function isAuthorizedAdmin(request: Request, expectedKey: string): boolean {
  const providedKey = request.headers.get("x-admin-api-key") ?? "";
  if (!expectedKey || !providedKey) {
    return false;
  }
  return constantTimeEqual(providedKey, expectedKey);
}

function isSourceMode(value: unknown): value is SourceWrite["mode"] {
  return value === "on" || value === "degraded" || value === "off";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}
