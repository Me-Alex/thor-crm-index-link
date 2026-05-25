import { describe, expect, it } from "vitest";
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
});

function env() {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
    ADMIN_API_KEY: "admin"
  };
}
