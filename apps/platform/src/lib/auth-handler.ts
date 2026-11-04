export function createAuthHandler(
  auth: { handler: (request: Request) => Promise<Response> },
  allowedOrigins: string[],
) {
  return async (request: Request) => {
    const origin = request.headers.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      return Response.json({ message: "Origin not allowed." }, { status: 403 });
    }
    const response =
      request.method === "OPTIONS"
        ? new Response(null, { status: 204 })
        : await auth.handler(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.append("Vary", "Origin");
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
