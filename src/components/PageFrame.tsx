import { ReactNode } from "react";
import { AdminBadge } from "./AdminBadge";
import { Ink } from "./Ink";

type PageFrameProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  sectionMark?: string; // e.g. "II"
  children: ReactNode;
};

/**
 * Editorial page header in the RL Mag language.
 * Hairline rules above and below the masthead. Tracked eyebrow.
 * Big Playfair title. Italic subtitle.
 */
export function PageFrame({
  eyebrow,
  title,
  subtitle,
  sectionMark,
  children,
}: PageFrameProps) {
  return (
    <article className="mx-auto max-w-[640px]">
      <header className="px-6 pt-10 pb-2">
        <div className="flex items-center justify-between min-h-[16px]">
          <span
            className="text-[9px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-ink)", opacity: 0.55 }}
          >
            {sectionMark ? `Section · ${sectionMark}` : "Grace & Mark"}
          </span>
          <AdminBadge />
        </div>
        <div className="rule mt-3" />
      </header>

      <Ink delay={0.05}>
        <div className="px-6 pt-10 pb-8 text-center">
          {eyebrow && (
            <p
              className="text-[10px] uppercase tracking-eyebrow font-medium"
              style={{ color: "var(--color-ink)", opacity: 0.6 }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="font-display mt-4"
            style={{
              fontSize: "clamp(40px, 10vw, 64px)",
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              fontWeight: 500,
              color: "var(--color-ink)",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="font-display italic mt-4 mx-auto"
              style={{
                color: "var(--color-ink)",
                opacity: 0.7,
                fontSize: "16px",
                maxWidth: "40ch",
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
          <div className="rule-gold mt-7 mx-auto w-10" />
        </div>
      </Ink>

      <Ink delay={0.2}>
        <div className="px-6 pb-8">{children}</div>
      </Ink>
    </article>
  );
}
