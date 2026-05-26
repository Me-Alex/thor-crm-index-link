import { badGateway, badRequest, forbidden, jsonResponse, serviceUnavailable, unauthorized } from "../http/responses";
import type { Env } from "../runtime/env";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";

export interface CommercialApiOptions {
  fetch?: typeof fetch;
  now?: Date;
}

type BillingPlan = "pilot" | "pro" | "scale";

interface AuthUserRow {
  id?: unknown;
  email?: unknown;
}

interface OrganizationMemberRow {
  role: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationBillingRow {
  org_id: string;
  plan: BillingPlan;
  subscription_status: string;
  trial_ends_at: string | null;
  seats: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

interface AuthContext {
  userId: string;
  email: string | null;
  role?: string;
}

class CommercialApiError extends Error {
  constructor(
    readonly status: number,
    readonly category: "missing_config" | "auth_failed" | "rest_failed" | "invalid_response" | "stripe_failed"
  ) {
    super(`commercial_api_error:${category}:${status}`);
  }
}

const billingPlans = [
  {
    id: "pilot",
    name: "Pilot",
    priceEurMonthly: 299,
    trialDays: 14,
    seatsIncluded: 3,
    checkoutRequired: false,
    features: ["workspace agentie", "surse activate gradual", "workflow status/note/taguri", "support async"]
  },
  {
    id: "pro",
    name: "Pro",
    priceEurMonthly: 699,
    trialDays: 14,
    seatsIncluded: 10,
    checkoutRequired: true,
    features: ["crawler monitorizat", "alerte salvate", "source health", "raport prospetime/dedup"]
  },
  {
    id: "scale",
    name: "Scale",
    priceEurMonthly: 1499,
    trialDays: 14,
    seatsIncluded: 25,
    checkoutRequired: true,
    features: ["surse prioritare", "SLA operational", "support prioritar", "audit export"]
  }
] as const;

export function listBillingPlans(): Response {
  return jsonResponse({ data: billingPlans });
}

export function commercialReadinessResponse(): Response {
  return jsonResponse({
    data: {
      status: "pilot_ready",
      gates: [
        { id: "crawler_governance", label: "Crawler governance", status: "ready", owner: "ops" },
        { id: "tenant_onboarding", label: "Tenant onboarding", status: "ready", owner: "product" },
        { id: "billing_checkout", label: "Billing checkout", status: "needs_secrets", owner: "ops" },
        { id: "legal_pack", label: "Legal pack", status: "review_required", owner: "legal" },
        { id: "dedup_quality", label: "Dedup quality reporting", status: "ready", owner: "engineering" },
        { id: "freshness_sla", label: "Freshness SLA reporting", status: "ready", owner: "ops" }
      ]
    }
  });
}

export async function bootstrapWorkspace(request: Request, env: Env, options: CommercialApiOptions = {}): Promise<Response> {
  const parsed = await readJsonObject(request);
  if (parsed instanceof Response) return parsed;

  const auth = await authenticateUser(request, env, options);
  if (auth instanceof Response) return auth;

  const name = normalizeText(parsed.name);
  const slug = normalizeSlug(typeof parsed.slug === "string" ? parsed.slug : name);
  const legalName = normalizeOptionalText(parsed.legalName);
  const billingEmail = normalizeOptionalText(parsed.billingEmail) ?? auth.email;
  const supportEmail = normalizeOptionalText(parsed.supportEmail) ?? auth.email;

  if (!name || name.length > 120) return badRequest("Organization name is required");
  if (!slug) return badRequest("Valid organization slug is required");

  try {
    const organization = await writeRows<OrganizationRow>(
      env,
      options,
      "organizations",
      { name, slug },
      { on_conflict: "slug" },
      "resolution=merge-duplicates,return=representation"
    );
    const org = organization[0];
    if (!org) throw new CommercialApiError(502, "invalid_response");

    await writeRows(
      env,
      options,
      "organization_members",
      { org_id: org.id, user_id: auth.userId, role: "admin" },
      { on_conflict: "org_id,user_id" },
      "resolution=merge-duplicates,return=minimal"
    );
    await writeRows(
      env,
      options,
      "organization_profiles",
      {
        org_id: org.id,
        legal_name: legalName,
        billing_email: billingEmail,
        support_email: supportEmail,
        created_by: auth.userId,
        onboarding_completed_at: new Date().toISOString()
      },
      { on_conflict: "org_id" },
      "resolution=merge-duplicates,return=minimal"
    );
    await writeRows(
      env,
      options,
      "organization_billing",
      {
        org_id: org.id,
        plan: "pilot",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt(options.now ?? new Date(), 14),
        seats: 3
      },
      { on_conflict: "org_id" },
      "resolution=merge-duplicates,return=minimal"
    );

    return jsonResponse({ data: { org, role: "admin", plan: "pilot" } }, { status: 201 });
  } catch (error) {
    return commercialFailureResponse(error);
  }
}

export async function getBillingStatus(request: Request, env: Env, orgId: string, options: CommercialApiOptions = {}): Promise<Response> {
  const auth = await authorizeOrgMember(request, env, orgId, options);
  if (auth instanceof Response) return auth;

  try {
    const rows = await queryRows<OrganizationBillingRow>(env, options, "organization_billing", {
      select: "org_id,plan,subscription_status,trial_ends_at,seats,stripe_customer_id,stripe_subscription_id,current_period_end",
      org_id: `eq.${orgId}`,
      limit: "1"
    });

    return jsonResponse({
      data: rows[0] ?? {
        org_id: orgId,
        plan: "pilot",
        subscription_status: "manual_review",
        trial_ends_at: null,
        seats: 3,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null
      }
    });
  } catch (error) {
    return commercialFailureResponse(error);
  }
}

export async function createCheckoutSession(request: Request, env: Env, orgId: string, options: CommercialApiOptions = {}): Promise<Response> {
  const parsed = await readJsonObject(request);
  if (parsed instanceof Response) return parsed;

  const plan = parsed.plan;
  if (!isPaidPlan(plan)) return badRequest("A paid billing plan is required");

  const auth = await authorizeOrgAdmin(request, env, orgId, options);
  if (auth instanceof Response) return auth;

  const priceId = priceIdForPlan(env, plan);
  if (!env.STRIPE_SECRET_KEY || !priceId) {
    return serviceUnavailable({
      error: "billing_not_configured",
      message: "Stripe secrets and price IDs must be configured before paid checkout is available"
    });
  }

  try {
    const session = await createStripeCheckout(env, options, {
      orgId,
      userId: auth.userId,
      email: auth.email,
      plan,
      priceId
    });

    await writeRows(
      env,
      options,
      "organization_billing",
      {
        org_id: orgId,
        plan,
        subscription_status: "incomplete",
        stripe_checkout_session_id: session.id,
        seats: plan === "scale" ? 25 : 10
      },
      { on_conflict: "org_id" },
      "resolution=merge-duplicates,return=minimal"
    );

    return jsonResponse({ data: { url: session.url, sessionId: session.id } }, { status: 201 });
  } catch (error) {
    return commercialFailureResponse(error);
  }
}

export async function createComplianceRequest(request: Request, env: Env, options: CommercialApiOptions = {}): Promise<Response> {
  const parsed = await readJsonObject(request);
  if (parsed instanceof Response) return parsed;

  const requestType = parsed.requestType;
  const requesterEmail = normalizeText(parsed.requesterEmail);
  const subject = normalizeText(parsed.subject);
  const targetUrl = normalizeOptionalText(parsed.targetUrl);
  const details = normalizeText(parsed.details);
  const orgId = normalizeOptionalText(parsed.orgId);

  if (!isComplianceRequestType(requestType)) return badRequest("Invalid compliance request type");
  if (!requesterEmail || !requesterEmail.includes("@")) return badRequest("Requester email is required");
  if (!subject || subject.length > 200) return badRequest("Subject is required");
  if (!details || details.length < 10 || details.length > 10000) return badRequest("Details must be between 10 and 10000 characters");

  try {
    const rows = await writeRows<{ id: string; status: string }>(
      env,
      options,
      "compliance_requests",
      {
        org_id: orgId,
        request_type: requestType,
        requester_email: requesterEmail,
        subject,
        target_url: targetUrl,
        details
      },
      {},
      "return=representation"
    );
    return jsonResponse({ data: rows[0] }, { status: 202 });
  } catch (error) {
    return commercialFailureResponse(error);
  }
}

async function createStripeCheckout(
  env: Env,
  options: CommercialApiOptions,
  input: { orgId: string; userId: string; email: string | null; plan: "pro" | "scale"; priceId: string }
): Promise<{ id: string; url: string }> {
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", input.priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("subscription_data[trial_period_days]", "14");
  form.set("metadata[org_id]", input.orgId);
  form.set("metadata[user_id]", input.userId);
  form.set("metadata[plan]", input.plan);
  form.set("success_url", `${publicAppUrl(env)}/?billing=success&org=${encodeURIComponent(input.orgId)}`);
  form.set("cancel_url", `${publicAppUrl(env)}/?billing=cancelled&org=${encodeURIComponent(input.orgId)}`);
  if (input.email) form.set("customer_email", input.email);

  const response = await fetchWithOptions(options)("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  if (!response.ok) throw new CommercialApiError(response.status, "stripe_failed");
  const body = (await response.json()) as { id?: unknown; url?: unknown };
  if (typeof body.id !== "string" || typeof body.url !== "string") {
    throw new CommercialApiError(502, "invalid_response");
  }
  return { id: body.id, url: body.url };
}

async function authorizeOrgAdmin(request: Request, env: Env, orgId: string, options: CommercialApiOptions): Promise<AuthContext | Response> {
  const auth = await authorizeOrgMember(request, env, orgId, options);
  if (auth instanceof Response) return auth;
  if (auth.role !== "admin") return forbidden("Organization admin role is required");
  return auth;
}

async function authorizeOrgMember(request: Request, env: Env, orgId: string, options: CommercialApiOptions): Promise<AuthContext | Response> {
  const auth = await authenticateUser(request, env, options);
  if (auth instanceof Response) return auth;

  try {
    const rows = await queryRows<OrganizationMemberRow>(env, options, "organization_members", {
      select: "role",
      org_id: `eq.${orgId}`,
      user_id: `eq.${auth.userId}`,
      limit: "1"
    });
    const membership = rows[0];
    if (!membership) return forbidden("User is not a member of this organization");
    return { ...auth, role: membership.role };
  } catch (error) {
    return commercialFailureResponse(error);
  }
}

async function authenticateUser(request: Request, env: Env, options: CommercialApiOptions): Promise<AuthContext | Response> {
  const token = extractBearerToken(request);
  if (!token) return unauthorized("Authentication required");

  try {
    ensureSupabaseConfigured(env);
    const response = await fetchWithOptions(options)(new URL("/auth/v1/user", env.SUPABASE_URL).toString(), {
      method: "GET",
      headers: supabaseServiceHeaders(env, { authorization: `Bearer ${token}` })
    });
    if (!response.ok) throw new CommercialApiError(response.status, "auth_failed");
    const body = (await response.json()) as AuthUserRow;
    if (typeof body.id !== "string") throw new CommercialApiError(502, "invalid_response");
    return { userId: body.id, email: typeof body.email === "string" ? body.email : null };
  } catch (error) {
    if (error instanceof CommercialApiError && error.category === "auth_failed") {
      return unauthorized("Authentication required");
    }
    return commercialFailureResponse(error);
  }
}

async function queryRows<Row>(env: Env, options: CommercialApiOptions, table: string, params: Record<string, string>): Promise<Row[]> {
  ensureSupabaseConfigured(env);
  const url = supabaseRestUrl(env, table);
  setSearchParams(url, params);
  const response = await fetchWithOptions(options)(url.toString(), {
    method: "GET",
    headers: supabaseServiceHeaders(env)
  });
  return parseRows<Row>(response);
}

async function writeRows<Row>(
  env: Env,
  options: CommercialApiOptions,
  table: string,
  payload: Record<string, unknown>,
  params: Record<string, string>,
  prefer: string
): Promise<Row[]> {
  ensureSupabaseConfigured(env);
  const url = supabaseRestUrl(env, table);
  setSearchParams(url, params);
  const response = await fetchWithOptions(options)(url.toString(), {
    method: "POST",
    headers: supabaseServiceHeaders(env, {
      "content-type": "application/json",
      prefer
    }),
    body: JSON.stringify(payload)
  });
  return prefer.includes("return=minimal") ? ([] as Row[]) : parseRows<Row>(response);
}

async function parseRows<Row>(response: Response): Promise<Row[]> {
  if (!response.ok) throw new CommercialApiError(response.status, "rest_failed");
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) throw new CommercialApiError(502, "invalid_response");
  return body as Row[];
}

function commercialFailureResponse(error: unknown): Response {
  if (error instanceof CommercialApiError && error.category === "missing_config") {
    return serviceUnavailable({ error: "service_unavailable", message: "Supabase is not configured" });
  }
  if (error instanceof CommercialApiError && error.category === "stripe_failed") {
    return badGateway("stripe_error", "Unable to create billing checkout session");
  }
  if (error instanceof CommercialApiError) {
    return badGateway("supabase_rest_error", "Unable to process commercial readiness request");
  }
  throw error;
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = (await request.json()) as unknown;
    return isRecord(body) ? body : badRequest("JSON object body is required");
  } catch {
    return badRequest("Invalid JSON body");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPaidPlan(value: unknown): value is "pro" | "scale" {
  return value === "pro" || value === "scale";
}

function isComplianceRequestType(value: unknown): value is string {
  return (
    value === "takedown" ||
    value === "opt_out" ||
    value === "gdpr_access" ||
    value === "gdpr_erasure" ||
    value === "gdpr_rectification" ||
    value === "security" ||
    value === "other"
  );
}

function priceIdForPlan(env: Env, plan: "pro" | "scale"): string | undefined {
  return plan === "pro" ? env.STRIPE_PRO_PRICE_ID : env.STRIPE_SCALE_PRICE_ID;
}

function publicAppUrl(env: Env): string {
  return env.PUBLIC_APP_URL || "https://thor-crm-index-link-web.pages.dev";
}

function trialEndsAt(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}

function normalizeOptionalText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63);
}

function extractBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim();
}

function ensureSupabaseConfigured(env: Env): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new CommercialApiError(503, "missing_config");
  }
}

function supabaseRestUrl(env: Env, table: string): URL {
  return new URL(`/rest/v1/${table}`, env.SUPABASE_URL);
}

function setSearchParams(url: URL, params: Record<string, string>): void {
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
}

function fetchWithOptions(options: CommercialApiOptions): typeof fetch {
  return options.fetch ?? fetch;
}
