"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Ink } from "./Ink";

type Broadcast = {
  id: string;
  kind: "go" | "notice" | "video" | "mission";
  payload: {
    message?: string;
    venue?: string;
    time?: string;
    src?: string;
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
        (payload) => consider(payload.new as Broadcast),
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

        <button
          type="button"
          onClick={dismiss}
          className="mt-12 px-8 py-4 border label text-[10px]"
          style={{
            borderColor: "rgba(245,245,245,0.4)",
            color: "#f5f5f5",
            background: "transparent",
            minHeight: "48px",
          }}
        >
          Got it
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
