"use client";

import { useEffect, useState } from "react";
import { alertsEnabled, primeAlerts } from "@/lib/alerts";

/**
 * One-tap "Enable alerts" — unlocks audio + asks for notifications so the
 * 15-min warning / GO / Mark's video make a sound (and buzz on Android)
 * when they land. Hidden once enabled.
 */
export function AlertsPrimer() {
  const [enabled, setEnabled] = useState(true); // assume on until mounted to avoid flash

  useEffect(() => {
    setEnabled(alertsEnabled());
  }, []);

  if (enabled) return null;

  return (
    <div
      className="border px-4 py-3 mb-6 flex items-center gap-3"
      style={{ borderColor: "var(--color-rule-gold)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
          Don&apos;t miss the call
        </p>
        <p
          className="font-display italic mt-0.5"
          style={{ color: "var(--color-navy)", fontSize: "13px", lineHeight: 1.3 }}
        >
          Turn on a sound for when Claire says it&apos;s time to move.
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await primeAlerts();
          setEnabled(true);
        }}
        className="label text-[9px] px-3 py-2 shrink-0"
        style={{
          background: "var(--color-navy)",
          color: "var(--color-paper)",
          minHeight: "40px",
        }}
      >
        Enable alerts
      </button>
    </div>
  );
}
