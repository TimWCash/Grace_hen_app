"use client";

import { useEffect, useState } from "react";
import { MemoryComposer } from "@/components/MemoryComposer";
import { getCurrentGuest } from "@/lib/guest";
import { guestHasMemory } from "@/lib/memories";
import { notificationsGranted } from "@/lib/alerts";
import { pushSupported } from "@/lib/push";

const SNOOZE_KEY = "memory-prompt-snoozed"; // sessionStorage — clears on next app open
const ALERTS_SNOOZE = "alerts-snoozed"; // the alerts prompt's session-snooze flag
const ALERTS_DONE_EVENT = "alerts-flow-done"; // fired when the alerts prompt steps aside

function alertsResolved(): boolean {
  if (typeof window === "undefined") return true;
  return !pushSupported() || notificationsGranted() || !!sessionStorage.getItem(ALERTS_SNOOZE);
}

/**
 * On app open, ask each hen for her favourite Grace story (voice or text).
 * Shows until she's left one; "Maybe later" snoozes for the session.
 * Reads the guest directly (not via context) so it's safe on public routes.
 * Last in the popup chain: install guide → alerts prompt → this.
 */
export function MemoryPrompt() {
  const [open, setOpen] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SNOOZE_KEY)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const runCheck = () => {
      timer = setTimeout(async () => {
        const guest = await getCurrentGuest();
        if (cancelled || !guest) return;
        if (guest.is_bride) return; // never nag the bride — it's her surprise
        setGuestId(guest.id);
        const has = await guestHasMemory(guest.id);
        if (!cancelled && has === false) setOpen(true);
      }, 1200);
    };

    // Go ahead if the alerts prompt isn't going to show; otherwise wait for it.
    if (alertsResolved()) {
      runCheck();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }

    const onDone = () => {
      window.removeEventListener(ALERTS_DONE_EVENT, onDone);
      if (!cancelled) runCheck();
    };
    window.addEventListener(ALERTS_DONE_EVENT, onDone);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener(ALERTS_DONE_EVENT, onDone);
    };
  }, []);

  if (!open) return null;

  const snooze = () => {
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  const onPosted = () => {
    setPosted(true);
    setTimeout(() => setOpen(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[92] overflow-y-auto"
      style={{ background: "rgba(0,20,40,0.96)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-center justify-center px-5 py-12">
        <div
          className="w-full max-w-[420px] border p-7"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-rule-gold)" }}
        >
          {posted ? (
            <div className="text-center py-6">
              <p className="font-display" style={{ color: "var(--color-navy)", fontSize: "26px", letterSpacing: "-0.02em" }}>
                Saved for Grace 💛
              </p>
              <p className="font-display italic mt-3" style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "15px" }}>
                Thank you — she&apos;ll love it.
              </p>
            </div>
          ) : (
            <>
              <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
                Before the night
              </p>
              <h2
                className="font-display mt-2"
                style={{ color: "var(--color-navy)", fontSize: "29px", letterSpacing: "-0.02em", lineHeight: 1.06 }}
              >
                What&apos;s your favourite Grace story?
              </h2>
              <p
                className="font-display italic mt-3 mb-6"
                style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px", lineHeight: 1.5 }}
              >
                A quick voice note or a line or two — we&apos;re collecting them for her. Takes a minute.
              </p>

              <MemoryComposer guestId={guestId} onPosted={onPosted} />

              <button
                type="button"
                onClick={snooze}
                className="mt-5 w-full label text-[9px] py-3 border"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", opacity: 0.75, minHeight: "44px" }}
              >
                Maybe later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
