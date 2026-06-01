"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HEN_DATE, WEDDING_DATE, countdownParts } from "@/lib/dates";
import { supabase } from "@/lib/supabase";

type Stop = {
  id: string;
  position: number;
  time_label: string;
  title: string;
  venue: string | null;
  status: "planned" | "here" | "done" | "skipped";
};

type Phase =
  | { kind: "pre"; daysOut: number }
  | { kind: "soon"; hoursOut: number; minutesOut: number }
  | { kind: "live-here"; stop: Stop }
  | { kind: "live-between"; next: Stop | null }
  | { kind: "wrapped"; daysToReveal: number }
  | { kind: "post-wedding" };

export function LiveTonightBanner() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [activeHens, setActiveHens] = useState<number>(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const [stopsRes, locsRes] = await Promise.all([
        sb
          .from("stops")
          .select("id, position, time_label, title, venue, status")
          .order("position"),
        sb.from("locations").select("guest_id"),
      ]);
      if (cancelled) return;
      if (stopsRes.data) setStops(stopsRes.data as Stop[]);
      if (locsRes.data) setActiveHens(locsRes.data.length);
    };
    load();

    const channel = sb
      .channel("live-banner")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stops" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  const phase = useMemo<Phase>(() => derivePhase(now, stops), [now, stops]);

  return (
    <div
      className="sticky top-0 z-40 border-b"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-rule)",
      }}
    >
      <Link
        href="/itinerary"
        className="block px-5 py-2.5 max-w-[640px] mx-auto"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PhaseDot phase={phase} />
            <span
              className="text-[9px] uppercase tracking-eyebrow font-medium shrink-0"
              style={{ color: "var(--color-gold)" }}
            >
              {phaseLabel(phase)}
            </span>
            <span
              className="font-display italic truncate"
              style={{
                color: "var(--color-ink)",
                fontSize: "14px",
                letterSpacing: "-0.005em",
              }}
            >
              {phaseText(phase, activeHens)}
            </span>
          </div>
          <span
            className="text-[9px] uppercase tracking-eyebrow font-medium shrink-0"
            style={{ color: "var(--color-ink)", opacity: 0.55 }}
            aria-hidden
          >
            View ›
          </span>
        </div>
      </Link>
    </div>
  );
}

function PhaseDot({ phase }: { phase: Phase }) {
  const isLive = phase.kind.startsWith("live");
  return (
    <span className="relative flex items-center justify-center w-2 h-2">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{
          background: isLive ? "#5fa363" : "var(--color-gold)",
          borderRadius: "9999px",
        }}
      />
      {isLive && (
        <span
          className="absolute inset-0 animate-ping"
          style={{
            background: "rgba(95, 163, 99, 0.55)",
            borderRadius: "9999px",
          }}
        />
      )}
    </span>
  );
}

function phaseLabel(phase: Phase): string {
  switch (phase.kind) {
    case "pre":
      return "T-Minus";
    case "soon":
      return "Tonight";
    case "live-here":
      return "Now";
    case "live-between":
      return "Next";
    case "wrapped":
      return "Sealed";
    case "post-wedding":
      return "Mrs Brennan";
  }
}

function phaseText(phase: Phase, activeHens: number): string {
  switch (phase.kind) {
    case "pre":
      return `${phase.daysOut} ${phase.daysOut === 1 ? "day" : "days"} until lift-off`;
    case "soon":
      return `starts in ${phase.hoursOut}h ${phase.minutesOut}m`;
    case "live-here":
      return `${phase.stop.venue?.split(" · ")[0] ?? phase.stop.title}${
        activeHens > 0 ? ` · ${activeHens} on map` : ""
      }`;
    case "live-between":
      return phase.next
        ? `${phase.next.venue?.split(" · ")[0] ?? phase.next.title} · ${phase.next.time_label}`
        : "the after-party";
    case "wrapped":
      return `Photos develop in ${phase.daysToReveal} ${phase.daysToReveal === 1 ? "day" : "days"}`;
    case "post-wedding":
      return "11 July 2026";
  }
}

function derivePhase(now: Date, stops: Stop[]): Phase {
  const ms = HEN_DATE.getTime() - now.getTime();

  if (ms <= 0) {
    const wedMs = WEDDING_DATE.getTime() - now.getTime();
    if (wedMs <= 0) return { kind: "post-wedding" };

    const here = stops.find((s) => s.status === "here");
    if (here) return { kind: "live-here", stop: here };

    const elapsedH = -ms / (60 * 60 * 1000);
    if (elapsedH < 14 && stops.length > 0) {
      const next = stops.find((s) => s.status === "planned") ?? null;
      return { kind: "live-between", next };
    }

    const daysToReveal = Math.ceil(wedMs / (24 * 60 * 60 * 1000));
    return { kind: "wrapped", daysToReveal };
  }

  const cd = countdownParts(HEN_DATE, now);
  if (cd.days === 0) {
    return { kind: "soon", hoursOut: cd.hours, minutesOut: cd.minutes };
  }
  return { kind: "pre", daysOut: cd.days };
}
