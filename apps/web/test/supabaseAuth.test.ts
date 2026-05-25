import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSupabaseAuthSession,
  getStoredSupabaseAuthSession,
  signInWithSupabasePassword,
  storeSupabaseAuthSession,
  supabaseAuthEmailStorageKey
} from "../src/lib/supabaseAuth";
import { tenantWorkflowAccessTokenStorageKey } from "../src/lib/tenantWorkflowApi";

describe("Supabase auth session storage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("stores the user access token for tenant workflow calls", () => {
    storeSupabaseAuthSession({ accessToken: "user-token", email: "agent@thor.test" });

    expect(window.sessionStorage.getItem(tenantWorkflowAccessTokenStorageKey)).toBe("user-token");
    expect(window.sessionStorage.getItem(supabaseAuthEmailStorageKey)).toBe("agent@thor.test");
    expect(getStoredSupabaseAuthSession()).toEqual({
      accessToken: "user-token",
      email: "agent@thor.test"
    });
  });

  it("clears the persisted auth session", () => {
    storeSupabaseAuthSession({ accessToken: "user-token", email: "agent@thor.test" });

    clearSupabaseAuthSession();

    expect(getStoredSupabaseAuthSession()).toBeNull();
    expect(window.sessionStorage.getItem(tenantWorkflowAccessTokenStorageKey)).toBeNull();
  });
});

describe("signInWithSupabasePassword", () => {
  it("uses Supabase Auth password grant without exposing service credentials", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "user-token",
          user: { email: "agent@thor.test" }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await expect(
      signInWithSupabasePassword({
        email: "agent@thor.test",
        password: "password",
        supabaseUrl: "https://project.supabase.co",
        anonKey: "anon-key",
        fetchImpl
      })
    ).resolves.toEqual({
      accessToken: "user-token",
      email: "agent@thor.test"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "anon-key",
          "content-type": "application/json"
        })
      })
    );
  });
});
