export interface ActiveWorkspace {
  orgId: string;
  name: string;
  slug: string;
  billingEmail?: string;
}

export const activeWorkspaceStorageKey = "thor_crm_active_workspace";

export function getStoredActiveWorkspace(): ActiveWorkspace | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(activeWorkspaceStorageKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ActiveWorkspace>;
    if (!parsedValue.orgId || !parsedValue.name || !parsedValue.slug) {
      return null;
    }

    return {
      orgId: parsedValue.orgId,
      name: parsedValue.name,
      slug: parsedValue.slug,
      ...(parsedValue.billingEmail ? { billingEmail: parsedValue.billingEmail } : {})
    };
  } catch {
    return null;
  }
}

export function storeActiveWorkspace(workspace: ActiveWorkspace) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(activeWorkspaceStorageKey, JSON.stringify(workspace));
}

export function clearStoredActiveWorkspace() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(activeWorkspaceStorageKey);
}
