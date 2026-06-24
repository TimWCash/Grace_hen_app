import { supabase } from "@/lib/supabase";

export const MAX_CHARS = 200;
export const MAX_SECONDS = 120; // soft cap — a memory, not a monologue

export type Memory = {
  id: string;
  guest_id: string;
  storage_path: string | null;
  body: string | null;
  duration_secs: number | null;
  created_at: string;
  guests: { display_name: string } | null;
  url?: string;
};

/** Has this guest already left a favourite-Grace memory? Used to stop nagging. */
export async function guestHasMemory(guestId: string): Promise<boolean | null> {
  const sb = supabase();
  const { count, error } = await sb
    .from("voice_notes")
    .select("id", { count: "exact", head: true })
    .eq("guest_id", guestId);
  if (error) return null; // table missing / offline — don't assume either way
  return (count ?? 0) > 0;
}

/** Best audio container the browser will give us (Safari → mp4, Chrome → webm). */
export function pickMime(): string | null {
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

export function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("ogg")) return "ogg";
  return "dat";
}

export function clock(secs: number | null | undefined): string {
  if (secs === null || secs === undefined) return "";
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Upload an audio blob and record the memory row. */
export async function postVoiceMemory(
  guestId: string,
  blob: Blob,
  mime: string,
  durationSecs: number | null,
): Promise<void> {
  const sb = supabase();
  const ext = extFor(mime);
  const path = `${guestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await sb.storage
    .from("voicenotes")
    .upload(path, blob, { contentType: mime || "audio/mpeg", upsert: false });
  if (upErr) throw upErr;
  const { error: dbErr } = await sb
    .from("voice_notes")
    .insert({ guest_id: guestId, storage_path: path, duration_secs: durationSecs });
  if (dbErr) throw dbErr;
}

/** Record a typed memory (<=200 chars). */
export async function postTextMemory(guestId: string, body: string): Promise<void> {
  const sb = supabase();
  const trimmed = body.trim().slice(0, MAX_CHARS);
  const { error } = await sb
    .from("voice_notes")
    .insert({ guest_id: guestId, body: trimmed });
  if (error) throw error;
}
