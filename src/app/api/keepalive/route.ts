// Keep-alive endpoint hit daily by a Vercel Cron (see vercel.json).
// Runs a tiny Supabase query so the free-tier project never pauses
// before the hen. Returns 200 regardless so the cron never alarms.

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, reason: "env not set" });
  }
  try {
    // verify_passcode executes a query (granted to anon) → counts as activity.
    await fetch(`${url}/rest/v1/rpc/verify_passcode`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p: "keep-alive" }),
      cache: "no-store",
    });
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, reason: String(e) });
  }
}
