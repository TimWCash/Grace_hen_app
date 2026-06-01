"use client";

import { Sparkles, Martini } from "lucide-react";
import { useLucideDrawerAnimation } from "@/components/ui/lucide-icon-drawer";

type FlourishProps = {
  className?: string;
};

export function Flourish({ className = "" }: FlourishProps) {
  const ref = useLucideDrawerAnimation<HTMLDivElement>({
    duration: 1800,
    loop: true,
    alternate: true,
    ease: "inOutQuad",
  });

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center gap-5 ${className}`}
      style={{ color: "var(--color-gold)" }}
      aria-hidden
    >
      <Sparkles
        size={18}
        strokeWidth={1}
        fill="none"
        style={{ opacity: 0.7 }}
      />
      <Martini
        size={26}
        strokeWidth={1}
        fill="none"
      />
      <Sparkles
        size={18}
        strokeWidth={1}
        fill="none"
        style={{ opacity: 0.7 }}
      />
    </div>
  );
}
