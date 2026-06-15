"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/components/GuestProvider";
import { MissionBlock } from "@/components/Mission";
import { AlertsPrimer } from "@/components/AlertsPrimer";
import { Ink } from "@/components/Ink";
import { HEN_DATE, countdownParts } from "@/lib/dates";

type Stop = {
  id: string;
  position: number;
  time_label: string;
  title: string;
  venue: string | null;
  status: "planned" | "here" | "done" | "skipped";
};

type Poll = { id: string; title: string; status: string; position: number };
type Option = { id: string; poll_id: string; position: number; label: string };
type Vote = { poll_id: string; guest_id: string; option_id: string };

type Note = {
  id: string;
  guest_id: string;
  message: string;
  created_at: string;
  display_name?: string;
};

/** Map a stop's "HH:MM" onto the hen date; hours < 6 roll past midnight. */
function stopDate(timeLabel: string): Date | null {
  const m = timeLabel.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const d = new Date(HEN_DATE);
  d.setHours(h, min, 0, 0);
  if (h < 6) d.setDate(d.getDate() + 1);
  return d;
}

export default function TonightPage() {
  const [now, setNow] = useState(() => new Date());
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;
    const load = async () => {
      const { data } = await sb
        .from("stops")
        .select("id, position, time_label, title, venue, status")
        .order("position");
      if (!cancelled && data) setStops(data as Stop[]);
    };
    load();
    const channel = sb
      .channel("tonight-stops")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stops" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  return (
    <article className="mx-auto max-w-[640px] px-6">
      {/* Compact header */}
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
            Tonight
          </h1>
          <span
            className="label text-[9px]"
            style={{ color: "var(--color-navy)", opacity: 0.55 }}
          >
            {now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        <div className="rule mt-5" />
      </header>

      <div className="pt-6">
        <AlertsPrimer />
      </div>

      <Ink delay={0.05}>
        <section className="pb-8">
          <NextUp now={now} stops={stops} />
        </section>
      </Ink>

      <div className="rule" />

      <Ink delay={0.12}>
        <section className="py-8">
          <MissionBlock />
        </section>
      </Ink>

      <div className="rule" />

      <Ink delay={0.18}>
        <section className="py-8">
          <InlineBallot />
        </section>
      </Ink>

      <div className="rule" />

      <Ink delay={0.24}>
        <section className="py-8">
          <div className="grid grid-cols-3 gap-3">
            <QuickAction href="/photos" label="Capture" />
            <QuickAction href="/map" label="The Map" />
            <QuickAction href="/itinerary" label="Program" />
          </div>
        </section>
      </Ink>

      <div className="rule" />

      <Ink delay={0.3}>
        <section className="py-8 pb-12">
          <FieldNotes />
        </section>
      </Ink>
    </article>
  );
}

/* ─── NEXT UP ─────────────────────────────────────────────────── */

function NextUp({ now, stops }: { now: Date; stops: Stop[] }) {
  const kickoff = HEN_DATE.getTime() - now.getTime();

  // Pre-event: kickoff countdown.
  if (kickoff > 0) {
    const cd = countdownParts(HEN_DATE, now);
    return (
      <div>
        <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
          Curtain Up
        </p>
        <div className="flex items-baseline gap-4 mt-3">
          <span
            className="font-display tabular-nums"
            style={{
              fontSize: "clamp(48px, 12vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "var(--color-navy)",
            }}
          >
            {cd.days}
          </span>
          <span
            className="label text-[10px]"
            style={{ color: "var(--color-navy)", opacity: 0.55 }}
          >
            {cd.days === 1 ? "day" : "days"}
          </span>
          <span
            className="mono tabular-nums"
            style={{ color: "var(--color-navy)", opacity: 0.65, fontSize: "16px" }}
          >
            {String(cd.hours).padStart(2, "0")}:{String(cd.minutes).padStart(2, "0")}:
            {String(cd.seconds).padStart(2, "0")}
          </span>
        </div>
        {stops[0] && (
          <p
            className="font-display italic mt-4"
            style={{ color: "var(--color-navy)", opacity: 0.65, fontSize: "15px" }}
          >
            First pour — {stops[0].venue?.split(" · ")[0] ?? stops[0].title} ·{" "}
            {stops[0].time_label}
          </p>
        )}
      </div>
    );
  }

  // The night: admin "here" wins; else derive from clock.
  const here =
    stops.find((s) => s.status === "here") ??
    [...stops]
      .reverse()
      .find((s) => {
        const d = stopDate(s.time_label);
        return d !== null && d <= now && s.status !== "skipped";
      }) ??
    null;

  const next =
    stops.find(
      (s) =>
        s.status === "planned" &&
        (here ? s.position > here.position : true) &&
        (stopDate(s.time_label)?.getTime() ?? 0) > now.getTime(),
    ) ?? stops.find((s) => s.status === "planned" && s !== here) ?? null;

  const nextAt = next ? stopDate(next.time_label) : null;
  const minsToNext = nextAt
    ? Math.max(0, Math.round((nextAt.getTime() - now.getTime()) / 60_000))
    : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="label text-[10px]" style={{ color: "#5fa363" }}>
            Now
          </p>
          <p
            className="font-display mt-2"
            style={{
              fontSize: "clamp(24px, 6vw, 32px)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "var(--color-navy)",
              fontWeight: 500,
            }}
          >
            {here ? here.venue?.split(" · ")[0] ?? here.title : "Assembling"}
          </p>
        </div>
        <div>
          <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
            Next
          </p>
          {next ? (
            <>
              <p
                className="font-display mt-2"
                style={{
                  fontSize: "clamp(24px, 6vw, 32px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.025em",
                  color: "var(--color-navy)",
                  fontWeight: 500,
                }}
              >
                {next.venue?.split(" · ")[0] ?? next.title}
              </p>
              <p
                className="mono mt-2 tabular-nums"
                style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px" }}
              >
                {minsToNext !== null && minsToNext > 0
                  ? `in ${minsToNext} min · ${next.time_label}`
                  : next.time_label}
              </p>
            </>
          ) : (
            <p
              className="font-display italic mt-2"
              style={{ color: "var(--color-navy)", opacity: 0.6, fontSize: "18px" }}
            >
              The taxi home.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── INLINE BALLOT ───────────────────────────────────────────── */

function InlineBallot() {
  const { guest } = useGuest();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const { data: polls } = await sb
        .from("polls")
        .select("*")
        .eq("status", "open")
        .order("position")
        .limit(1);
      if (cancelled) return;
      const p = (polls?.[0] as Poll) ?? null;
      setPoll(p);
      if (!p) return;
      const [optsRes, votesRes] = await Promise.all([
        sb.from("poll_options").select("*").eq("poll_id", p.id).order("position"),
        sb.from("poll_votes").select("*").eq("poll_id", p.id),
      ]);
      if (cancelled) return;
      if (optsRes.data) setOptions(optsRes.data as Option[]);
      if (votesRes.data) setVotes(votesRes.data as Vote[]);
    };
    load();

    const channel = sb
      .channel("tonight-ballot")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  if (!poll) {
    return (
      <div>
        <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
          The Ballot
        </p>
        <p
          className="font-display italic mt-3"
          style={{ color: "var(--color-navy)", opacity: 0.6, fontSize: "16px" }}
        >
          No question on the floor.
        </p>
      </div>
    );
  }

  const myPick = votes.find((v) => v.guest_id === guest?.id)?.option_id;
  const total = votes.length || 1;

  const cast = async (optionId: string) => {
    if (!guest) return;
    const sb = supabase();
    setVotes((prev) => [
      ...prev.filter((v) => v.guest_id !== guest.id),
      { poll_id: poll.id, guest_id: guest.id, option_id: optionId },
    ]);
    await sb
      .from("poll_votes")
      .upsert(
        { poll_id: poll.id, guest_id: guest.id, option_id: optionId },
        { onConflict: "poll_id,guest_id" },
      );
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
          The Ballot · Live
        </p>
        <Link
          href="/polls"
          className="label text-[9px] underline decoration-[0.5px] underline-offset-4"
          style={{ color: "var(--color-navy)", opacity: 0.55 }}
        >
          Full ballot
        </Link>
      </div>
      <h3
        className="font-display mt-3"
        style={{
          fontSize: "clamp(22px, 5vw, 28px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: "var(--color-navy)",
          fontWeight: 500,
        }}
      >
        {poll.title}
      </h3>
      <ul className="mt-5 space-y-2.5">
        {options.map((opt) => {
          const count = votes.filter((v) => v.option_id === opt.id).length;
          const pct = Math.round((count / total) * 100);
          const isPick = myPick === opt.id;
          const showBar = !!myPick;
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => cast(opt.id)}
                className="w-full text-left relative overflow-hidden border px-4 py-4"
                style={{
                  borderColor: isPick ? "var(--color-gold)" : "var(--color-rule)",
                  background: "transparent",
                  minHeight: "52px",
                }}
              >
                {showBar && (
                  <div
                    className="absolute inset-y-0 left-0 transition-all"
                    style={{
                      width: `${pct}%`,
                      background: isPick
                        ? "rgba(197, 160, 89, 0.18)"
                        : "var(--color-rule-soft)",
                    }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-3">
                  <span
                    className="font-display"
                    style={{ color: "var(--color-navy)", fontSize: "17px" }}
                  >
                    {opt.label}
                  </span>
                  {showBar && (
                    <span
                      className="mono tabular-nums"
                      style={{ color: "var(--color-navy)", fontSize: "13px" }}
                    >
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── QUICK ACTIONS ───────────────────────────────────────────── */

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center border py-6"
      style={{
        borderColor: "var(--color-rule)",
        minHeight: "64px",
      }}
    >
      <span className="label text-[10px]" style={{ color: "var(--color-navy)" }}>
        {label}
      </span>
    </Link>
  );
}

/* ─── FIELD NOTES ─────────────────────────────────────────────── */

function FieldNotes() {
  const { guest } = useGuest();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const { data, error } = await sb
        .from("field_notes")
        .select("id, guest_id, message, created_at, guests(display_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        setUnavailable(true);
        return;
      }
      setNotes(
        (data as unknown as (Note & { guests: { display_name: string } | null })[]).map(
          (n) => ({ ...n, display_name: n.guests?.display_name ?? "A hen" }),
        ),
      );
    };
    load();

    const channel = sb
      .channel("field-notes-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "field_notes" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  if (unavailable) return null;

  const send = async () => {
    const message = draft.trim();
    if (!message || !guest) return;
    setSending(true);
    const sb = supabase();
    const { error } = await sb
      .from("field_notes")
      .insert({ guest_id: guest.id, message });
    setSending(false);
    if (!error) {
      setDraft("");
      setNotes((prev) => [
        {
          id: `local-${Math.random()}`,
          guest_id: guest.id,
          message,
          created_at: new Date().toISOString(),
          display_name: guest.display_name,
        },
        ...(prev ?? []),
      ]);
    }
  };

  return (
    <div>
      <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
        Field Notes
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 280))}
          placeholder="Leave a note for the squad…"
          className="flex-1 border-b py-3 bg-transparent focus:outline-none font-display"
          style={{
            borderColor: "var(--color-rule)",
            color: "var(--color-navy)",
            fontSize: "16px",
          }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="label text-[9px] px-5 border disabled:opacity-40"
          style={{
            borderColor: "var(--color-navy)",
            color: "var(--color-navy)",
            minHeight: "44px",
          }}
        >
          Post
        </button>
      </form>

      <ul className="mt-6 space-y-4">
        {(notes ?? []).map((n) => (
          <li key={n.id} className="flex items-baseline gap-3">
            <span
              className="mono tabular-nums shrink-0"
              style={{ color: "var(--color-gold)", fontSize: "11px" }}
            >
              {new Date(n.created_at).toLocaleTimeString("en-IE", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
            <p style={{ fontSize: "14px", lineHeight: 1.5 }}>
              <span
                className="label text-[10px] mr-2"
                style={{ color: "var(--color-navy)" }}
              >
                {n.display_name}
              </span>
              <span
                className="font-display"
                style={{ color: "var(--color-navy)", opacity: 0.85, fontSize: "15px" }}
              >
                {n.message}
              </span>
            </p>
          </li>
        ))}
        {notes !== null && notes.length === 0 && (
          <li
            className="font-display italic"
            style={{ color: "var(--color-navy)", opacity: 0.5, fontSize: "14px" }}
          >
            Nothing yet — first note sets the tone.
          </li>
        )}
      </ul>
    </div>
  );
}
