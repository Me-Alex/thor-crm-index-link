import { describe, expect, it, vi } from "vitest";
import { classifyCrawlFailure, recordCrawlFailure } from "../src/queue/crawlGovernance";
import type { Env } from "../src/runtime/env";

describe("crawl governance", () => {
  it("classifies crawl failures into source mode policies", () => {
    expect(classifyCrawlFailure(new Error("html_fetch_failed:429"))).toEqual({
      category: "rate_limited",
      nextMode: "degraded",
      retryable: true
    });
    expect(classifyCrawlFailure(new Error("html_fetch_failed:403"))).toEqual({
      category: "blocked",
      nextMode: "off",
      retryable: false
    });
    expect(classifyCrawlFailure(new Error("robots_disallowed_seed_url:/"))).toEqual({
      category: "robots_disallowed",
      nextMode: "off",
      retryable: false
    });
    expect(classifyCrawlFailure(new Error("listing_parse_failed:missing_price"))).toEqual({
      category: "parse_failed",
      nextMode: "degraded",
      retryable: false
    });
  });

  it("records source health metrics and degrades unstable sources", async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });
      return new Response(null, { status: 201 });
    });

    const policy = await recordCrawlFailure(env(), "olx", new Error("html_fetch_failed:429"), { fetch: fetchMock });

    expect(policy).toEqual({
      category: "rate_limited",
      nextMode: "degraded",
      retryable: true
    });
    expect(calls).toEqual([
      {
        url: "https://project.supabase.co/rest/v1/source_health_metrics",
        method: "POST",
        body: {
          source_id: "olx",
          crawl_success_rate: 0.25,
          parse_success_rate: null,
          field_coverage: {
            failureCategory: "rate_limited",
            failureMessage: "html_fetch_failed:429",
            nextMode: "degraded"
          },
          error_count: 1
        }
      },
      {
        url: "https://project.supabase.co/rest/v1/sources?id=eq.olx",
        method: "PATCH",
        body: { mode: "degraded" }
      }
    ]);
  });

  it("does not write governance records for demo fixture failures", async () => {
    const fetchMock = vi.fn();

    const policy = await recordCrawlFailure(env(), "demo", new Error("listing_parse_failed:missing_price"), {
      fetch: fetchMock
    });

    expect(policy.nextMode).toBe("degraded");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function env(): Env {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
    ADMIN_API_KEY: "admin"
  };
}
