"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pickMissionForDate } from "@/lib/missions";
import { HEN_DATE } from "@/lib/dates";

type Stop = {
  id: string;
  position: number;
  time_label: string;
  title: string;
  venue: string | null;
  status: "planned" | "here" | "done" | "skipped";
};

type Weather = {
  temp: number;
  code: number;
};

export function DailyBriefing() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [now] = useState(() => new Date());

  // Stops (just need first stop or current stop)
  useEffect(() => {
    const sb = supabase();
    let cancelled = false;
    sb.from("stops")
      .select("id, position, time_label, title, venue, status")
      .order("position", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setStops(data as Stop[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dublin weather (free, no API key)
  useEffect(() => {
    let cancelled = false;
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=53.3498&longitude=-6.2603&current=temperature_2m,weather_code&timezone=Europe%2FDublin",
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const c = data?.current;
        if (typeof c?.temperature_2m === "number" && typeof c?.weather_code === "number") {
          setWeather({ temp: c.temperature_2m, code: c.weather_code });
        }
      })
      .catch(() => {
        // Silent fail — briefing degrades to no weather rather than blocking.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mission = pickMissionForDate(now);
  const phase = derivePhase(now, stops);
  const dateLabel = now.toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section
      className="border-t border-b"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="mx-auto max-w-[640px] px-6 py-12">
        {/* Eyebrow */}
        <div className="flex items-baseline justify-between gap-4">
          <p
            className="text-[10px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-gold)" }}
          >
            Daily Briefing
          </p>
          <p
            className="text-[10px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-ink)", opacity: 0.55 }}
          >
            {dateLabel}
          </p>
        </div>

        <div className="rule mt-3" />

        {/* Weather + Plan row */}
        <div className="grid grid-cols-[auto_1px_1fr] gap-5 mt-6 items-start">
          <WeatherBlock weather={weather} />
          <span
            className="h-12 self-center"
            style={{ background: "var(--color-rule)", width: "0.5px" }}
          />
          <PhaseBlock phase={phase} />
        </div>

        <div className="rule mt-8" />

        {/* Mission */}
        <div className="mt-7">
          <p
            className="text-[10px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-gold)" }}
          >
            Mission of the Day
          </p>
          <p
            className="font-display italic mt-3"
            style={{
              color: "var(--color-ink)",
              fontSize: "clamp(22px, 5vw, 28px)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              maxWidth: "30ch",
            }}
          >
            {mission}
          </p>
        </div>
      </div>
    </section>
  );
}

function WeatherBlock({ weather }: { weather: Weather | null }) {
  const Icon = weather ? iconForCode(weather.code) : Cloud;
  return (
    <div className="flex items-center gap-3">
      <Icon
        size={32}
        strokeWidth={1.2}
        style={{ color: "var(--color-ink)", opacity: 0.85 }}
      />
      <div className="leading-tight">
        <div
          className="font-display tabular-nums"
          style={{
            color: "var(--color-ink)",
            fontSize: "30px",
            letterSpacing: "-0.02em",
          }}
        >
          {weather ? Math.round(weather.temp) : "—"}
          <span style={{ opacity: 0.4 }}>°</span>
        </div>
        <div
          className="text-[9px] uppercase tracking-eyebrow font-medium mt-0.5"
          style={{ color: "var(--color-ink)", opacity: 0.55 }}
        >
          Dublin
        </div>
      </div>
    </div>
  );
}

type Phase =
  | { kind: "pre"; daysOut: number; firstStop: Stop | null }
  | { kind: "today"; firstStop: Stop | null }
  | { kind: "live"; here: Stop | null; next: Stop | null }
  | { kind: "after" };

function PhaseBlock({ phase }: { phase: Phase }) {
  if (phase.kind === "pre") {
    return (
      <div>
        <p
          className="text-[9px] uppercase tracking-eyebrow font-medium"
          style={{ color: "var(--color-ink)", opacity: 0.55 }}
        >
          Hen weekend
        </p>
        <p
          className="font-display mt-1"
          style={{
            color: "var(--color-ink)",
            fontSize: "20px",
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
          }}
        >
          {phase.daysOut} {phase.daysOut === 1 ? "day" : "days"} out
        </p>
        {phase.firstStop && (
          <p
            className="font-display italic mt-1"
            style={{
              color: "var(--color-ink)",
              opacity: 0.65,
              fontSize: "13px",
            }}
          >
            Curtain up · {phase.firstStop.time_label} at{" "}
            {phase.firstStop.venue?.split(" · ")[0] ?? phase.firstStop.title}
          </p>
        )}
      </div>
    );
  }
  if (phase.kind === "today") {
    return (
      <div>
        <p
          className="text-[9px] uppercase tracking-eyebrow font-medium"
          style={{ color: "#5fa363" }}
        >
          Tonight
        </p>
        <p
          className="font-display mt-1"
          style={{
            color: "var(--color-ink)",
            fontSize: "20px",
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
          }}
        >
          Curtain up · {phase.firstStop?.time_label ?? "—"}
        </p>
        <p
          className="font-display italic mt-1"
          style={{
            color: "var(--color-ink)",
            opacity: 0.65,
            fontSize: "13px",
          }}
        >
          {phase.firstStop?.venue?.split(" · ")[0] ?? phase.firstStop?.title ?? ""}
        </p>
      </div>
    );
  }
  if (phase.kind === "live") {
    return (
      <div>
        <p
          className="text-[9px] uppercase tracking-eyebrow font-medium"
          style={{ color: "#5fa363" }}
        >
          {phase.here ? "Now" : "Next"}
        </p>
        <p
          className="font-display mt-1"
          style={{
            color: "var(--color-ink)",
            fontSize: "20px",
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
          }}
        >
          {(phase.here ?? phase.next)?.venue?.split(" · ")[0] ??
            (phase.here ?? phase.next)?.title ??
            "the after-party"}
        </p>
        {phase.here && phase.next && (
          <p
            className="font-display italic mt-1"
            style={{
              color: "var(--color-ink)",
              opacity: 0.65,
              fontSize: "13px",
            }}
          >
            Next · {phase.next.time_label} ·{" "}
            {phase.next.venue?.split(" · ")[0] ?? phase.next.title}
          </p>
        )}
      </div>
    );
  }
  return (
    <div>
      <p
        className="text-[9px] uppercase tracking-eyebrow font-medium"
        style={{ color: "var(--color-gold)" }}
      >
        Sealed
      </p>
      <p
        className="font-display mt-1"
        style={{
          color: "var(--color-ink)",
          fontSize: "20px",
          letterSpacing: "-0.015em",
          lineHeight: 1.15,
        }}
      >
        Develops 11 July
      </p>
    </div>
  );
}

function derivePhase(now: Date, stops: Stop[]): Phase {
  const henMs = HEN_DATE.getTime();
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const firstStop = stops[0] ?? null;

  if (nowMs < henMs - dayMs) {
    const daysOut = Math.ceil((henMs - nowMs) / dayMs);
    return { kind: "pre", daysOut, firstStop };
  }

  if (nowMs < henMs) {
    return { kind: "today", firstStop };
  }

  // Within ~14 hours of HEN_DATE start, treat as live.
  const elapsedH = (nowMs - henMs) / (60 * 60 * 1000);
  if (elapsedH < 14) {
    const here = stops.find((s) => s.status === "here") ?? null;
    const next = stops.find((s) => s.status === "planned") ?? null;
    return { kind: "live", here, next };
  }

  return { kind: "after" };
}

function iconForCode(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 86) return CloudRainWind;
  if (code >= 95 && code <= 99) return CloudLightning;
  return Cloud;
}
