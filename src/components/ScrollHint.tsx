"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export function ScrollHint() {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40) setShown(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!shown) return null;

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" })
      }
      className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 transition-opacity"
      style={{ color: "var(--color-navy)", opacity: 0.55 }}
      aria-label="Scroll for more"
    >
      <span className="text-[8px] uppercase tracking-[0.45em] font-display italic">
        Scroll
      </span>
      <ChevronDown
        size={16}
        strokeWidth={1.2}
        className="animate-bounce"
        style={{ color: "var(--color-gold)" }}
      />
    </button>
  );
}
