import { ListingsApiError } from "./listingsApi";
import { tenantWorkflowAccessTokenStorageKey } from "./tenantWorkflowApi";

export const supabaseAuthEmailStorageKey = "thor_crm_supabase_user_email";

export interface SupabaseAuthSession {
  accessToken: string;
  email?: string;
}

export interface SignInWithSupabasePasswordOptions {
  email: string;
  password: string;
  supabaseUrl?: string;
  anonKey?: string;
  fetchImpl?: typeof fetch;
}

interface SupabasePasswordGrantResponse {
  access_token: string;
  user?: {
    email?: string;
  };
}

export function getStoredSupabaseAuthSession(): SupabaseAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.sessionStorage.getItem(tenantWorkflowAccessTokenStorageKey)?.trim();
  if (!accessToken) {
    return null;
  }

  const email = window.sessionStorage.getItem(supabaseAuthEmailStorageKey)?.trim() || undefined;
  return email ? { accessToken, email } : { accessToken };
}

export function storeSupabaseAuthSession(session: SupabaseAuthSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(tenantWorkflowAccessTokenStorageKey, session.accessToken);
  if (session.email) {
    window.sessionStorage.setItem(supabaseAuthEmailStorageKey, session.email);
  } else {
    window.sessionStorage.removeItem(supabaseAuthEmailStorageKey);
  }
}

export function clearSupabaseAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(tenantWorkflowAccessTokenStorageKey);
  window.sessionStorage.removeItem(supabaseAuthEmailStorageKey);
}

export async function signInWithSupabasePassword(
  options: SignInWithSupabasePasswordOptions
): Promise<SupabaseAuthSession> {
  const supabaseUrl = resolveSupabaseUrl(options.supabaseUrl);
  const anonKey = resolveSupabaseAnonKey(options.anonKey);
  if (!supabaseUrl || !anonKey) {
    throw new ListingsApiError("Supabase Auth is not configured");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      accept: "application/json",
      apikey: anonKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: options.email,
      password: options.password
    })
  });

  if (!response.ok) {
    throw new ListingsApiError(`Supabase Auth returned ${response.status}`);
  }

  const payload = await response.json();
  if (!isSupabasePasswordGrantResponse(payload)) {
    throw new ListingsApiError("Supabase Auth returned an invalid session payload");
  }

  const session = {
    accessToken: payload.access_token,
    email: payload.user?.email ?? options.email
  };
  storeSupabaseAuthSession(session);
  return session;
}

function resolveSupabaseUrl(value?: string): string | undefined {
  const configuredUrl = value ?? import.meta.env.VITE_SUPABASE_URL;
  return configuredUrl?.replace(/\/+$/, "");
}

function resolveSupabaseAnonKey(value?: string): string | undefined {
  return value ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
}

function isSupabasePasswordGrantResponse(payload: unknown): payload is SupabasePasswordGrantResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "access_token" in payload &&
    typeof payload.access_token === "string"
  );
}
