"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/components/GuestProvider";
import { STOP_COORDS } from "@/lib/geo";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Stop = {
  id: string;
  position: number;
  time_label: string;
  title: string;
  venue: string | null;
  address: string | null;
  drink: string | null;
  note: string | null;
  status: "planned" | "here" | "done" | "skipped";
};

const STATUS_LABEL: Record<Stop["status"], string | null> = {
  planned: null,
  here: "Now",
  done: "Done",
  skipped: "Skipped",
};

const STATUS_CYCLE: Record<Stop["status"], Stop["status"]> = {
  planned: "here",
  here: "done",
  done: "skipped",
  skipped: "planned",
};

export default function ItineraryPage() {
  const { isAdmin } = useGuest();
  const [stops, setStops] = useState<Stop[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const cycleStatus = async (s: Stop) => {
    const next = STATUS_CYCLE[s.status];
    setStops((prev) =>
      prev?.map((x) => (x.id === s.id ? { ...x, status: next } : x)) ?? null,
    );
    const sb = supabase();
    const { error } = await sb
      .from("stops")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) console.error("stop status", error);
  };

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const { data, error } = await sb
        .from("stops")
        .select("*")
        .order("position", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("stops load", error);
        return;
      }
      setStops(data as Stop[]);
    };
    load();

    const channel = sb
      .channel("stops-changes")
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

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <PageFrame
      sectionMark="I"
      eyebrow="Saturday · 27 June 2026"
      title="The Program"
      subtitle="Six bars, in order. Tap any row to expand."
    >
      {!stops ? (
        <Skeleton />
      ) : stops.length === 0 ? (
        <Empty />
      ) : (
        <div className="mt-4">
          {/* Tabular header */}
          <div
            className="grid grid-cols-[56px_1fr_44px] gap-3 pb-3 border-b"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span
              className="label text-[9px]"
              style={{ color: "var(--color-navy)", opacity: 0.55 }}
            >
              Time
            </span>
            <span
              className="label text-[9px]"
              style={{ color: "var(--color-navy)", opacity: 0.55 }}
            >
              Activity
            </span>
            <span
              className="label text-[9px] text-right"
              style={{ color: "var(--color-navy)", opacity: 0.55 }}
            >
              Map
            </span>
          </div>

          {/* Rows */}
          <ul className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
            {stops.map((s) => {
              const isOpen = expanded.has(s.id);
              const coords = s.venue ? STOP_COORDS[s.venue] : null;
              const mapUrl = coords
                ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                : s.address
                ? `https://www.google.com/maps?q=${encodeURIComponent(
                    s.address,
                  )}`
                : null;

              return (
                <li
                  key={s.id}
                  className="border-t"
                  style={{
                    borderColor: "var(--color-rule)",
                    opacity: s.status === "done" ? 0.55 : 1,
                  }}
                >
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="w-full grid grid-cols-[56px_1fr_44px] gap-3 py-5 items-baseline text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="mono tabular-nums"
                      style={{
                        color: "var(--color-navy)",
                        fontSize: "13px",
                      }}
                    >
                      {s.time_label}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className="font-display"
                          style={{
                            color: "var(--color-navy)",
                            fontSize: "20px",
                            letterSpacing: "-0.02em",
                            fontWeight: 500,
                          }}
                        >
                          {s.title}
                        </span>
                        {STATUS_LABEL[s.status] && (
                          <span
                            className="label text-[8.5px] px-1.5 py-0.5 border"
                            style={{
                              borderColor:
                                s.status === "here"
                                  ? "var(--color-navy)"
                                  : "var(--color-rule)",
                              background:
                                s.status === "here"
                                  ? "var(--color-navy)"
                                  : "transparent",
                              color:
                                s.status === "here"
                                  ? "var(--color-paper)"
                                  : "var(--color-navy)",
                            }}
                          >
                            {STATUS_LABEL[s.status]}
                          </span>
                        )}
                      </div>
                      {s.venue && (
                        <div
                          className="font-display italic mt-0.5"
                          style={{
                            color: "var(--color-navy)",
                            opacity: 0.7,
                            fontSize: "14px",
                          }}
                        >
                          {s.venue.split(" · ")[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end items-center gap-1.5">
                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="label text-[8.5px] underline decoration-[0.5px] underline-offset-4"
                          style={{ color: "var(--color-gold)" }}
                          aria-label="Open in Maps"
                        >
                          Open ↗
                        </a>
                      )}
                      <ChevronRight
                        size={14}
                        strokeWidth={1.2}
                        className="transition-transform"
                        style={{
                          color: "var(--color-navy)",
                          opacity: 0.5,
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                        aria-hidden
                      />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div
                      className="grid grid-cols-[56px_1fr] gap-3 pb-6 pl-0"
                      style={{ background: "transparent" }}
                    >
                      <span />
                      <div className="space-y-4">
                        <DetailRow label="Address">
                          {s.address ?? "—"}
                        </DetailRow>
                        <DetailRow label="To Order">
                          <span style={{ color: "var(--color-gold)" }}>
                            {s.drink ?? "Bartender's choice"}
                          </span>
                        </DetailRow>
                        <DetailRow label="Dress">
                          Dress in black. Sleek and bold.
                        </DetailRow>
                        <DetailRow label="Logistics">
                          {s.note ?? "—"}
                        </DetailRow>
                        {s.venue === "The House" && (
                          <Link
                            href="/lunch"
                            onClick={(e) => e.stopPropagation()}
                            className="label text-[9px] px-3 py-2.5 border inline-flex items-center"
                            style={{
                              borderColor: "var(--color-gold)",
                              color: "var(--color-navy)",
                              minHeight: "44px",
                            }}
                          >
                            Pre-order your lunch →
                          </Link>
                        )}
                        {isAdmin && (
                          <div className="pt-3 border-t" style={{ borderColor: "var(--color-rule)" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cycleStatus(s);
                              }}
                              className="label text-[9px] px-3 py-2 border"
                              style={{
                                borderColor: "var(--color-navy)",
                                color: "var(--color-navy)",
                              }}
                            >
                              Set Status · {s.status}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Terminus row */}
          <div
            className="grid grid-cols-[56px_1fr_44px] gap-3 py-5 border-t"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <span
              className="mono tabular-nums"
              style={{ color: "var(--color-navy)", opacity: 0.5, fontSize: "13px" }}
            >
              —
            </span>
            <span
              className="label text-[10px]"
              style={{ color: "var(--color-navy)", opacity: 0.55 }}
            >
              Taxi Home
            </span>
            <span />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <span
        className="label text-[9px]"
        style={{ color: "var(--color-navy)", opacity: 0.55 }}
      >
        {label}
      </span>
      <span
        className="font-display"
        style={{
          color: "var(--color-navy)",
          fontSize: "14px",
          letterSpacing: "-0.005em",
          opacity: 0.85,
          lineHeight: 1.45,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-4 space-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-t py-5 animate-pulse"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <div
            className="h-5 w-3/4"
            style={{ background: "var(--color-rule-soft)" }}
          />
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <p
      className="font-display italic text-center py-12"
      style={{ color: "var(--color-navy)", opacity: 0.5, fontSize: "16px" }}
    >
      No stops yet. The Concierge is still drafting.
    </p>
  );
}
