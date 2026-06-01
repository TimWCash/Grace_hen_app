"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type InkProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
};

/**
 * Slow fade-in, no slide. Mimics ink developing on paper.
 * Honors prefers-reduced-motion.
 */
export function Ink({
  children,
  delay = 0,
  duration = 1.4,
  className,
}: InkProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{
        duration,
        delay,
        ease: [0.22, 0.61, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
