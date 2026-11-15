/**
 * Launch step 2 (C2): GET /api/health, for uptime monitors. The website is up if this answers; it also checks that the
 * core API is ready (database reachable, migrations applied). Only ok / failing per check, no internals. 200 or 503.
 */
export const dynamic = "force-dynamic";

const coreReadyUrl = () => process.env.CORE_READY_URL ?? `${process.env.NEXT_PUBLIC_CORE_API_URL ?? ""}/health/ready`;

export async function GET() {
  let api: "ok" | "failing" = "failing";
  try {
    const res = await fetch(coreReadyUrl(), { cache: "no-store", signal: AbortSignal.timeout(4000) });
    api = res.ok ? "ok" : "failing";
  } catch {
    api = "failing";
  }
  const ok = api === "ok";
  return Response.json({ success: ok, service: "website", status: ok ? "ok" : "failing", checks: { app: "ok", api } }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
