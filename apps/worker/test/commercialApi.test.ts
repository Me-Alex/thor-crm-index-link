import { describe, expect, it, vi } from "vitest";
import {
  bootstrapWorkspace,
  commercialReadinessResponse,
  createCheckoutSession,
  createComplianceRequest,
  getBillingStatus,
  listBillingPlans
} from "../src/api/commercial";
import type { Env } from "../src/runtime/env";

describe("commercial API", () => {
  it("exposes pilot-ready billing plans and readiness gates", async () => {
    const plansResponse = listBillingPlans();
    const readinessResponse = commercialReadinessResponse();

    expect(plansResponse.status).toBe(200);
    expect(readinessResponse.status).toBe(200);
    await expect(plansResponse.json()).resolves.toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({ id: "pilot", checkoutRequired: false }),
        expect.objectContaining({ id: "pro", checkoutRequired: true }),
        expect.objectContaining({ id: "scale", checkoutRequired: true })
      ])
    });
    await expect(readinessResponse.json()).resolves.toEqual({
      data: expect.objectContaining({
        status: "pilot_ready",
        gates: expect.arrayContaining([
          expect.objectContaining({ id: "crawler_governance", status: "ready" }),
          expect.objectContaining({ id: "billing_checkout", status: "needs_secrets" }),
          expect.objectContaining({ id: "legal_pack", status: "review_required" })
        ])
      })
    });
  });

  it("bootstraps an authenticated agency workspace with trial billing", async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      if (String(input).includes("/auth/v1/user")) {
        return Response.json({ id: "user-1", email: "admin@agency.test" });
      }
      if (String(input).includes("/rest/v1/organizations")) {
        return Response.json([{ id: "org-1", name: "Agentia Test", slug: "agentia-test" }], { status: 201 });
      }
      return new Response(null, { status: 201 });
    });

    const response = await bootstrapWorkspace(
      new Request("https://worker.test/api/onboarding/workspace", {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({ name: "Agentia Test", billingEmail: "billing@agency.test" })
      }),
      env(),
      { fetch: fetchMock, now: new Date("2026-05-26T00:00:00.000Z") }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        org: { id: "org-1", name: "Agentia Test", slug: "agentia-test" },
        role: "admin",
        plan: "pilot"
      }
    });
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/auth/v1/user",
      "/rest/v1/organizations",
      "/rest/v1/organization_members",
      "/rest/v1/organization_profiles",
      "/rest/v1/organization_billing"
    ]);
    expect(calls[4]?.body).toMatchObject({
      org_id: "org-1",
      plan: "pilot",
      subscription_status: "trialing",
      trial_ends_at: "2026-06-09T00:00:00.000Z"
    });
  });

  it("returns billing status for organization members", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) {
        return Response.json({ id: "user-1", email: "admin@agency.test" });
      }
      if (url.includes("/rest/v1/organization_members")) {
        return Response.json([{ role: "admin" }]);
      }
      return Response.json([
        {
          org_id: "org-1",
          plan: "pilot",
          subscription_status: "trialing",
          trial_ends_at: "2026-06-09T00:00:00.000Z",
          seats: 3,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_end: null
        }
      ]);
    });

    const response = await getBillingStatus(authenticatedRequest("https://worker.test/api/orgs/org-1/billing"), env(), "org-1", {
      fetch: fetchMock
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        org_id: "org-1",
        plan: "pilot",
        subscription_status: "trialing"
      })
    });
  });

  it("creates a Stripe checkout session for organization admins when secrets are configured", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method, body: init?.body ? String(init.body) : undefined });

      if (String(input).includes("/auth/v1/user")) {
        return Response.json({ id: "user-1", email: "admin@agency.test" });
      }
      if (String(input).includes("/rest/v1/organization_members")) {
        return Response.json([{ role: "admin" }]);
      }
      if (String(input).includes("api.stripe.com")) {
        return Response.json({ id: "cs_test_123", url: "https://checkout.stripe.test/session" });
      }
      return new Response(null, { status: 201 });
    });

    const response = await createCheckoutSession(
      new Request("https://worker.test/api/orgs/org-1/billing/checkout", {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({ plan: "pro" })
      }),
      { ...env(), STRIPE_SECRET_KEY: "sk_test", STRIPE_PRO_PRICE_ID: "price_pro" },
      "org-1",
      { fetch: fetchMock }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: { url: "https://checkout.stripe.test/session", sessionId: "cs_test_123" }
    });
    const stripeCall = calls.find((call) => call.url === "https://api.stripe.com/v1/checkout/sessions");
    expect(stripeCall?.body).toContain("mode=subscription");
    expect(stripeCall?.body).toContain("line_items%5B0%5D%5Bprice%5D=price_pro");
    expect(calls.at(-1)).toMatchObject({
      url: "https://project.supabase.co/rest/v1/organization_billing?on_conflict=org_id",
      method: "POST"
    });
  });

  it("keeps paid checkout unavailable until Stripe secrets are set", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/auth/v1/user")) {
        return Response.json({ id: "user-1", email: "admin@agency.test" });
      }
      return Response.json([{ role: "admin" }]);
    });

    const response = await createCheckoutSession(
      new Request("https://worker.test/api/orgs/org-1/billing/checkout", {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({ plan: "pro" })
      }),
      env(),
      "org-1",
      { fetch: fetchMock }
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "billing_not_configured",
      message: "Stripe secrets and price IDs must be configured before paid checkout is available"
    });
  });

  it("accepts takedown and GDPR requests without exposing service credentials", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://project.supabase.co/rest/v1/compliance_requests");
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe("secret");
      return Response.json([{ id: "request-1", status: "open" }], { status: 201 });
    });

    const response = await createComplianceRequest(
      new Request("https://worker.test/api/compliance/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestType: "takedown",
          requesterEmail: "owner@example.test",
          subject: "Remove listing",
          targetUrl: "https://portal.test/listing",
          details: "This listing should be removed from the index."
        })
      }),
      env(),
      { fetch: fetchMock }
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ data: { id: "request-1", status: "open" } });
  });
});

function authenticatedRequest(url: string): Request {
  return new Request(url, {
    headers: {
      authorization: "Bearer user-token"
    }
  });
}

function env(): Env {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
    ADMIN_API_KEY: "admin",
    PUBLIC_APP_URL: "https://app.thor.test"
  };
}
