"use client";

import Link from "next/link";
import { useGuest } from "@/components/GuestProvider";
import { useNightMode, type NightModeSetting } from "@/components/NightMode";
import { Ink } from "@/components/Ink";

const SECTIONS: { n: string; title: string; sub: string; href: string }[] = [
  { n: "I", title: "Lunch", sub: "Pre-order your courses", href: "/lunch" },
  { n: "II", title: "The Hens", sub: "The full roll call", href: "/guests" },
  { n: "III", title: "Voice Notes", sub: "A favourite memory of Grace", href: "/memories" },
  { n: "IV", title: "The Salon", sub: "Mr & Mrs · Guess Who", href: "/games" },
  { n: "V", title: "The Ballot", sub: "Every question of the night", href: "/polls" },
  { n: "VI", title: "The Map", sub: "Find your squad", href: "/map" },
  { n: "VII", title: "Essentials", sub: "Dress · contacts · taxis · lost?", href: "/essentials" },
];

export default function MorePage() {
  const { guest, isAdmin } = useGuest();
  const { setting, active, setSetting } = useNightMode();

  return (
    <article className="mx-auto max-w-[640px] px-6">
      <header className="pt-8 pb-2">
        <div className="flex items-baseline justify-between">
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(34px, 8vw, 44px)",
              letterSpacing: "-0.03em",
              color: "var(--color-navy)",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            More
          </h1>
          {guest && (
            <span
              className="label text-[9px]"
              style={{ color: "var(--color-navy)", opacity: 0.55 }}
            >
              {guest.display_name}
            </span>
          )}
        </div>
        <div className="rule mt-5" />
      </header>

      <Ink delay={0.05}>
        <ol>
          {SECTIONS.map((s, i) => (
            <li
              key={s.href}
              className={i === 0 ? "" : "border-t"}
              style={{ borderColor: "var(--color-rule)" }}
            >
              <Link href={s.href} className="flex items-baseline gap-5 py-6 group">
                <span
                  className="font-display italic tabular-nums w-8 shrink-0"
                  style={{ color: "var(--color-gold)", fontSize: "13px" }}
                >
                  {s.n}.
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.02em",
                      color: "var(--color-navy)",
                      fontWeight: 500,
                      lineHeight: 1.05,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    className="label text-[9px] mt-1.5"
                    style={{ color: "var(--color-navy)", opacity: 0.5 }}
                  >
                    {s.sub}
                  </div>
                </div>
                <span
                  className="font-display italic shrink-0 transition-transform group-hover:translate-x-1"
                  style={{ color: "var(--color-navy)", opacity: 0.4, fontSize: "20px" }}
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </li>
          ))}
          {isAdmin && (
            <li className="border-t" style={{ borderColor: "var(--color-rule)" }}>
              <Link href="/admin" className="flex items-baseline gap-5 py-6 group">
                <span
                  className="font-display italic tabular-nums w-8 shrink-0"
                  style={{ color: "var(--color-gold)", fontSize: "13px" }}
                >
                  VIII.
                </span>
                <div className="flex-1">
                  <div
                    className="font-display"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.02em",
                      color: "var(--color-navy)",
                      fontWeight: 500,
                      lineHeight: 1.05,
                    }}
                  >
                    The Concierge
                  </div>
                  <div
                    className="label text-[9px] mt-1.5"
                    style={{ color: "var(--color-gold)" }}
                  >
                    Run the night · admin
                  </div>
                </div>
                <span
                  className="font-display italic shrink-0"
                  style={{ color: "var(--color-navy)", opacity: 0.4, fontSize: "20px" }}
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </li>
          )}
        </ol>
      </Ink>

      {/* Add to home screen */}
      <Ink delay={0.1}>
        <section className="border-t py-8" style={{ borderColor: "var(--color-rule)" }}>
          <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
            Add to Home Screen
          </p>
          <p
            className="font-display italic mt-2"
            style={{ color: "var(--color-navy)", opacity: 0.65, fontSize: "14px" }}
          >
            Pop it on your phone like an app — and get the alerts.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-install-guide"))}
            className="mt-4 w-full label text-[10px] py-3.5 border"
            style={{ borderColor: "var(--color-navy)", color: "var(--color-navy)", minHeight: "48px" }}
          >
            Show me how
          </button>
        </section>
      </Ink>

      {/* Night mode */}
      <Ink delay={0.12}>
        <section className="border-t py-8" style={{ borderColor: "var(--color-rule)" }}>
          <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
            Night Mode {active ? "· On" : ""}
          </p>
          <p
            className="font-display italic mt-2"
            style={{ color: "var(--color-navy)", opacity: 0.65, fontSize: "14px" }}
          >
            Dark screens for dark bars. Auto switches on at 4pm on the 27th.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["auto", "on", "off"] as NightModeSetting[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSetting(mode)}
                className="label text-[10px] py-3.5 border"
                style={{
                  borderColor:
                    setting === mode ? "var(--color-gold)" : "var(--color-rule)",
                  background:
                    setting === mode ? "rgba(197, 160, 89, 0.12)" : "transparent",
                  color: "var(--color-navy)",
                  minHeight: "48px",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>
      </Ink>

      {/* Account */}
      <Ink delay={0.18}>
        <section
          className="border-t py-8 pb-14 flex items-center justify-between"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <div>
            <p className="label text-[10px]" style={{ color: "var(--color-navy)", opacity: 0.55 }}>
              Signed in as
            </p>
            <p
              className="font-display mt-1"
              style={{ color: "var(--color-navy)", fontSize: "20px" }}
            >
              {guest?.display_name ?? "—"}
            </p>
          </div>
          <Link
            href="/logout"
            className="label text-[9px] px-5 py-3.5 border"
            style={{
              borderColor: "var(--color-rule)",
              color: "var(--color-navy)",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Sign out
          </Link>
        </section>
      </Ink>
    </article>
  );
}
