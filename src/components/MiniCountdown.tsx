"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/dates";

export function MiniCountdownClient({ target }: { target: Date }) {
  const [parts, setParts] = useState(() => countdownParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(target)), 30_000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="inline-flex items-baseline gap-3">
      <span
        className="font-display tabular-nums"
        style={{
          color: "var(--color-ink)",
          fontSize: "44px",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {parts.days}
      </span>
      <span
        className="text-[9px] uppercase tracking-eyebrow font-medium"
        style={{ color: "var(--color-ink)", opacity: 0.55 }}
      >
        {parts.days === 1 ? "Day" : "Days"}
      </span>
    </div>
  );
}
