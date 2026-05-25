import { describe, expect, it } from "vitest";
import { sourceRegistry } from "@thor-crm/adapters";
import { handleRequest } from "../src/http/router";

describe("handleRequest", () => {
  it("returns service and source health without database access", async () => {
    const response = await handleRequest(new Request("https://worker.test/health"), {
      ENVIRONMENT: "test",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
      ADMIN_API_KEY: "admin"
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toEqual({
      ok: true,
      service: "thor-crm-index-link-worker",
      environment: "test"
    });
  });

  it("returns ready when Supabase REST is reachable with server-side credentials", async () => {
    const response = await handleRequest(new Request("https://worker.test/ready"), env(), {
      fetch: async (input, init) => {
        expect(String(input)).toBe("https://project.supabase.co/rest/v1/sources?select=id&limit=1");
        const headers = new Headers(init?.headers);
        expect(headers.get("apikey")).toBe("secret");
        expect(headers.get("authorization")).toBe("Bearer secret");
        return Response.json([{ id: "demo" }]);
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "thor-crm-index-link-worker",
      supabase: "reachable"
    });
  });

  it("returns live source health from Supabase without exposing credentials", async () => {
    const fetchCalls: string[] = [];
    const response = await handleRequest(new Request("https://worker.test/api/source-health"), env(), {
      fetch: async (input, init) => {
        fetchCalls.push(String(input));
        const headers = new Headers(init?.headers);
        expect(headers.get("apikey")).toBe("secret");
        expect(headers.get("authorization")).toBe("Bearer secret");

        if (String(input).includes("/rest/v1/sources")) {
          return Response.json([
            {
              id: "imobiliare",
              name: "Imobiliare.ro",
              mode: "on",
              crawl_config: { allowLiveCrawl: true }
            },
            {
              id: "olx",
              name: "OLX Imobiliare",
              mode: "degraded",
              crawl_config: { allowLiveCrawl: true }
            }
          ]);
        }

        if (String(input).includes("/rest/v1/canonical_listing_links")) {
          return Response.json([{ source_listing_id: "sl-imobiliare-1" }, { source_listing_id: "sl-olx-1" }]);
        }

        return Response.json([
          {
            id: "sl-imobiliare-1",
            source_id: "imobiliare",
            crawl_status: "active",
            last_seen_at: "2026-05-25T11:25:50.000Z",
            normalized_payload: { priceEur: 100000, areaSqm: 52, rooms: 2, city: "bucuresti" }
          },
          {
            id: "sl-imobiliare-2",
            source_id: "imobiliare",
            crawl_status: "parse_failed",
            last_seen_at: "2026-05-25T11:20:50.000Z",
            normalized_payload: { priceEur: 101000 }
          },
          {
            id: "sl-olx-1",
            source_id: "olx",
            crawl_status: "active",
            last_seen_at: "2026-05-25T11:15:50.000Z",
            normalized_payload: { priceEur: 100000, areaSqm: 52, rooms: 2, city: "bucuresti" }
          }
        ]);
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "imobiliare",
          name: "Imobiliare.ro",
          mode: "on",
          listingCount: 2,
          latestSeenAt: "2026-05-25T11:25:50.000Z",
          crawlSuccessRate: 1,
          parseSuccessRate: 0.5,
          fieldCoverageRate: 0.63,
          matchRate: 0.5,
          timeToIndexMinutes: expect.any(Number)
        },
        {
          id: "olx",
          name: "OLX Imobiliare",
          mode: "degraded",
          listingCount: 1,
          latestSeenAt: "2026-05-25T11:15:50.000Z",
          crawlSuccessRate: 1,
          parseSuccessRate: 1,
          fieldCoverageRate: 1,
          matchRate: 1,
          timeToIndexMinutes: expect.any(Number)
        }
      ],
      count: 2
    });
    expect(fetchCalls).toEqual([
      "https://project.supabase.co/rest/v1/sources?select=id%2Cname%2Cmode%2Ccrawl_config&order=id.asc",
      "https://project.supabase.co/rest/v1/source_listings?select=id%2Csource_id%2Clast_seen_at%2Ccrawl_status%2Cnormalized_payload&order=last_seen_at.desc&limit=2000",
      "https://project.supabase.co/rest/v1/canonical_listing_links?select=source_listing_id&limit=5000"
    ]);
  });

  it("returns not ready when Supabase credentials are missing", async () => {
    const response = await handleRequest(new Request("https://worker.test/ready"), {
      ...env(),
      SUPABASE_SERVICE_ROLE_KEY: ""
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "missing_config"
    });
  });

  it("reports Supabase upstream status without exposing credentials", async () => {
    const response = await handleRequest(new Request("https://worker.test/ready"), env(), {
      fetch: async () => Response.json({ message: "invalid key" }, { status: 401 })
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "unreachable",
      upstreamStatus: 401
    });
  });

  it("allows public read-route CORS preflight without exposing admin routes", async () => {
    const publicResponse = await handleRequest(new Request("https://worker.test/api/listings", { method: "OPTIONS" }), env());
    const adminResponse = await handleRequest(new Request("https://worker.test/admin/ingest/demo", { method: "OPTIONS" }), env());

    expect(publicResponse.status).toBe(204);
    expect(publicResponse.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(adminResponse.status).toBe(405);
  });

  it("returns JSON 404 for unknown routes", async () => {
    const response = await handleRequest(new Request("https://worker.test/nope"), {
      ENVIRONMENT: "test",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
      ADMIN_API_KEY: "admin"
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "not_found",
      message: "Route not found"
    });
  });

  it("rejects demo ingest without the admin API key", async () => {
    const response = await handleRequest(new Request("https://worker.test/admin/ingest/demo", { method: "POST" }), env());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "unauthorized",
      message: "Invalid admin API key"
    });
  });

  it("fails closed when admin API key is not configured", async () => {
    const response = await handleRequest(
      new Request("https://worker.test/admin/ingest/demo", { method: "POST" }),
      { ...env(), ADMIN_API_KEY: undefined } as never
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "unauthorized",
      message: "Invalid admin API key"
    });
  });

  it("runs demo ingest through the fixture pipeline when authorized", async () => {
    const writes: unknown[] = [];
    const response = await handleRequest(
      new Request("https://worker.test/admin/ingest/demo", {
        method: "POST",
        headers: {
          "x-admin-api-key": "admin"
        }
      }),
      env(),
      {
        fetch: async (input, init) => {
          const url = String(input);
          writes.push({
            url,
            method: init?.method,
            body: init?.body ? JSON.parse(String(init.body)) : undefined
          });
          if (url.includes("/rest/v1/sources")) {
            return Response.json([{ id: "demo" }], { status: 201 });
          }
          if (url.includes("/rest/v1/canonical_listings") && init?.method === "GET") {
            return Response.json([]);
          }
          if (url.includes("/rest/v1/canonical_listings")) {
            return Response.json([{ id: "canonical-listing-id" }], { status: 201 });
          }
          if (url.includes("/rest/v1/alerts")) {
            return Response.json([]);
          }
          return Response.json([{ id: "source-listing-id" }], { status: 201 });
        }
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sourceId: "demo",
      url: "https://example.test/listings/demo-apt-titan",
      status: "ingested"
    });
    expect(writes).toHaveLength(7);
    expect(writes[0]).toMatchObject({
      url: "https://project.supabase.co/rest/v1/sources?on_conflict=id",
      method: "POST",
      body: {
        id: "demo",
        name: "Demo Source",
        base_url: "https://example.test"
      }
    });
  });

  it("bootstraps registered Romanian source policies with reviewed portals active", async () => {
    const writes: unknown[] = [];
    const response = await handleRequest(
      new Request("https://worker.test/admin/sources/bootstrap", {
        method: "POST",
        headers: {
          "x-admin-api-key": "admin"
        }
      }),
      env(),
      {
        fetch: async (input, init) => {
          writes.push({
            url: String(input),
            method: init?.method,
            body: init?.body ? JSON.parse(String(init.body)) : undefined
          });
          return new Response(null, { status: 201 });
        }
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sourceCount: sourceRegistry.length,
      status: "source_registry_bootstrapped"
    });
    expect(writes).toHaveLength(sourceRegistry.length);
    expect(writes.every((write) => String((write as { url: string }).url).endsWith("/rest/v1/sources?on_conflict=id"))).toBe(true);
    expect(writes.find((write) => (write as { body: { id: string } }).body.id === "imobiliare")).toMatchObject({
      method: "POST",
      body: {
        id: "imobiliare",
        mode: "on",
        crawl_config: expect.objectContaining({
          reviewStatus: "approved_initial_crawl",
          rehostPolicy: "index_link_only",
          allowLiveCrawl: true
        })
      }
    });
    expect(writes.find((write) => (write as { body: { id: string } }).body.id === "olx")).toMatchObject({
      body: {
        id: "olx",
        mode: "on",
        crawl_config: expect.objectContaining({
          reviewStatus: "approved_initial_crawl",
          allowLiveCrawl: true
        })
      }
    });
  });

  it("updates source operating mode behind admin auth", async () => {
    const writes: unknown[] = [];
    const response = await handleRequest(
      new Request("https://worker.test/admin/sources/olx/mode", {
        method: "PATCH",
        headers: {
          "x-admin-api-key": "admin",
          "content-type": "application/json"
        },
        body: JSON.stringify({ mode: "degraded" })
      }),
      env(),
      {
        fetch: async (input, init) => {
          writes.push({
            url: String(input),
            method: init?.method,
            body: init?.body ? JSON.parse(String(init.body)) : undefined
          });
          return Response.json([{ id: "olx", mode: "degraded" }]);
        }
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      sourceId: "olx",
      mode: "degraded",
      status: "source_mode_updated"
    });
    expect(writes).toEqual([
      {
        url: "https://project.supabase.co/rest/v1/sources?id=eq.olx",
        method: "PATCH",
        body: { mode: "degraded" }
      }
    ]);
  });

  it("returns dedup link review rows behind admin auth", async () => {
    const response = await handleRequest(
      new Request("https://worker.test/admin/dedup/links?limit=2", {
        headers: {
          "x-admin-api-key": "admin"
        }
      }),
      env(),
      {
        fetch: async (input, init) => {
          expect(String(input)).toBe(
            "https://project.supabase.co/rest/v1/canonical_listing_links?select=source_listing_id%2Ccanonical_listing_id%2Cmatch_score%2Cmatch_reasons%2Clinked_at&order=linked_at.desc&limit=2"
          );
          expect(init?.method).toBe("GET");
          return Response.json([
            {
              source_listing_id: "source-listing-1",
              canonical_listing_id: "canonical-1",
              match_score: 0.84,
              match_reasons: ["same_location", "price_close"],
              linked_at: "2026-05-25T12:00:00.000Z"
            }
          ]);
        }
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          sourceListingId: "source-listing-1",
          canonicalListingId: "canonical-1",
          matchScore: 0.84,
          matchReasons: ["same_location", "price_close"],
          linkedAt: "2026-05-25T12:00:00.000Z"
        }
      ],
      count: 1
    });
  });

  it("rejects invalid source operating mode updates", async () => {
    const response = await handleRequest(
      new Request("https://worker.test/admin/sources/olx/mode", {
        method: "PATCH",
        headers: {
          "x-admin-api-key": "admin",
          "content-type": "application/json"
        },
        body: JSON.stringify({ mode: "blocked" })
      }),
      env()
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "bad_request",
      message: "Invalid source operating mode"
    });
  });
});

function env() {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
    ADMIN_API_KEY: "admin"
  };
}
