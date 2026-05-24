export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers
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

export function unauthorized(): Response {
  return jsonResponse(
    {
      error: "unauthorized",
      message: "Invalid admin API key"
    },
    { status: 401 }
  );
}
