import type { Env } from "../runtime/env";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";
import { updateSourceMode, type SourceRepositoryOptions } from "./sourceRepository";

export type CrawlFailureCategory =
  | "rate_limited"
  | "temporary_unavailable"
  | "blocked"
  | "robots_disallowed"
  | "parse_failed"
  | "discover_failed"
  | "payload_too_large"
  | "invalid_url"
  | "unknown";

export interface CrawlFailurePolicy {
  category: CrawlFailureCategory;
  nextMode: "degraded" | "off" | null;
  retryable: boolean;
}

export interface CrawlGovernanceOptions extends SourceRepositoryOptions {}

export async function recordCrawlFailure(
  env: Env,
  sourceId: string,
  error: unknown,
  options: CrawlGovernanceOptions = {}
): Promise<CrawlFailurePolicy> {
  const policy = classifyCrawlFailure(error);
  await Promise.allSettled([persistCrawlFailureMetric(env, sourceId, error, policy, options), applySourceModePolicy(env, sourceId, policy, options)]);
  return policy;
}

export function classifyCrawlFailure(error: unknown): CrawlFailurePolicy {
  const message = error instanceof Error ? error.message : String(error);
  const status = Number(message.match(/^html_fetch_failed:(\d{3})$/u)?.[1]);

  if (status === 429) return { category: "rate_limited", nextMode: "degraded", retryable: true };
  if (status === 503 || status === 502) return { category: "temporary_unavailable", nextMode: "degraded", retryable: true };
  if (status === 401 || status === 403) return { category: "blocked", nextMode: "off", retryable: false };
  if (message.startsWith("robots_disallowed_seed_url:")) return { category: "robots_disallowed", nextMode: "off", retryable: false };
  if (message.startsWith("listing_parse_failed:")) return { category: "parse_failed", nextMode: "degraded", retryable: false };
  if (message.startsWith("listing_discover_failed:")) return { category: "discover_failed", nextMode: "degraded", retryable: false };
  if (message === "html_fetch_too_large") return { category: "payload_too_large", nextMode: "degraded", retryable: false };
  if (message === "unapproved_seed_url" || message === "invalid_crawl_url" || message === "unsupported_crawl_url_protocol") {
    return { category: "invalid_url", nextMode: "off", retryable: false };
  }

  return { category: "unknown", nextMode: null, retryable: true };
}

async function applySourceModePolicy(
  env: Env,
  sourceId: string,
  policy: CrawlFailurePolicy,
  options: CrawlGovernanceOptions
): Promise<void> {
  if (!policy.nextMode || sourceId === "demo") return;
  await updateSourceMode(env, sourceId, policy.nextMode, options);
}

async function persistCrawlFailureMetric(
  env: Env,
  sourceId: string,
  error: unknown,
  policy: CrawlFailurePolicy,
  options: CrawlGovernanceOptions
): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || sourceId === "demo") return;

  const fetcher = options.fetch ?? fetch;
  const endpoint = new URL("/rest/v1/source_health_metrics", env.SUPABASE_URL);
  const message = error instanceof Error ? error.message : String(error);
  const response = await fetcher(endpoint.toString(), {
    method: "POST",
    headers: supabaseServiceHeaders(env, {
      "content-type": "application/json",
      prefer: "return=minimal"
    }),
    body: JSON.stringify({
      source_id: sourceId,
      crawl_success_rate: policy.retryable ? 0.25 : 0,
      parse_success_rate: policy.category === "parse_failed" ? 0 : null,
      field_coverage: {
        failureCategory: policy.category,
        failureMessage: message.slice(0, 500),
        nextMode: policy.nextMode
      },
      error_count: 1
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`crawl_failure_metric_write_failed:${response.status}:${body}`);
  }
}
