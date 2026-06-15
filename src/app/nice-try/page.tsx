import Link from "next/link";

export default function NiceTryPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-paper)" }}
    >
      <div className="w-full max-w-[420px] text-center">
        <p
          className="text-[10px] uppercase tracking-eyebrow font-medium"
          style={{ color: "var(--color-gold)" }}
        >
          Access Denied
        </p>
        <div className="rule mt-3" />
        <h1
          className="font-display mt-12"
          style={{
            fontSize: "clamp(56px, 16vw, 96px)",
            lineHeight: 0.88,
            letterSpacing: "-0.04em",
            color: "var(--color-ink)",
            fontWeight: 500,
          }}
        >
          Nice Try.
        </h1>
        <p
          className="font-display italic mt-8 mx-auto"
          style={{
            color: "var(--color-ink)",
            opacity: 0.75,
            fontSize: "16px",
            lineHeight: 1.55,
            maxWidth: "32ch",
          }}
        >
          This party is by invitation only. If you should be on the list, ask
          Claire — the rest of you may show yourselves out.
        </p>
        <div className="rule-gold mt-10 mx-auto w-10" />
        <Link
          href="/"
          className="mt-10 inline-block text-[10px] uppercase tracking-eyebrow font-medium underline decoration-[0.5px] underline-offset-4"
          style={{ color: "var(--color-ink)", opacity: 0.6 }}
        >
          Try again
        </Link>
      </div>
    </div>
  );
}
