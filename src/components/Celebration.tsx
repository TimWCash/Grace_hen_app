"use client";

import { useEffect, useState } from "react";
import { CELEBRATE_EVENT } from "@/lib/celebrate";

type Piece = {
  kind: "mark" | "gold" | "navy" | "chalk";
  x: number; // start left, %
  drift: number; // horizontal drift, px
  spin: number; // total rotation, deg
  dur: number; // seconds
  delay: number; // seconds
  size: number; // px
  square: boolean;
};

const COLORS: Record<"gold" | "navy" | "chalk", string> = {
  gold: "#C5A059",
  navy: "#002344",
  chalk: "#F5F5F5",
};

let _seq = 0;

function buildPieces(): Piece[] {
  const r = (min: number, max: number) => min + Math.random() * (max - min);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return Array.from({ length: 40 }).map((_, i) => {
    // ~1 in 4 pieces is a tumbling Mark head; the rest are brand confetti.
    const isMark = i % 4 === 0;
    const kind: Piece["kind"] = isMark ? "mark" : pick(["gold", "navy", "chalk"] as const);
    return {
      kind,
      x: r(2, 98),
      drift: r(-90, 90),
      spin: r(360, 1080) * (Math.random() < 0.5 ? -1 : 1),
      dur: r(1.7, 2.6),
      delay: r(0, 0.45),
      size: isMark ? r(30, 46) : r(7, 14),
      square: Math.random() < 0.5,
    };
  });
}

/** Mounted once in the layout; renders a confetti burst whenever celebrate() fires. */
export function Celebration() {
  const [burst, setBurst] = useState<{ id: number; pieces: Piece[] } | null>(null);

  useEffect(() => {
    const onFire = () => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return; // honour reduced-motion — no flying confetti
      const id = ++_seq;
      setBurst({ id, pieces: buildPieces() });
      try {
        navigator.vibrate?.([0, 25, 35, 25]);
      } catch {}
      setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), 3200);
    };
    window.addEventListener(CELEBRATE_EVENT, onFire);
    return () => window.removeEventListener(CELEBRATE_EVENT, onFire);
  }, []);

  if (!burst) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[120] overflow-hidden" aria-hidden>
      {burst.pieces.map((p, i) => (
        <span
          key={`${burst.id}-${i}`}
          className="confetti-piece"
          style={
            {
              "--x": `${p.x}%`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            } as React.CSSProperties
          }
        >
          {p.kind === "mark" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/photos/mark-angel.jpg"
              alt=""
              className="w-full h-full object-cover rounded-full"
              style={{ objectPosition: "center 22%", border: "1px solid #C5A059" }}
              draggable={false}
            />
          ) : (
            <span
              className="block w-full h-full"
              style={{
                background: COLORS[p.kind],
                borderRadius: p.square ? "1px" : "50%",
                opacity: p.kind === "chalk" ? 0.95 : 1,
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
