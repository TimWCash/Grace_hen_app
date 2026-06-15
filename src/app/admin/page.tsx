"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/PageFrame";
import { useGuest } from "@/components/GuestProvider";
import { supabase } from "@/lib/supabase";

type Stop = {
  id: string;
  position: number;
  time_label: string;
  title: string;
  venue: string | null;
  status: "planned" | "here" | "done" | "skipped";
};
type Menu = { id: string; stop_id: string; label: string; position: number };
type Order = { stop_id: string; guest_id: string; option_id: string };

const STATUS_NEXT: Record<Stop["status"], Stop["status"]> = {
  planned: "here",
  here: "done",
  done: "skipped",
  skipped: "planned",
};

export default function AdminPage() {
  const { isAdmin } = useGuest();
  const [stops, setStops] = useState<Stop[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [liveTables, setLiveTables] = useState(true); // false if 003 not run
  const [flash, setFlash] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [mission, setMission] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const stopsRes = await sb
        .from("stops")
        .select("id, position, time_label, title, venue, status")
        .order("position");
      if (!cancelled && stopsRes.data) setStops(stopsRes.data as Stop[]);

      const menuRes = await sb.from("stop_menus").select("*").order("position");
      if (menuRes.error) {
        if (!cancelled) setLiveTables(false);
      } else if (!cancelled) {
        setMenus(menuRes.data as Menu[]);
      }

      const orderRes = await sb.from("drink_orders").select("*");
      if (!cancelled && orderRes.data) setOrders(orderRes.data as Order[]);
    };
    load();

    const channel = sb
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drink_orders" },
        () => load(),
      )
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
  }, [isAdmin]);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  };

  const broadcast = async (kind: string, payload: object, ttlMin: number) => {
    const sb = supabase();
    const { error } = await sb.from("broadcasts").insert({
      kind,
      payload,
      expires_at: new Date(Date.now() + ttlMin * 60_000).toISOString(),
    });
    if (error) {
      say(
        error.code === "PGRST205"
          ? "Run migration 003 first (broadcasts table missing)."
          : `Error: ${error.message}`,
      );
      return false;
    }
    return true;
  };

  const nextOf = (s: Stop) =>
    stops.find((x) => x.position === s.position + 1) ?? null;

  const sendWarning = async (s: Stop) => {
    const next = nextOf(s);
    const target = next ?? s;
    const ok = await broadcast(
      "warning",
      {
        stopId: target.id,
        venue: target.venue ?? target.title,
        departAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
      20,
    );
    if (ok) say(`15-min warning sent → ${target.venue ?? target.title}`);
  };

  const sendGo = async (s: Stop) => {
    const next = nextOf(s);
    const target = next ?? s;
    const ok = await broadcast(
      "go",
      {
        venue: target.venue ?? target.title,
        time: target.time_label,
        message: "Drink up — we're moving.",
      },
      10,
    );
    if (ok) say(`GO sent → ${target.venue ?? target.title}`);
  };

  const cycleStatus = async (s: Stop) => {
    const next = STATUS_NEXT[s.status];
    setStops((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)),
    );
    const sb = supabase();
    await sb.from("stops").update({ status: next }).eq("id", s.id);
  };

  const tallies = useMemo(() => {
    const labelOf = Object.fromEntries(menus.map((m) => [m.id, m.label]));
    const byStop: Record<string, Record<string, number>> = {};
    for (const o of orders) {
      byStop[o.stop_id] ??= {};
      const label = labelOf[o.option_id] ?? "—";
      byStop[o.stop_id][label] = (byStop[o.stop_id][label] ?? 0) + 1;
    }
    return byStop;
  }, [orders, menus]);

  if (!isAdmin) {
    return (
      <PageFrame eyebrow="Restricted" title="The Concierge">
        <p
          className="font-display italic text-center"
          style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "16px" }}
        >
          For the Maid of Honour. Unlock with the PIN in{" "}
          <Link href="/settings" className="underline decoration-[0.5px] underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      sectionMark="Admin"
      eyebrow="For the Maid of Honour"
      title="The Concierge"
      subtitle="Run the night from here. The hens see only what you send."
    >
      {flash && (
        <div
          className="mb-6 px-4 py-3 border text-center"
          style={{ borderColor: "var(--color-gold)", background: "rgba(197,160,89,0.1)" }}
        >
          <span className="label text-[9px]" style={{ color: "var(--color-navy)" }}>
            {flash}
          </span>
        </div>
      )}

      {!liveTables && (
        <div
          className="mb-6 px-4 py-3 border"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <p
            className="font-display italic"
            style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px" }}
          >
            Live-night tables aren't set up yet. Run{" "}
            <span className="mono">003_live_night.sql</span> in Supabase to enable
            warnings, orders and Mark's video.
          </p>
        </div>
      )}

      {/* MOVE THE NIGHT */}
      <Section label="Move the Night">
        <ul className="space-y-0">
          {stops.map((s) => {
            const next = nextOf(s);
            return (
              <li
                key={s.id}
                className="py-4 border-t first:border-t-0"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="mono text-[12px]" style={{ color: "var(--color-navy)" }}>
                      {s.time_label}
                    </span>{" "}
                    <span
                      className="font-display"
                      style={{ color: "var(--color-navy)", fontSize: "17px" }}
                    >
                      {s.venue ?? s.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleStatus(s)}
                    className="label text-[8.5px] px-2 py-1 border"
                    style={{
                      borderColor:
                        s.status === "here" ? "var(--color-navy)" : "var(--color-rule)",
                      background: s.status === "here" ? "var(--color-navy)" : "transparent",
                      color: s.status === "here" ? "var(--color-paper)" : "var(--color-navy)",
                    }}
                  >
                    {s.status}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => sendWarning(s)}
                    className="label text-[9px] py-3 border"
                    style={{ borderColor: "var(--color-gold)", color: "var(--color-navy)", minHeight: "44px" }}
                  >
                    15-min warning{next ? ` → ${next.venue ?? next.title}` : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendGo(s)}
                    className="label text-[9px] py-3 border"
                    style={{
                      borderColor: "var(--color-navy)",
                      background: "var(--color-navy)",
                      color: "var(--color-paper)",
                      minHeight: "44px",
                    }}
                  >
                    GO now{next ? ` → ${next.venue ?? next.title}` : ""}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ORDERS */}
      <Section label="Drink Orders · live">
        {stops.map((s) => {
          const t = tallies[s.id];
          const entries = t ? Object.entries(t) : [];
          const total = entries.reduce((n, [, c]) => n + c, 0);
          return (
            <div
              key={s.id}
              className="py-3 border-t first:border-t-0"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-display"
                  style={{ color: "var(--color-navy)", fontSize: "16px" }}
                >
                  {s.venue ?? s.title}
                </span>
                <span className="label text-[9px]" style={{ color: "var(--color-navy)", opacity: 0.55 }}>
                  {total} {total === 1 ? "order" : "orders"}
                </span>
              </div>
              {entries.length > 0 ? (
                <p
                  className="font-display mt-1"
                  style={{ color: "var(--color-navy)", opacity: 0.8, fontSize: "15px" }}
                >
                  {entries.map(([label, count]) => `${count}× ${label}`).join("  ·  ")}
                </p>
              ) : (
                <p
                  className="font-display italic mt-1"
                  style={{ color: "var(--color-navy)", opacity: 0.45, fontSize: "13px" }}
                >
                  No orders yet
                </p>
              )}
            </div>
          );
        })}
      </Section>

      {/* MARK'S VIDEO */}
      <Section label="Mark's Moment">
        <p
          className="font-display italic"
          style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px" }}
        >
          Drops a full-screen “A message from Mark” on every phone. Put the file at{" "}
          <span className="mono">public/videos/mark.mp4</span> first.
        </p>
        <button
          type="button"
          onClick={async () => {
            const ok = await broadcast("video", { src: "/videos/mark.mp4" }, 30);
            if (ok) say("Mark's video sent to every phone.");
          }}
          className="mt-3 w-full label text-[9px] py-3 border"
          style={{ borderColor: "var(--color-gold)", color: "var(--color-navy)", minHeight: "44px" }}
        >
          Play Mark's video everywhere
        </button>
      </Section>

      {/* MISSION + NOTICE */}
      <Section label="Mission of the Day">
        <input
          type="text"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="Override today's mission…"
          className="w-full border-b py-3 bg-transparent focus:outline-none font-display"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", fontSize: "16px" }}
        />
        <button
          type="button"
          disabled={!mission.trim()}
          onClick={async () => {
            const ok = await broadcast("mission", { text: mission.trim() }, 60 * 24);
            if (ok) { say("Mission updated."); setMission(""); }
          }}
          className="mt-3 w-full label text-[9px] py-3 border disabled:opacity-40"
          style={{ borderColor: "var(--color-navy)", color: "var(--color-navy)", minHeight: "44px" }}
        >
          Set mission
        </button>
      </Section>

      <Section label="Send a Notice">
        <input
          type="text"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="A message to every phone…"
          className="w-full border-b py-3 bg-transparent focus:outline-none font-display"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", fontSize: "16px" }}
        />
        <button
          type="button"
          disabled={!notice.trim()}
          onClick={async () => {
            const ok = await broadcast("notice", { message: notice.trim() }, 15);
            if (ok) { say("Notice sent."); setNotice(""); }
          }}
          className="mt-3 w-full label text-[9px] py-3 border disabled:opacity-40"
          style={{ borderColor: "var(--color-navy)", color: "var(--color-navy)", minHeight: "44px" }}
        >
          Send notice
        </button>
      </Section>

      {/* DEVELOP PHOTOS */}
      <Section label="The Trophy Room">
        <p
          className="font-display italic"
          style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px" }}
        >
          Photos stay sealed until the wedding. Develop them early only if you mean to.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Develop the album for everyone now? This can't be undone.")) return;
            const sb = supabase();
            const { data, error } = await sb.rpc("reveal_photos_now");
            say(error ? `Error: ${error.message}` : data ? "Album developed." : "Not permitted.");
          }}
          className="mt-3 w-full label text-[9px] py-3 border"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", minHeight: "44px" }}
        >
          Develop photos now
        </button>
      </Section>
    </PageFrame>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
        {label}
      </p>
      <div className="rule mt-3 mb-4" />
      {children}
    </section>
  );
}
