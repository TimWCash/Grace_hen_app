import { HenHeroCountdown } from "@/components/HenHeroCountdown";
import { Ink } from "@/components/Ink";
import { HEN_DATE, WEDDING_DATE } from "@/lib/dates";
import { MiniCountdownClient } from "@/components/MiniCountdown";
import { DailyBriefing } from "@/components/DailyBriefing";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <article>
      {/* ─── SPREAD 01: HERO — GRACE ──────────────────────────────────── */}
      <section className="relative">
        <Ink delay={0.1} duration={1.8}>
          <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-black">
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src="/photos/grace-dancer.mp4"
              poster="/photos/grace-dancer.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Grace, in the dance studio"
            />
            {/* Overlay credit, top-right, magazine style */}
            <div className="absolute top-5 right-5">
              <p
                className="text-[8.5px] uppercase tracking-eyebrow font-medium text-right"
                style={{ color: "rgba(248, 245, 238, 0.85)" }}
              >
                Summer 2026
              </p>
            </div>
            <div className="absolute bottom-5 left-5">
              <p
                className="text-[8.5px] uppercase tracking-eyebrow font-medium"
                style={{ color: "rgba(248, 245, 238, 0.85)" }}
              >
                Grace · the dance studio
              </p>
            </div>
          </div>
        </Ink>
      </section>

      {/* ─── SPREAD 02: TITLE BLOCK ───────────────────────────────────── */}
      <section className="mx-auto max-w-[640px] px-6 pt-16 pb-20 text-center">
        <Ink delay={0.15}>
          <p
            className="font-display italic"
            style={{
              color: "var(--color-ink)",
              opacity: 0.7,
              fontSize: "18px",
            }}
          >
            Dublin, 27 June 2026
          </p>
        </Ink>

        <Ink delay={0.3}>
          <h1
            className="font-display mt-5"
            style={{
              fontSize: "clamp(84px, 22vw, 168px)",
              lineHeight: 0.84,
              letterSpacing: "-0.045em",
              fontWeight: 500,
              color: "var(--color-ink)",
            }}
          >
            GRACE
          </h1>
        </Ink>

        <Ink delay={0.45}>
          <p
            className="mt-6 text-[10px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-ink)", opacity: 0.65 }}
          >
            The Hen Weekend
          </p>
        </Ink>

        <Ink delay={0.6}>
          <div className="rule-gold mx-auto mt-7 w-10" />
        </Ink>

        <Ink delay={0.75}>
          <HenHeroCountdown target={HEN_DATE} />
        </Ink>
      </section>

      {/* ─── DAILY BRIEFING ───────────────────────────────────────────── */}
      <DailyBriefing />

      {/* ─── SPREAD 03: A NOTE ────────────────────────────────────────── */}
      <section
        className="border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="mx-auto max-w-[640px] px-6 py-20">
          <Ink delay={0.1}>
            <p
              className="label text-[10px] text-center"
              style={{ color: "var(--color-gold)" }}
            >
              From the Concierge
            </p>
          </Ink>
          <Ink delay={0.18}>
            <div className="rule-gold mx-auto mt-3 w-8" />
          </Ink>
          <Ink delay={0.28}>
            <h2
              className="font-display mt-10 mx-auto text-center"
              style={{
                fontSize: "clamp(36px, 8vw, 56px)",
                lineHeight: 0.96,
                letterSpacing: "-0.03em",
                fontWeight: 500,
                color: "var(--color-ink)",
                maxWidth: "16ch",
              }}
            >
              Six bars, one bride.
            </h2>
          </Ink>
          <Ink delay={0.42}>
            <p
              className="font-display italic mt-8 mx-auto text-center"
              style={{
                color: "var(--color-ink)",
                opacity: 0.75,
                fontSize: "18px",
                lineHeight: 1.55,
                maxWidth: "36ch",
              }}
            >
              One Dublin evening before her name changes. Cocktails poured in
              every room we know how to find. Photographs sealed and not yet
              developed. We are toasting her — louder than is decent.
            </p>
          </Ink>
        </div>
      </section>

      {/* ─── SPREAD 04: MARK ──────────────────────────────────────────── */}
      <section
        className="border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <Ink delay={0.1} duration={1.6}>
          <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-black">
            <Image
              src="/photos/mark-angel.jpg"
              alt="Mark Brennan"
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              style={{ objectFit: "cover", objectPosition: "center top" }}
            />
            <div className="absolute top-5 right-5">
              <p
                className="text-[8.5px] uppercase tracking-eyebrow font-medium text-right"
                style={{ color: "rgba(248, 245, 238, 0.85)" }}
              >
                The Groom
              </p>
            </div>
            <div className="absolute bottom-5 left-5">
              <p
                className="text-[8.5px] uppercase tracking-eyebrow font-medium"
                style={{ color: "rgba(248, 245, 238, 0.85)" }}
              >
                Mark Brennan
              </p>
            </div>
          </div>
        </Ink>

        <div className="mx-auto max-w-[640px] px-6 pt-14 pb-20 text-center">
          <Ink delay={0.2}>
            <p
              className="font-display italic"
              style={{
                color: "var(--color-ink)",
                opacity: 0.7,
                fontSize: "18px",
              }}
            >
              And the man she's promised to —
            </p>
          </Ink>
          <Ink delay={0.35}>
            <h2
              className="font-display mt-5"
              style={{
                fontSize: "clamp(84px, 22vw, 168px)",
                lineHeight: 0.84,
                letterSpacing: "-0.045em",
                fontWeight: 500,
                color: "var(--color-ink)",
              }}
            >
              MARK
            </h2>
          </Ink>
          <Ink delay={0.5}>
            <p
              className="mt-6 text-[10px] uppercase tracking-eyebrow font-medium"
              style={{ color: "var(--color-ink)", opacity: 0.65 }}
            >
              Not Invited · By Design
            </p>
          </Ink>
          <Ink delay={0.62}>
            <div className="rule-gold mx-auto mt-7 w-10" />
          </Ink>
          <Ink delay={0.72}>
            <p
              className="font-display italic mt-7 mx-auto"
              style={{
                color: "var(--color-ink)",
                opacity: 0.75,
                fontSize: "16px",
                lineHeight: 1.55,
                maxWidth: "32ch",
              }}
            >
              He's the reason for the weekend, and the reason he can't be at
              it. We'll judge him at length over martinis.
            </p>
          </Ink>
        </div>
      </section>

      {/* ─── SPREAD 05: THE PROGRAMME (TOC) ───────────────────────────── */}
      <section
        className="border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="mx-auto max-w-[640px] px-6 py-20">
          <Ink delay={0.1}>
            <p
              className="text-[10px] uppercase tracking-eyebrow font-medium text-center"
              style={{ color: "var(--color-gold)" }}
            >
              Contents
            </p>
          </Ink>
          <Ink delay={0.18}>
            <div className="rule mt-3 mb-10" />
          </Ink>

          <ol className="space-y-0">
            <TocLine n="I" title="The Program" sub="Six bars · the route" href="/itinerary" />
            <TocLine n="II" title="Find My Squad" sub="Where everyone is, all night" href="/map" />
            <TocLine n="III" title="The Trophy Room" sub="Develops 11 July" href="/photos" />
            <TocLine n="IV" title="The Hens" sub="Twelve women, one bride" href="/guests" />
            <TocLine n="V" title="The Salon" sub="Mr & Mrs · house games" href="/games" />
            <TocLine n="VI" title="The Ballot" sub="Decide the next stop" href="/polls" />
            <TocLine n="VII" title="The Concierge" sub="For the Maid of Honour" href="/settings" last />
          </ol>
        </div>
      </section>

      {/* ─── SPREAD 06: AND THEN, THE WEDDING ─────────────────────────── */}
      <section
        className="border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="mx-auto max-w-[640px] px-6 py-20 text-center">
          <Ink delay={0.1}>
            <p
              className="text-[10px] uppercase tracking-eyebrow font-medium"
              style={{ color: "var(--color-gold)" }}
            >
              And Then
            </p>
          </Ink>
          <Ink delay={0.2}>
            <h2
              className="font-display mt-4"
              style={{
                fontSize: "clamp(46px, 11vw, 84px)",
                lineHeight: 0.94,
                letterSpacing: "-0.035em",
                fontWeight: 500,
                color: "var(--color-ink)",
              }}
            >
              The Wedding
            </h2>
          </Ink>
          <Ink delay={0.32}>
            <p
              className="font-display italic mt-4"
              style={{ color: "var(--color-ink)", opacity: 0.65, fontSize: "18px" }}
            >
              11 July 2026
            </p>
          </Ink>
          <Ink delay={0.45}>
            <div className="mt-8 inline-block">
              <MiniCountdownClient target={WEDDING_DATE} />
            </div>
          </Ink>
        </div>
      </section>

      {/* ─── COLOPHON ─────────────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-14 text-center"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="rule-gold mx-auto w-10" />
        <p
          className="mt-6 text-[9px] uppercase tracking-eyebrow font-medium"
          style={{ color: "var(--color-ink)", opacity: 0.45 }}
        >
          Edited for Grace · Dublin · MMXXVI
        </p>
        <Link
          href="/settings"
          className="mt-3 inline-block text-[9px] uppercase tracking-eyebrow font-medium underline decoration-[0.5px] underline-offset-4"
          style={{ color: "var(--color-ink)", opacity: 0.4 }}
        >
          Concierge
        </Link>
      </footer>
    </article>
  );
}

function TocLine({
  n,
  title,
  sub,
  href,
  last = false,
}: {
  n: string;
  title: string;
  sub: string;
  href: string;
  last?: boolean;
}) {
  return (
    <li className={last ? "" : "border-b"} style={{ borderColor: "var(--color-rule)" }}>
      <Link href={href} className="flex items-baseline gap-5 py-6 group">
        <span
          className="font-display italic tabular-nums w-8 shrink-0"
          style={{ color: "var(--color-gold)", fontSize: "13px" }}
        >
          {n}.
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-display transition-colors"
            style={{
              fontSize: "30px",
              letterSpacing: "-0.02em",
              color: "var(--color-ink)",
              fontWeight: 500,
              lineHeight: 1.02,
            }}
          >
            {title}
          </div>
          <div
            className="text-[10px] uppercase tracking-wide-rl mt-1.5"
            style={{ color: "var(--color-ink)", opacity: 0.5 }}
          >
            {sub}
          </div>
        </div>
        <span
          className="font-display italic shrink-0 transition-transform group-hover:translate-x-1"
          style={{ color: "var(--color-ink)", opacity: 0.4, fontSize: "20px" }}
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}
