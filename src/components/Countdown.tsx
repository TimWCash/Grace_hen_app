"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/dates";

type CountdownProps = {
  target: Date;
  label?: string;
};

export function Countdown({ target, label }: CountdownProps) {
  const [parts, setParts] = useState(() => countdownParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells = [
    { value: parts.days, label: "Days" },
    { value: parts.hours, label: "Hours" },
    { value: parts.minutes, label: "Min" },
    { value: parts.seconds, label: "Sec" },
  ];

  return (
    <div className="w-full">
      {label && (
        <p
          className="text-center text-[10px] uppercase tracking-[0.4em] mb-3"
          style={{ color: "var(--color-gold)" }}
        >
          {label}
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-md border px-2 py-3 text-center"
            style={{
              background: "rgba(245, 239, 224, 0.5)",
              borderColor: "var(--color-rule)",
            }}
          >
            <div
              className="font-display text-3xl leading-none tabular-nums"
              style={{ color: "var(--color-navy)" }}
            >
              {String(c.value).padStart(2, "0")}
            </div>
            <div
              className="text-[9px] uppercase tracking-[0.2em] mt-1.5"
              style={{ color: "var(--color-navy)", opacity: 0.7 }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
