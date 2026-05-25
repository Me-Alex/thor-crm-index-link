import type { Env } from "./env";

export function supabaseServiceHeaders(env: Env, init: HeadersInit = {}): Headers {
  const headers = new Headers(init);
  headers.set("apikey", env.SUPABASE_SERVICE_ROLE_KEY);

  if (!headers.has("authorization") && !isOpaqueSupabaseApiKey(env.SUPABASE_SERVICE_ROLE_KEY)) {
    headers.set("authorization", `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  return headers;
}

function isOpaqueSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_secret_") || value.startsWith("sb_publishable_");
}
