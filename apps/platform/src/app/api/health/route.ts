// Process liveness only, not database or provider readiness.
export function GET() {
  return Response.json(
    { status: "ok", service: "jungle-tribe-platform" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
