"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { pickMissionForDate } from "@/lib/missions";

/**
 * Mission of the day: Fiona can override via a `mission` broadcast
 * from /admin; otherwise falls back to the deterministic daily pick.
 * Degrades silently if the broadcasts table doesn't exist yet.
 */
export function useMissionOfTheDay(): string {
  const [override, setOverride] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const load = async () => {
      const { data, error } = await sb
        .from("broadcasts")
        .select("payload, created_at")
        .eq("kind", "mission")
        .gte("created_at", startOfDay.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled || error || !data?.length) return;
      const text = (data[0].payload as { text?: string })?.text;
      if (text) setOverride(text);
    };
    load();

    const channel = sb
      .channel("mission-override")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload) => {
          const row = payload.new as {
            kind: string;
            payload: { text?: string };
          };
          if (row.kind === "mission" && row.payload?.text) {
            setOverride(row.payload.text);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  return override ?? pickMissionForDate(new Date());
}

/** Standalone mission block used on /tonight. */
export function MissionBlock() {
  const mission = useMissionOfTheDay();
  return (
    <div>
      <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
        Mission of the Day
      </p>
      <p
        className="font-display italic mt-3"
        style={{
          color: "var(--color-navy)",
          fontSize: "clamp(22px, 5vw, 28px)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          maxWidth: "30ch",
        }}
      >
        {mission}
      </p>
    </div>
  );
}
