import { describe, expect, it } from "vitest";
import { supabaseServiceHeaders } from "../src/runtime/supabaseRest";
import type { Env } from "../src/runtime/env";

describe("supabaseServiceHeaders", () => {
  it("uses legacy service_role JWT as apikey and bearer authorization", () => {
    const headers = supabaseServiceHeaders(env("legacy-service-role-jwt"));

    expect(headers.get("apikey")).toBe("legacy-service-role-jwt");
    expect(headers.get("authorization")).toBe("Bearer legacy-service-role-jwt");
  });

  it("does not send opaque sb_secret keys as bearer JWTs", () => {
    const headers = supabaseServiceHeaders(env("sb_secret_worker_key"));

    expect(headers.get("apikey")).toBe("sb_secret_worker_key");
    expect(headers.has("authorization")).toBe(false);
  });

  it("preserves user bearer tokens for Supabase Auth calls", () => {
    const headers = supabaseServiceHeaders(env("sb_secret_worker_key"), {
      authorization: "Bearer user-access-token"
    });

    expect(headers.get("apikey")).toBe("sb_secret_worker_key");
    expect(headers.get("authorization")).toBe("Bearer user-access-token");
  });
});

function env(serviceRoleKey: string): Env {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    ADMIN_API_KEY: "admin"
  };
}
