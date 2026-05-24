import { jsonResponse, methodNotAllowed, notFound } from "./responses";
import type { Env } from "../runtime/env";

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    if (request.method !== "GET") {
      return methodNotAllowed();
    }

    return jsonResponse({
      ok: true,
      service: "thor-crm-index-link-worker",
      environment: env.ENVIRONMENT
    });
  }

  return notFound();
}
