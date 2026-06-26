"use client";

import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";

// Public VAPID key — safe to ship in the client. The private key lives only
// in the Vercel env var VAPID_PRIVATE_KEY (used by /api/push).
const VAPID_PUBLIC_KEY =
  "BE19-Qza7bl_7Uc76WS7dKbyaVvULulScyy5azpq3EwcIPX0t_JAsCs26gkxfwyBMhR3VYPO8g89MT9YtWw8CsY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Subscribe this device to web push and save it, so a closed/locked phone
 * still gets the alerts. Safe to call repeatedly. Needs notification
 * permission already granted (on iPhone, also an installed home-screen app).
 */
export async function ensurePushSubscription(): Promise<boolean> {
  try {
    if (!pushSupported()) return false;
    if (Notification.permission !== "granted") return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const guest = await getCurrentGuest();
    if (!guest) return false;

    const { error } = await supabase()
      .from("push_subscriptions")
      .upsert(
        {
          guest_id: guest.id,
          subscription: sub.toJSON(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "guest_id" },
      );
    if (error) {
      console.error("save push subscription", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("ensurePushSubscription", e);
    return false;
  }
}
