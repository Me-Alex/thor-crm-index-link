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
});
