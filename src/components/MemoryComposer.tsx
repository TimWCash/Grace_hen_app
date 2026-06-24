"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_CHARS,
  MAX_SECONDS,
  clock,
  pickMime,
  postTextMemory,
  postVoiceMemory,
} from "@/lib/memories";

type Phase = "idle" | "recording" | "preview" | "saving";

/**
 * Capture a favourite-Grace memory — a voice note OR a typed note.
 * Renders on a paper background; calls onPosted() after a successful save.
 */
export function MemoryComposer({
  guestId,
  onPosted,
}: {
  guestId: string | null;
  onPosted?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [canRecord, setCanRecord] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("text");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; url: string; mime: string } | null>(null);
  const [body, setBody] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  // Decide recording support after mount (MediaRecorder is client-only).
  useEffect(() => {
    const ok = pickMime() !== null && !!navigator.mediaDevices?.getUserMedia;
    setCanRecord(ok);
    if (ok) setMode("voice");
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTracks();
      if (clip?.url) URL.revokeObjectURL(clip.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setFlash(null);
    const mime = pickMime();
    if (!mime) {
      setFlash("This browser can't record — upload a file or write it.");
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
        setClip({ blob, url: URL.createObjectURL(blob), mime });
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
      setFlash(denied ? "Mic blocked — allow it, or write your memory instead." : "Couldn't record — try writing it instead.");
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

  const saved = () => {
    setFlash("Saved for Grace 💛");
    setTimeout(() => setFlash(null), 2500);
    onPosted?.();
  };

  const submitVoice = async (blob: Blob, mime: string, duration: number | null) => {
    if (!guestId) return setFlash("Sign in first.");
    setPhase("saving");
    setFlash(null);
    try {
      await postVoiceMemory(guestId, blob, mime, duration);
      discardClip();
      saved();
    } catch (err: unknown) {
      console.error(err);
      setFlash(`Couldn't save: ${err instanceof Error ? err.message : "try again"}`);
      setPhase(clip ? "preview" : "idle");
    }
  };

  const submitText = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!guestId) return setFlash("Sign in first.");
    setPhase("saving");
    setFlash(null);
    try {
      await postTextMemory(guestId, trimmed);
      setBody("");
      setPhase("idle");
      saved();
    } catch (err: unknown) {
      console.error(err);
      setFlash(`Couldn't save: ${err instanceof Error ? err.message : "try again"}`);
      setPhase("idle");
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio")) return setFlash("That's not an audio file.");
    await submitVoice(file, file.type, null);
  };

  const tab = (key: "voice" | "text", label: string) => (
    <button
      type="button"
      onClick={() => {
        if (phase === "recording") return;
        setMode(key);
        setFlash(null);
      }}
      className="label text-[10px] py-3"
      style={{
        background: mode === key ? "var(--color-navy)" : "transparent",
        color: mode === key ? "var(--color-paper)" : "var(--color-navy)",
        minHeight: "44px",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Voice / Write toggle */}
      <div
        className="grid grid-cols-2 gap-0 border mb-5"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {tab("voice", "🎙 Record")}
        <div className="border-l" style={{ borderColor: "var(--color-rule)" }}>
          {tab("text", "✍️ Write")}
        </div>
      </div>

      {mode === "text" ? (
        <div>
          <textarea
            value={body}
            maxLength={MAX_CHARS}
            onChange={(e) => setBody(e.target.value)}
            placeholder="The time she… — your favourite Grace story, in a line or two."
            rows={4}
            className="w-full border p-3 font-display"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-paper)",
              color: "var(--color-navy)",
              fontSize: "17px",
              lineHeight: 1.45,
              resize: "none",
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="label text-[8px] tabular-nums" style={{ color: "var(--color-navy)", opacity: 0.5 }}>
              {body.length}/{MAX_CHARS}
            </span>
          </div>
          <button
            type="button"
            onClick={submitText}
            disabled={!guestId || !body.trim() || phase === "saving"}
            className="mt-3 w-full label text-[10px] py-4 border disabled:opacity-50"
            style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "56px" }}
          >
            {phase === "saving" ? "Saving…" : "Save my memory"}
          </button>
        </div>
      ) : phase === "recording" ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 animate-pulse" style={{ background: "var(--color-destructive)" }} aria-hidden />
            <span className="label text-[10px]" style={{ color: "var(--color-destructive)" }}>Recording</span>
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
          <p className="label text-[8px] mt-3" style={{ color: "var(--color-navy)", opacity: 0.5 }}>Up to two minutes</p>
        </div>
      ) : phase === "preview" && clip ? (
        <div>
          <p className="label text-[10px] text-center" style={{ color: "var(--color-gold)" }}>Have a listen</p>
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
              onClick={() => submitVoice(clip.blob, clip.mime, elapsed || null)}
              className="label text-[10px] py-3.5 border"
              style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "52px" }}
            >
              Save it
            </button>
          </div>
        </div>
      ) : phase === "saving" ? (
        <p className="font-display italic text-center py-6" style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "16px" }}>
          Saving…
        </p>
      ) : (
        <div className="text-center">
          {canRecord ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={!guestId}
              className="w-full label text-[10px] py-4 border disabled:opacity-60"
              style={{ background: "var(--color-navy)", color: "var(--color-paper)", borderColor: "var(--color-navy)", minHeight: "56px" }}
            >
              ● Record a memory
            </button>
          ) : (
            <p className="label text-[9px]" style={{ color: "var(--color-navy)", opacity: 0.6 }}>
              Recording isn&apos;t supported here — upload a clip, or use Write.
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
  );
}
