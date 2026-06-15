"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";
import { fireAlert } from "@/lib/alerts";
import { Ink } from "./Ink";

function alertTextFor(b: { kind: string; payload: { venue?: string; message?: string } }): [string, string] {
  switch (b.kind) {
    case "go":
      return ["Time to move", b.payload.venue ? `On to ${b.payload.venue}` : "We're moving"];
    case "warning":
      return ["Leaving soon", b.payload.venue ? `Order your next drink — ${b.payload.venue}` : "Order your next drink"];
    case "video":
      return ["A message from Mark", "Tap to watch"];
    case "notice":
      return ["From the Concierge", b.payload.message ?? ""];
    default:
      return ["", ""];
  }
}

type Broadcast = {
  id: string;
  kind: "go" | "notice" | "video" | "mission" | "warning";
  payload: {
    message?: string;
    venue?: string;
    time?: string;
    src?: string;
    stopId?: string;
    departAt?: string; // ISO — when the group leaves
  };
  created_at: string;
  expires_at: string | null;
};

const DISMISSED_KEY = "dismissed-broadcasts";

function getDismissed(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addDismissed(id: string) {
  const list = [id, ...getDismissed()].slice(0, 50);
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
}

function isLive(b: Broadcast): boolean {
  if (b.kind === "mission") return false; // consumed by Mission, no takeover
  if (b.expires_at && new Date(b.expires_at) < new Date()) return false;
  return true;
}

/**
 * Global takeover layer. Listens for admin broadcasts (GO alerts,
 * notices, Mark's video) and takes over the screen on every open
 * phone. Dismissals persist locally so reopening doesn't replay.
 */
export function BroadcastListener() {
  const [active, setActive] = useState<Broadcast | null>(null);
  const dismissedRef = useRef<string[]>([]);

  const consider = useCallback((b: Broadcast) => {
    if (!isLive(b)) return;
    if (dismissedRef.current.includes(b.id)) return;
    setActive(b);
  }, []);

  useEffect(() => {
    dismissedRef.current = getDismissed();
    const sb = supabase();
    let cancelled = false;

    // Catch a live broadcast sent while the app was closed.
    const load = async () => {
      const { data, error } = await sb
        .from("broadcasts")
        .select("*")
        .neq("kind", "mission")
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled || error || !data?.length) return;
      consider(data[0] as Broadcast);
    };
    load();

    const channel = sb
      .channel("broadcast-takeover")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload) => {
          const b = payload.new as Broadcast;
          // Real-time arrival → buzz/chime/notify (not on the catch-up load).
          if (b.kind !== "mission" && !dismissedRef.current.includes(b.id)) {
            const [title, body] = alertTextFor(b);
            if (title) fireAlert(title, body);
          }
          consider(b);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [consider]);

  if (!active) return null;

  const dismiss = () => {
    addDismissed(active.id);
    dismissedRef.current = getDismissed();
    setActive(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(0, 20, 40, 0.97)" }}
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[420px] text-center">
        {active.kind === "go" && <GoTakeover b={active} />}
        {active.kind === "notice" && <NoticeTakeover b={active} />}
        {active.kind === "video" && <VideoTakeover b={active} />}
        {active.kind === "warning" && <WarningTakeover b={active} />}

        <button
          type="button"
          onClick={dismiss}
          className="mt-10 px-8 py-4 border label text-[10px]"
          style={{
            borderColor: "rgba(245,245,245,0.4)",
            color: "#f5f5f5",
            background: "transparent",
            minHeight: "48px",
          }}
        >
          {active.kind === "warning" ? "Done" : "Got it"}
        </button>
      </div>
    </div>
  );
}

function GoTakeover({ b }: { b: Broadcast }) {
  return (
    <Ink duration={0.8}>
      <p className="label text-[10px]" style={{ color: "#C5A059" }}>
        Time to Move
      </p>
      <h2
        className="font-display mt-6"
        style={{
          fontSize: "clamp(48px, 13vw, 72px)",
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          color: "#f5f5f5",
          fontWeight: 500,
        }}
      >
        {b.payload.venue ?? "Next stop"}
      </h2>
      {b.payload.time && (
        <p className="mono mt-5" style={{ color: "#C5A059", fontSize: "16px" }}>
          {b.payload.time}
        </p>
      )}
      {b.payload.message && (
        <p
          className="font-display italic mt-5"
          style={{
            color: "rgba(245,245,245,0.85)",
            fontSize: "17px",
            lineHeight: 1.5,
          }}
        >
          {b.payload.message}
        </p>
      )}
      <Link
        href="/map"
        className="label text-[9px] underline decoration-[0.5px] underline-offset-4 mt-6 inline-block"
        style={{ color: "rgba(245,245,245,0.6)" }}
      >
        Open the map
      </Link>
    </Ink>
  );
}

function NoticeTakeover({ b }: { b: Broadcast }) {
  return (
    <Ink duration={0.8}>
      <p className="label text-[10px]" style={{ color: "#C5A059" }}>
        From the Concierge
      </p>
      <p
        className="font-display italic mt-8"
        style={{
          color: "#f5f5f5",
          fontSize: "clamp(24px, 6vw, 32px)",
          lineHeight: 1.3,
        }}
      >
        {b.payload.message ?? ""}
      </p>
    </Ink>
  );
}

function VideoTakeover({ b }: { b: Broadcast }) {
  const [playing, setPlaying] = useState(false);
  const src = b.payload.src ?? "/videos/mark.mp4";

  return (
    <Ink duration={0.8}>
      <p className="label text-[10px]" style={{ color: "#C5A059" }}>
        A Message From
      </p>
      <h2
        className="font-display mt-4"
        style={{
          fontSize: "clamp(48px, 13vw, 72px)",
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          color: "#f5f5f5",
          fontWeight: 500,
        }}
      >
        Mark
      </h2>
      {playing ? (
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className="mt-8 w-full"
          style={{ maxHeight: "50vh", background: "#000" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="mt-8 w-full py-8 border"
          style={{
            borderColor: "#C5A059",
            color: "#f5f5f5",
            background: "rgba(197, 160, 89, 0.08)",
            minHeight: "48px",
          }}
        >
          <span className="font-display italic" style={{ fontSize: "20px" }}>
            Tap to play
          </span>
        </button>
      )}
    </Ink>
  );
}

type Cocktail = { id: string; label: string; note: string | null; position: number };

function WarningTakeover({ b }: { b: Broadcast }) {
  const [remaining, setRemaining] = useState<number>(() =>
    b.payload.departAt
      ? Math.max(0, new Date(b.payload.departAt).getTime() - Date.now())
      : 0,
  );
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tick the countdown.
  useEffect(() => {
    if (!b.payload.departAt) return;
    const id = setInterval(() => {
      setRemaining(
        Math.max(0, new Date(b.payload.departAt!).getTime() - Date.now()),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [b.payload.departAt]);

  // Load this bar's cocktail list + the guest's existing order.
  useEffect(() => {
    if (!b.payload.stopId) return;
    const sb = supabase();
    let cancelled = false;
    (async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);
      const { data } = await sb
        .from("stop_menus")
        .select("id, label, note, position")
        .eq("stop_id", b.payload.stopId)
        .order("position");
      if (!cancelled && data) setCocktails(data as Cocktail[]);
      if (guest) {
        const { data: existing } = await sb
          .from("drink_orders")
          .select("option_id")
          .eq("stop_id", b.payload.stopId)
          .eq("guest_id", guest.id)
          .maybeSingle();
        if (!cancelled && existing) setOrdered(existing.option_id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [b.payload.stopId]);

  const order = async (optionId: string) => {
    if (!guestId || !b.payload.stopId) return;
    setSaving(true);
    setOrdered(optionId);
    const sb = supabase();
    await sb.from("drink_orders").upsert(
      { stop_id: b.payload.stopId, guest_id: guestId, option_id: optionId },
      { onConflict: "stop_id,guest_id" },
    );
    setSaving(false);
  };

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const departed = remaining <= 0;

  return (
    <Ink duration={0.8}>
      <p className="label text-[10px]" style={{ color: "#C5A059" }}>
        {departed ? "Time to Move" : "Leaving Soon"}
      </p>

      {/* Countdown */}
      <div
        className="font-display tabular-nums mt-4"
        style={{
          fontSize: "clamp(56px, 16vw, 88px)",
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          color: "#f5f5f5",
        }}
      >
        {departed
          ? "Go"
          : `${mins}:${String(secs).padStart(2, "0")}`}
      </div>

      <p
        className="font-display italic mt-3"
        style={{ color: "rgba(245,245,245,0.85)", fontSize: "17px" }}
      >
        {departed ? "On to " : "Next — "}
        {b.payload.venue ?? "the next bar"}
      </p>

      {/* Order prompt + cocktails */}
      {!departed && cocktails.length > 0 && (
        <div className="mt-7">
          <p className="label text-[9px]" style={{ color: "#C5A059" }}>
            {ordered ? "Your order — Claire has it" : "Order your next drink now"}
          </p>
          <ul className="mt-3 space-y-2 text-left">
            {cocktails.map((c) => {
              const mine = ordered === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => order(c.id)}
                    className="w-full text-left px-4 py-3 border flex items-center justify-between gap-3"
                    style={{
                      borderColor: mine ? "#C5A059" : "rgba(245,245,245,0.25)",
                      background: mine
                        ? "rgba(197,160,89,0.15)"
                        : "transparent",
                      minHeight: "48px",
                    }}
                  >
                    <span className="min-w-0">
                      <span
                        className="font-display block"
                        style={{ color: "#f5f5f5", fontSize: "16px" }}
                      >
                        {c.label}
                      </span>
                      {c.note && (
                        <span
                          className="block label text-[8px] mt-0.5"
                          style={{ color: "rgba(245,245,245,0.55)" }}
                        >
                          {c.note}
                        </span>
                      )}
                    </span>
                    {mine && (
                      <span
                        className="label text-[8.5px] shrink-0"
                        style={{ color: "#C5A059" }}
                      >
                        Ordered ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Ink>
  );
}
