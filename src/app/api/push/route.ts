import type { NextRequest } from "next/server";
import webpush from "web-push";

export const runtime = "nodejs";

// Public VAPID + contact are not secret. Only the private key is an env var.
const VAPID_PUBLIC =
  "BE19-Qza7bl_7Uc76WS7dKbyaVvULulScyy5azpq3EwcIPX0t_JAsCs26gkxfwyBMhR3VYPO8g89MT9YtWw8CsY";
const VAPID_SUBJECT = "mailto:timothy.cashman@gmail.com";

type PushBody = { title?: string; body?: string; url?: string };

export async function POST(req: NextRequest) {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) {
    return Response.json(
      { ok: false, error: "VAPID_PRIVATE_KEY not set in the environment" },
      { status: 500 },
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, priv);

  const auth = req.headers.get("authorization") ?? "";
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !anon) {
    return Response.json({ ok: false, error: "supabase env missing" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as PushBody;
  const payload = JSON.stringify({
    title: (body.title || "Grace's Hen").toString().slice(0, 80),
    body: (body.body || "").toString().slice(0, 200),
    url: (body.url || "/tonight").toString().slice(0, 200),
  });

  // Fetch every saved subscription — but push_targets() only returns rows when
  // the caller (this admin's token) passes is_admin(). Non-admins get nothing.
  const tRes = await fetch(`${supaUrl}/rest/v1/rpc/push_targets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: auth,
    },
    body: "{}",
  });
  if (!tRes.ok) {
    return Response.json(
      { ok: false, error: `targets lookup failed (${tRes.status})` },
      { status: 500 },
    );
  }
  const subs = (await tRes.json()) as webpush.PushSubscription[];
  if (!Array.isArray(subs) || subs.length === 0) {
    return Response.json({ ok: true, sent: 0, failed: 0, targets: 0 });
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch {
        failed++; // dead/expired subscription — ignored for this run
      }
    }),
  );

  return Response.json({ ok: true, sent, failed, targets: subs.length });
}
