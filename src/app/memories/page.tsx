"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";

type Note = {
  id: string;
  guest_id: string;
  storage_path: string;
  duration_secs: number | null;
  created_at: string;
  guests: { display_name: string } | null;
  url?: string;
};

type Phase = "idle" | "recording" | "preview" | "saving";

const MAX_SECONDS = 120; // soft cap — a memory, not a monologue

/** Best container the browser will give us (Safari → mp4, Chrome → webm). */
function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const types = ["audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
  return (
    types.find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    }) ?? null
  );
}

function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("ogg")) return "ogg";
  return "dat";
}

function clock(secs: number | null | undefined): string {
  if (secs === null || secs === undefined) return "";
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function ago(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function MemoriesPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [guestId, setGuestId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; url: string; mime: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const canRecord = pickMime() !== null && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const load = useCallback(async () => {
    const sb = supabase();
    const { data, error } = await sb
      .from("voice_notes")
      .select("id, guest_id, storage_path, duration_secs, created_at, guests(display_name)")
      .order("created_at", { ascending: false });
    if (error) {
      // Table missing until migration 010 is run — hide gracefully.
      if (error.code === "PGRST205" || /relation .* does not exist/i.test(error.message)) {
        setUnavailable(true);
      }
      setNotes([]);
      return;
    }
    const withUrls = (data as unknown as Note[]).map((n) => ({
      ...n,
      url: sb.storage.from("voicenotes").getPublicUrl(n.storage_path).data.publicUrl,
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

  // Tidy up any live recording / object URLs on unmount.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (clip?.url) URL.revokeObjectURL(clip.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startRecording = async () => {
    setFlash(null);
    const mime = pickMime();
    if (!mime) {
      setFlash("This browser can't record — upload a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setClip({ blob, url, mime });
        setPhase("preview");
        stopTracks();
      };
      rec.start();
      startedAtRef.current = performance.now();
      setElapsed(0);
      setPhase("recording");
      tickRef.current = setInterval(() => {
        const secs = (performance.now() - startedAtRef.current) / 1000;
        setElapsed(secs);
        if (secs >= MAX_SECONDS) stopRecording();
      }, 200);
    } catch (err) {
      console.error(err);
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setFlash(denied ? "Mic access blocked — allow it in your browser, or upload a file." : "Couldn't start recording — try uploading a file.");
      stopTracks();
      setPhase("idle");
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const discardClip = () => {
    if (clip?.url) URL.revokeObjectURL(clip.url);
    setClip(null);
    setElapsed(0);
    setPhase("idle");
  };

  const upload = async (blob: Blob, mime: string, duration: number | null) => {
    if (!guestId) {
      setFlash("Sign in first.");
      return;
    }
    setPhase("saving");
    setFlash(null);
    try {
      const sb = supabase();
      const ext = extFor(mime);
      const path = `${guestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("voicenotes")
        .upload(path, blob, { contentType: mime || "audio/mpeg", upsert: false });
      if (upErr) throw upErr;
      const { error: dbErr } = await sb
        .from("voice_notes")
        .insert({ guest_id: guestId, storage_path: path, duration_secs: duration });
      if (dbErr) throw dbErr;
      discardClip();
      setFlash("Saved for Grace 💛");
      setTimeout(() => setFlash(null), 2500);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error(err);
      setFlash(`Couldn't save: ${msg}`);
      setPhase(clip ? "preview" : "idle");
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio")) {
      setFlash("That's not an audio file.");
      return;
    }
    await upload(file, file.type, null);
  };

  const myCount = notes && guestId ? notes.filter((n) => n.guest_id === guestId).length : 0;

  return (
    <PageFrame
      sectionMark="Memories"
      eyebrow="For Grace · On the Record"
      title="Voice Notes"
      subtitle="Record a favourite memory of Grace — she'll keep them forever."
    >
      {/* ─── Recorder ─────────────────────────────────────────── */}
      <div className="border p-6" style={{ borderColor: "var(--color-rule-gold)", background: "var(--color-paper-warm)" }}>
        {phase === "recording" ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 animate-pulse" style={{ background: "var(--color-destructive)" }} aria-hidden />
              <span className="label text-[10px]" style={{ color: "var(--color-destructive)" }}>
                Recording
              </span>
            </div>
            <p className="font-display tabular-nums mt-3" style={{ color: "var(--color-navy)", fontSize: "44px", letterSpacing: "-0.02em" }}>
              {clock(elapsed)}
            </p>
            <button
              type="button"
              onClick={stopRecording}
              className="mt-4 w-full label text-[10px] py-4 border"
              style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "56px" }}
            >
              Stop
            </button>
            <p className="label text-[8px] mt-3" style={{ color: "var(--color-navy)", opacity: 0.5 }}>
              Up to two minutes
            </p>
          </div>
        ) : phase === "preview" && clip ? (
          <div>
            <p className="label text-[10px] text-center" style={{ color: "var(--color-gold)" }}>
              Have a listen
            </p>
            <audio src={clip.url} controls className="w-full mt-4" style={{ height: "40px" }} />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={discardClip}
                className="label text-[10px] py-3.5 border"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", minHeight: "52px" }}
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={() => upload(clip.blob, clip.mime, elapsed || null)}
                className="label text-[10px] py-3.5 border"
                style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "52px" }}
              >
                Add to the wall
              </button>
            </div>
          </div>
        ) : phase === "saving" ? (
          <p className="font-display italic text-center py-6" style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "16px" }}>
            Saving…
          </p>
        ) : (
          <div className="text-center">
            <p className="font-display italic" style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "16px", lineHeight: 1.5, maxWidth: "30ch", margin: "0 auto" }}>
              A story, a one-liner, the time she… you know the one.
            </p>
            {canRecord ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={!guestId}
                className="mt-5 w-full label text-[10px] py-4 border disabled:opacity-60"
                style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "56px" }}
              >
                ● Record a memory
              </button>
            ) : (
              <p className="label text-[9px] mt-4" style={{ color: "var(--color-navy)", opacity: 0.6 }}>
                Recording isn&apos;t supported here — upload a clip below.
              </p>
            )}
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onPickFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!guestId}
              className="mt-2 w-full label text-[9px] py-3 disabled:opacity-60 underline decoration-[0.5px] underline-offset-4"
              style={{ color: "var(--color-navy)", opacity: 0.7 }}
            >
              {canRecord ? "or upload a voice memo" : "Upload an audio file"}
            </button>
          </div>
        )}

        {flash && (
          <p className="font-display italic text-center mt-4" style={{ color: "var(--color-gold)", fontSize: "15px" }}>
            {flash}
          </p>
        )}
        {!guestId && (
          <p className="label text-[8px] text-center mt-3" style={{ color: "var(--color-navy)", opacity: 0.5 }}>
            Sign in to leave one
          </p>
        )}
      </div>

      {/* ─── The wall ─────────────────────────────────────────── */}
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
                      <span className="label text-[8px] ml-2" style={{ color: "var(--color-gold)" }}>
                        You
                      </span>
                    )}
                  </span>
                  <span className="label text-[8px] tabular-nums shrink-0" style={{ color: "var(--color-navy)", opacity: 0.5 }}>
                    {ago(n.created_at)}
                    {n.duration_secs ? ` · ${clock(n.duration_secs)}` : ""}
                  </span>
                </div>
                <audio src={n.url} controls preload="none" className="w-full mt-3" style={{ height: "40px" }} />
              </li>
            ))}
          </ul>
        )}

        {notes && notes.length > 0 && (
          <p className="font-display italic text-center mt-5" style={{ color: "var(--color-navy)", opacity: 0.55, fontSize: "14px" }}>
            {myCount > 0 ? `You've left ${myCount}. Leave another?` : "Add yours to the collection."}
          </p>
        )}
      </div>
    </PageFrame>
  );
}
