import { demoListingFixtureHtml } from "@thor-crm/adapters";
import { getListingById, listListings } from "../api/listings";
import { createTenantListingNote, getTenantListingWorkflow, listTenantAlertDeliveries, updateTenantListingState } from "../api/tenantWorkflow";
import { handleFetchMessage } from "../queue/fetchPipeline";
import {
  apiCorsPreflight,
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
  const isPublicReadRoute = url.pathname === "/health" || url.pathname === "/ready" || url.pathname === "/api/listings" || /^\/api\/listings\/[^/]+$/.test(url.pathname);
  const isTenantApiRoute =
    /^\/api\/orgs\/[^/]+\/listings\/[^/]+\/workflow$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/listings\/[^/]+\/state$/.test(url.pathname) ||
    /^\/api\/orgs\/[^/]+\/listings\/[^/]+\/notes$/.test(url.pathname) ||
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

  if (url.pathname === "/admin/ingest/demo") {
    if (request.method !== "POST") {
      return methodNotAllowed();
    }

    if (!isAuthorizedAdmin(request, env.ADMIN_API_KEY)) {
      return unauthorized();
    }

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

  return notFound();
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
    headers: {
      accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "unreachable"
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
