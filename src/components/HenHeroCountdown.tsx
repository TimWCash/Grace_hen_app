"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/dates";

export function HenHeroCountdown({ target }: { target: Date }) {
  const [parts, setParts] = useState(() => countdownParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: { value: number; label: string }[] = [
    { value: parts.days, label: "Days" },
    { value: parts.hours, label: "Hours" },
    { value: parts.minutes, label: "Minutes" },
  ];

  return (
    <div className="mt-10 flex justify-center">
      <div className="grid grid-cols-3 gap-0 max-w-[400px] w-full">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={`text-center px-3 ${i > 0 ? "border-l" : ""}`}
            style={{ borderColor: "var(--color-rule)" }}
          >
            <div
              className="font-display tabular-nums"
              style={{
                fontSize: "clamp(36px, 9vw, 56px)",
                lineHeight: 1,
                color: "var(--color-ink)",
                letterSpacing: "-0.03em",
                fontWeight: 400,
              }}
            >
              {String(c.value).padStart(2, "0")}
            </div>
            <div
              className="mt-2 text-[9px] uppercase tracking-eyebrow font-medium"
              style={{ color: "var(--color-ink)", opacity: 0.55 }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
