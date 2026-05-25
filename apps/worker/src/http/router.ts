import { demoListingFixtureHtml } from "@thor-crm/adapters";
import { getListingById, listListings } from "../api/listings";
import { handleFetchMessage } from "../queue/fetchPipeline";
import { jsonResponse, methodNotAllowed, notFound, publicCorsPreflight, unauthorized, withPublicCors } from "./responses";
import type { Env } from "../runtime/env";
import type { FetchPipelineOptions } from "../queue/fetchPipeline";

export interface RouterOptions extends FetchPipelineOptions {}

const demoFixtureUrl = "https://example.test/listings/demo-apt-titan";

export async function handleRequest(request: Request, env: Env, options: RouterOptions = {}): Promise<Response> {
  const url = new URL(request.url);
  const isPublicReadRoute = url.pathname === "/health" || url.pathname === "/api/listings" || /^\/api\/listings\/[^/]+$/.test(url.pathname);

  if (request.method === "OPTIONS" && isPublicReadRoute) {
    return publicCorsPreflight();
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
