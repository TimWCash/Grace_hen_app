"use client";

import { useCallback, useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { MemoryComposer } from "@/components/MemoryComposer";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";
import { ago, clock, type Memory } from "@/lib/memories";

export default function MemoriesPage() {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Memory[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data, error } = await sb
      .from("voice_notes")
      .select("id, guest_id, storage_path, body, duration_secs, created_at, guests(display_name)")
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code === "PGRST205" || /relation .* does not exist/i.test(error.message)) {
        setUnavailable(true);
      }
      setNotes([]);
      return;
    }
    const withUrls = (data as unknown as Memory[]).map((n) => ({
      ...n,
      url: n.storage_path
        ? sb.storage.from("voicenotes").getPublicUrl(n.storage_path).data.publicUrl
        : undefined,
    }));
    setNotes(withUrls);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);
      await load();
    })();

    const sb = supabase();
    const channel = sb
      .channel("voice-notes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_notes" }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [load]);

  const myCount = notes && guestId ? notes.filter((n) => n.guest_id === guestId).length : 0;

  return (
    <PageFrame
      sectionMark="Memories"
      eyebrow="For Grace · On the Record"
      title="Grace Stories"
      subtitle="Leave your favourite memory of Grace — a quick voice note, or a line or two. She keeps them forever."
    >
      {/* Composer */}
      <div className="border p-6" style={{ borderColor: "var(--color-rule-gold)", background: "var(--color-paper-warm)" }}>
        <MemoryComposer guestId={guestId} onPosted={load} />
      </div>

      {/* The wall */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
            The Memories
          </span>
          <span className="font-display tabular-nums" style={{ color: "var(--color-navy)", fontSize: "22px" }}>
            {String(notes?.length ?? 0).padStart(2, "0")}
          </span>
        </div>
        <div className="rule mt-2 mb-1" />

        {unavailable ? (
          <p className="font-display italic text-center py-10" style={{ color: "var(--color-navy)", opacity: 0.55, fontSize: "16px" }}>
            Opening soon — the recorder&apos;s warming up.
          </p>
        ) : notes === null ? (
          <ul className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="py-6 animate-pulse">
                <div className="h-4 w-1/3" style={{ background: "var(--color-rule-soft)" }} />
                <div className="h-9 w-full mt-3" style={{ background: "var(--color-rule-soft)" }} />
              </li>
            ))}
          </ul>
        ) : notes.length === 0 ? (
          <p className="font-display italic text-center py-10" style={{ color: "var(--color-navy)", opacity: 0.6, fontSize: "16px" }}>
            No memories yet — be the first to leave one.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
            {notes.map((n) => (
              <li key={n.id} className="py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display" style={{ color: "var(--color-navy)", fontSize: "20px", letterSpacing: "-0.01em" }}>
                    {n.guests?.display_name ?? "A friend"}
                    {n.guest_id === guestId && (
                      <span className="label text-[8px] ml-2" style={{ color: "var(--color-gold)" }}>You</span>
                    )}
                  </span>
                  <span className="label text-[8px] tabular-nums shrink-0" style={{ color: "var(--color-navy)", opacity: 0.5 }}>
                    {ago(n.created_at)}
                    {n.duration_secs ? ` · ${clock(n.duration_secs)}` : ""}
                  </span>
                </div>
                {n.body ? (
                  <p
                    className="font-display italic mt-2"
                    style={{ color: "var(--color-navy)", opacity: 0.9, fontSize: "17px", lineHeight: 1.5 }}
                  >
                    &ldquo;{n.body}&rdquo;
                  </p>
                ) : (
                  <audio src={n.url} controls preload="none" className="w-full mt-3" style={{ height: "40px" }} />
                )}
              </li>
            ))}
          </ul>
        )}

        {notes && notes.length > 0 && (
          <p className="font-display italic text-center mt-5" style={{ color: "var(--color-navy)", opacity: 0.55, fontSize: "14px" }}>
            {myCount > 0 ? "Thanks for yours. Leave another?" : "Add yours to the collection."}
          </p>
        )}
      </div>
    </PageFrame>
  );
}
