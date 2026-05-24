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
    expect(await response.json()).toEqual({
      ok: true,
      service: "thor-crm-index-link-worker",
      environment: "test"
    });
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
          writes.push({
            url: String(input),
            method: init?.method,
            body: JSON.parse(String(init?.body))
          });
          return new Response(JSON.stringify([{ id: "source-listing-id" }]), { status: 201 });
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
    expect(writes).toHaveLength(1);
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
