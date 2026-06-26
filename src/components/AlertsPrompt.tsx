"use client";

import { useEffect, useState } from "react";
import { notificationsGranted, primeAlerts } from "@/lib/alerts";
import { ensurePushSubscription, pushSupported } from "@/lib/push";

const SNOOZE_KEY = "alerts-snoozed"; // sessionStorage — clears on next app open
const INSTALL_SNOOZE = "install-snoozed";
const INSTALL_DONE_EVENT = "install-flow-done";
const DONE_EVENT = "alerts-flow-done"; // hand the baton to the memory prompt

function installResolved(): boolean {
  if (typeof window === "undefined") return true;
  const installed =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return installed || !!sessionStorage.getItem(INSTALL_SNOOZE);
}

/**
 * On app open (after the install guide steps aside), ask each phone to turn on
 * alerts — so the "time to move" notifications reach it even when locked.
 * Only where push can actually work (Android browsers / installed PWAs).
 */
export function AlertsPrompt() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pass = () => window.dispatchEvent(new Event(DONE_EVENT));

    // Decide once the install guide has resolved (so iPhones install first).
    const afterInstall = () => {
      if (cancelled) return;
      if (!pushSupported() || sessionStorage.getItem(SNOOZE_KEY)) {
        pass();
        return;
      }
      if (notificationsGranted()) {
        void ensurePushSubscription();
        pass();
        return;
      }
      timer = setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 900);
    };

    if (installResolved()) {
      afterInstall();
    } else {
      const onInstall = () => {
        window.removeEventListener(INSTALL_DONE_EVENT, onInstall);
        afterInstall();
      };
      window.addEventListener(INSTALL_DONE_EVENT, onInstall);
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        window.removeEventListener(INSTALL_DONE_EVENT, onInstall);
      };
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const finish = () => {
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event(DONE_EVENT));
    setOpen(false);
  };

  const enable = async () => {
    setBusy(true);
    setStatus(null);
    await primeAlerts();
    const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
    if (perm === "denied") {
      setStatus(
        "Notifications are blocked. Allow them for this site in your browser settings, then tap Turn on again.",
      );
      setBusy(false);
      return;
    }
    if (perm !== "granted") {
      setStatus("Tap Turn on again and choose “Allow” when your phone asks.");
      setBusy(false);
      return;
    }
    const ok = await ensurePushSubscription();
    setBusy(false);
    if (ok) {
      setStatus("You're set — alerts on ✓");
      setTimeout(finish, 1600);
    } else {
      setStatus("Almost — tap Turn on once more.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[93] overflow-y-auto"
      style={{ background: "rgba(0,20,40,0.96)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-center justify-center px-5 py-12">
        <div
          className="w-full max-w-[420px] border p-7"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-rule-gold)" }}
        >
          <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
            Don&apos;t miss the move
          </p>
          <h2
            className="font-display mt-2"
            style={{ color: "var(--color-navy)", fontSize: "29px", letterSpacing: "-0.02em", lineHeight: 1.06 }}
          >
            Turn on alerts
          </h2>
          <p
            className="font-display italic mt-3 mb-6"
            style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px", lineHeight: 1.5 }}
          >
            We&apos;ll buzz your phone the moment it&apos;s time to move to the next bar — even when it&apos;s locked in your bag. One tap.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={enable}
            className="w-full label text-[10px] py-4 border disabled:opacity-50"
            style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "56px" }}
          >
            {busy ? "…" : "🔔 Turn on alerts"}
          </button>

          {status && (
            <p
              className="font-display italic mt-3 text-center"
              style={{ color: "var(--color-navy)", opacity: 0.85, fontSize: "13px", lineHeight: 1.4 }}
            >
              {status}
            </p>
          )}

          <button
            type="button"
            onClick={finish}
            className="mt-4 w-full label text-[9px] py-3 border"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", opacity: 0.75, minHeight: "44px" }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
