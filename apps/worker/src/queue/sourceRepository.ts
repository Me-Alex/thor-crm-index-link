import type { Env } from "../runtime/env";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";

export interface SourceWrite {
  id: string;
  name: string;
  base_url: string;
  robots_policy_url: string | null;
  mode: "on" | "degraded" | "off";
  rate_limit_per_minute: number;
  crawl_config: unknown;
  source_trust: number;
}

export interface SourceRepositoryOptions {
  fetch?: typeof fetch;
}

export async function upsertSource(env: Env, write: SourceWrite, options: SourceRepositoryOptions = {}): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("source_repository_config_missing");
  }

  const fetcher = options.fetch ?? fetch;
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/sources?on_conflict=id`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: supabaseServiceHeaders(env, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify(write)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`source_upsert_failed:${response.status}:${body}`);
  }
}

export async function updateSourceMode(
  env: Env,
  sourceId: string,
  mode: SourceWrite["mode"],
  options: SourceRepositoryOptions = {}
): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("source_repository_config_missing");
  }

  const fetcher = options.fetch ?? fetch;
  const endpoint = new URL("/rest/v1/sources", env.SUPABASE_URL);
  endpoint.searchParams.set("id", `eq.${sourceId}`);
  const response = await fetcher(endpoint.toString(), {
    method: "PATCH",
    headers: supabaseServiceHeaders(env, {
      "content-type": "application/json",
      prefer: "return=representation"
    }),
    body: JSON.stringify({ mode })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`source_mode_update_failed:${response.status}:${body}`);
  }
}
