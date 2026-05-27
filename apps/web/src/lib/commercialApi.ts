import type { BillingPlan, CommercialReadinessGate } from "../data/demoData";

export interface FetchCommercialOptions {
  baseUrl: string;
}

export interface BootstrapWorkspaceOptions extends FetchCommercialOptions {
  accessToken: string;
  name: string;
  slug: string;
  billingEmail: string;
}

export interface CheckoutOptions extends FetchCommercialOptions {
  accessToken: string;
  orgId: string;
  plan: "pro" | "scale";
}

export interface ComplianceRequestOptions extends FetchCommercialOptions {
  requestType: "takedown" | "opt_out" | "gdpr_access" | "gdpr_erasure" | "gdpr_rectification" | "security" | "other";
  requesterEmail: string;
  subject: string;
  targetUrl: string;
  details: string;
}

export async function fetchBillingPlans(options: FetchCommercialOptions): Promise<BillingPlan[]> {
  const response = await fetch(`${trimBaseUrl(options.baseUrl)}/api/billing/plans`);
  if (!response.ok) throw new Error(`Billing plans request failed with ${response.status}`);
  const body = (await response.json()) as { data?: BillingPlan[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchCommercialReadiness(options: FetchCommercialOptions): Promise<CommercialReadinessGate[]> {
  const response = await fetch(`${trimBaseUrl(options.baseUrl)}/api/commercial-readiness`);
  if (!response.ok) throw new Error(`Commercial readiness request failed with ${response.status}`);
  const body = (await response.json()) as { data?: { gates?: CommercialReadinessGate[] } };
  return Array.isArray(body.data?.gates) ? body.data.gates : [];
}

export async function bootstrapWorkspace(options: BootstrapWorkspaceOptions): Promise<{ orgId: string; slug: string }> {
  const response = await fetch(`${trimBaseUrl(options.baseUrl)}/api/onboarding/workspace`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      name: options.name,
      slug: options.slug,
      billingEmail: options.billingEmail
    })
  });
  if (!response.ok) throw new Error(`Workspace onboarding failed with ${response.status}`);
  const body = (await response.json()) as { data?: { org?: { id?: string; slug?: string } } };
  const orgId = body.data?.org?.id;
  if (!orgId) throw new Error("Workspace onboarding did not return an organization id");
  return { orgId, slug: body.data?.org?.slug ?? options.slug };
}

export async function createBillingCheckout(options: CheckoutOptions): Promise<string> {
  const response = await fetch(`${trimBaseUrl(options.baseUrl)}/api/orgs/${encodeURIComponent(options.orgId)}/billing/checkout`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ plan: options.plan })
  });
  if (!response.ok) throw new Error(`Billing checkout failed with ${response.status}`);
  const body = (await response.json()) as { data?: { url?: string } };
  if (!body.data?.url) throw new Error("Billing checkout did not return a URL");
  return body.data.url;
}

export async function submitComplianceRequest(options: ComplianceRequestOptions): Promise<void> {
  const response = await fetch(`${trimBaseUrl(options.baseUrl)}/api/compliance/requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      requestType: options.requestType,
      requesterEmail: options.requesterEmail,
      subject: options.subject,
      targetUrl: options.targetUrl,
      details: options.details
    })
  });
  if (!response.ok) throw new Error(`Compliance request failed with ${response.status}`);
}

function trimBaseUrl(value: string): string {
  return value.replace(/\/$/u, "");
}
