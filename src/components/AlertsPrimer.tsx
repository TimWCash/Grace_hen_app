"use client";

import { useEffect, useState } from "react";
import { notificationsGranted, primeAlerts } from "@/lib/alerts";
import { ensurePushSubscription, pushSupported } from "@/lib/push";

/**
 * One-tap "Enable alerts" — asks for notification permission and subscribes
 * this phone to web push so the 15-min warning / GO / Mark's video reach it
 * even when locked. Reports what happened so a stuck phone is diagnosable.
 */
export function AlertsPrimer() {
  const [enabled, setEnabled] = useState(true); // assume on until mounted to avoid flash
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const granted = notificationsGranted();
    // Keep prompting until notifications are actually ON; hide where unsupported.
    setEnabled(granted || !pushSupported());
    if (granted) void ensurePushSubscription();
  }, []);

  if (enabled) return null;

  const enable = async () => {
    setBusy(true);
    setStatus(null);
    await primeAlerts();
    const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
    if (perm === "denied") {
      setStatus(
        "Notifications are blocked for this site. Open your browser's site settings (tap the lock or ⋮ near the address bar) → Notifications → Allow, then tap Enable again.",
      );
      setBusy(false);
      return;
    }
    if (perm !== "granted") {
      setStatus("Tap Enable again and choose “Allow” when your phone asks.");
      setBusy(false);
      return;
    }
    const ok = await ensurePushSubscription();
    setBusy(false);
    if (ok) {
      setStatus("You're set — alerts on ✓");
      setTimeout(() => setEnabled(true), 2000);
    } else {
      setStatus("Permission's on but the sign-up didn't save — tap Enable once more.");
    }
  };

  return (
    <div className="border px-4 py-3 mb-6" style={{ borderColor: "var(--color-rule-gold)" }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
            Don&apos;t miss the call
          </p>
          <p
            className="font-display italic mt-0.5"
            style={{ color: "var(--color-navy)", fontSize: "13px", lineHeight: 1.3 }}
          >
            Turn on alerts for when Claire says it&apos;s time to move.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={enable}
          className="label text-[9px] px-3 py-2 shrink-0 disabled:opacity-50"
          style={{ background: "var(--color-navy)", color: "var(--color-paper)", minHeight: "40px" }}
        >
          {busy ? "…" : "Enable alerts"}
        </button>
      </div>
      {status && (
        <p
          className="font-display italic mt-2"
          style={{ color: "var(--color-navy)", opacity: 0.85, fontSize: "12px", lineHeight: 1.4 }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
