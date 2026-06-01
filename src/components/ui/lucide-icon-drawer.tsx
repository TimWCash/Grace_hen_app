"use client";

import { animate, svg } from "animejs";
import { useEffect, useId, useRef } from "react";

type Options = {
  /** Loop the draw back-and-forth indefinitely. Default true. */
  loop?: boolean;
  /** Reverse direction on each loop (only relevant when loop=true). Default true. */
  alternate?: boolean;
  /** Animation duration in ms. Default 1000. */
  duration?: number;
  /** Easing. Default "inOutQuad". */
  ease?: string;
};

/**
 * Animates the strokes of any SVG icons inside the returned ref so they
 * appear to draw themselves in. Designed for Lucide icons but works on any
 * inline SVG with stroked paths.
 *
 * Scopes the animation class to this hook instance so multiple uses on the
 * same page don't trigger each other.
 */
export function useLucideDrawerAnimation<
  T extends HTMLElement = HTMLDivElement,
>(options: Options = {}) {
  const {
    loop = true,
    alternate = true,
    duration = 1000,
    ease = "inOutQuad",
  } = options;
  const ref = useRef<T | null>(null);
  const uid = useId();
  const cls = `line-${uid.replace(/[:«»]/g, "")}`;

  useEffect(() => {
    if (!ref.current) return;
    const elements = ref.current.querySelectorAll(
      "svg path, svg circle, svg polyline, svg line, svg polygon, svg rect",
    );
    if (elements.length === 0) return;
    elements.forEach((el) => el.classList.add(cls));

    const drawable = svg.createDrawable(`.${cls}`);
    animate(drawable, {
      draw: ["0 0.05", "0.05 1"],
      ease,
      duration,
      loop,
      alternate,
    });
  }, [cls, loop, alternate, duration, ease]);

  return ref;
}
