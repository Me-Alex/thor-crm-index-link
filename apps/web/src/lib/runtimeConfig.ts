export type RuntimeMode = "development" | "staging" | "production";

export interface RuntimeConfig {
  mode: RuntimeMode;
  isProduction: boolean;
  allowDemoFallback: boolean;
  requireAuthForWorkflow: boolean;
  requireBackend: boolean;
}

export const runtimeConfig = getRuntimeConfig();

export function getRuntimeConfig(): RuntimeConfig {
  const mode = parseRuntimeMode(import.meta.env.VITE_THOR_RUNTIME ?? import.meta.env.VITE_THOR_ENV);
  const isProduction = mode === "production";

  return {
    mode,
    isProduction,
    allowDemoFallback: readBooleanEnv(import.meta.env.VITE_ALLOW_DEMO_FALLBACK, !isProduction),
    requireAuthForWorkflow: isProduction,
    requireBackend: isProduction
  };
}

export function productionBlockedMessage(message: string) {
  return `Production blocked: ${message}`;
}

function parseRuntimeMode(value: unknown): RuntimeMode {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "production" || normalized === "staging") {
    return normalized;
  }

  return "development";
}

function readBooleanEnv(value: unknown, fallback: boolean) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}
