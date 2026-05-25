export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

export function withPublicCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function publicCorsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "Origin"
    }
  });
}

export function withApiCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, POST, PATCH, OPTIONS");
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function apiCorsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      vary: "Origin"
    }
  });
}

export function notFound(): Response {
  return jsonResponse(
    {
      error: "not_found",
      message: "Route not found"
    },
    { status: 404 }
  );
}

export function methodNotAllowed(): Response {
  return jsonResponse(
    {
      error: "method_not_allowed",
      message: "Method not allowed"
    },
    { status: 405 }
  );
}

export function badRequest(message: string): Response {
  return jsonResponse(
    {
      error: "bad_request",
      message
    },
    { status: 400 }
  );
}

export function unauthorized(message = "Invalid admin API key"): Response {
  return jsonResponse(
    {
      error: "unauthorized",
      message
    },
    { status: 401 }
  );
}

export function forbidden(message: string): Response {
  return jsonResponse(
    {
      error: "forbidden",
      message
    },
    { status: 403 }
  );
}

export function badGateway(error: string, message: string): Response {
  return jsonResponse(
    {
      error,
      message
    },
    { status: 502 }
  );
}

export function serviceUnavailable(body: unknown): Response {
  return jsonResponse(body, { status: 503 });
}
