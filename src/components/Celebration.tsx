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
  face: string; // which Mark photo (mark pieces only)
};

const COLORS: Record<"gold" | "navy" | "chalk", string> = {
  gold: "#C5A059",
  navy: "#002344",
  chalk: "#F5F5F5",
};

// Mark through the ages — a random one tumbles down per confetti "head".
// Drop the photos in /public/photos/mark/ as mark-1.jpg … mark-5.jpg; any
// that aren't there yet are simply skipped (onError), so this is safe early.
const MARK_FACES = [
  "/photos/mark/mark-1.jpg",
  "/photos/mark/mark-2.jpg",
  "/photos/mark/mark-3.jpg",
  "/photos/mark/mark-4.jpg",
  "/photos/mark/mark-5.jpg",
  "/photos/mark/mark-6.jpg",
  "/photos/mark/mark-7.jpg",
  "/photos/mark/mark-8.jpg",
  "/photos/mark/mark-9.jpg",
];

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
      drift: isMark ? r(-45, 45) : r(-80, 80),
      // Faces barely rotate so you can actually see it's Mark; bits spin freely.
      spin: isMark ? r(-18, 18) : r(360, 900) * (Math.random() < 0.5 ? -1 : 1),
      // Faces fall slower and are bigger; confetti is a touch calmer too.
      dur: isMark ? r(3.8, 5.2) : r(2.8, 3.8),
      delay: r(0, 0.6),
      size: isMark ? r(48, 70) : r(7, 14),
      square: Math.random() < 0.5,
      face: pick(MARK_FACES),
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
      setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), 6500);
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
              src={p.face}
              alt=""
              className="w-full h-full object-cover rounded-full"
              style={{
                objectPosition: "center 42%",
                border: "1.5px solid #C5A059",
                boxShadow: "0 1px 4px rgba(0,20,40,0.18)",
              }}
              draggable={false}
              onError={(e) => {
                // Photo not added yet → hide this head rather than show a broken tile.
                const span = e.currentTarget.parentElement;
                if (span) span.style.display = "none";
              }}
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
