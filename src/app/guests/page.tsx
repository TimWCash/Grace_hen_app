"use client";

import { useEffect, useRef, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { Ink } from "@/components/Ink";
import { HENS, type Hen } from "@/lib/hens";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";
import type { Guest } from "@/lib/supabase";

type Profile = {
  hen_id: string;
  avatar_path: string | null;
  note: string | null;
  claimed_by: string | null;
};

function avatarUrl(path: string): string {
  const { data } = supabase().storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export default function GuestsPage() {
  const [me, setMe] = useState<Guest | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [available, setAvailable] = useState(true); // false if migration 009 not run

  const load = async () => {
    const sb = supabase();
    const { data, error } = await sb.from("hen_profiles").select("*");
    if (error) {
      setAvailable(false);
      return;
    }
    setProfiles(
      Object.fromEntries((data as Profile[]).map((p) => [p.hen_id, p])),
    );
  };

  useEffect(() => {
    getCurrentGuest().then(setMe);
    load();
    const sb = supabase();
    const channel = sb
      .channel("hen-profiles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hen_profiles" },
        () => load(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myHenId = Object.values(profiles).find((p) => p.claimed_by === me?.id)?.hen_id ?? null;

  return (
    <PageFrame
      sectionMark="VII"
      eyebrow="The Hens · Roll Call"
      title="The Guests"
      subtitle="Who's who — add your face so everyone knows you."
    >
      {available && me && (
        <Ink>
          <ClaimCard me={me} profiles={profiles} myHenId={myHenId} onSaved={load} />
        </Ink>
      )}

      <ol className="space-y-0 mt-2">
        {HENS.map((hen, i) => (
          <li
            key={hen.id}
            className={`py-8 ${i === 0 ? "" : "border-t"}`}
            style={{ borderColor: "var(--color-rule)" }}
          >
            <Ink delay={Math.min(0.04 * i, 0.4)}>
              <Portrait
                hen={hen}
                index={i + 1}
                profile={profiles[hen.id]}
                isYou={myHenId === hen.id}
              />
            </Ink>
          </li>
        ))}
      </ol>
    </PageFrame>
  );
}

function Portrait({
  hen,
  index,
  profile,
  isYou,
}: {
  hen: Hen;
  index: number;
  profile?: Profile;
  isYou: boolean;
}) {
  const photo = profile?.avatar_path ? avatarUrl(profile.avatar_path) : null;
  const line = profile?.note || hen.funFact;
  return (
    <div className="grid grid-cols-[88px_1fr] gap-5 items-start">
      <div
        className="relative w-[88px] aspect-[4/5] overflow-hidden"
        style={{
          background: "var(--color-paper-warm)",
          border: "0.5px solid var(--color-rule)",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={hen.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-display italic"
              style={{ color: "var(--color-ink)", opacity: 0.35, fontSize: "32px", lineHeight: 1 }}
            >
              {monogram(hen.name)}
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2.5">
          <span
            className="font-display italic tabular-nums"
            style={{ color: "var(--color-gold)", fontSize: "12px" }}
          >
            {String(index).padStart(2, "0")}
          </span>
          {hen.isMoH && <Tag>MoH</Tag>}
          {isYou && <Tag>You</Tag>}
        </div>

        <h3
          className="font-display mt-1"
          style={{
            fontSize: "clamp(24px, 5.5vw, 30px)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            fontWeight: 500,
            color: "var(--color-ink)",
          }}
        >
          {hen.name}
        </h3>

        <p
          className="mt-1.5 text-[10px] uppercase tracking-eyebrow font-medium"
          style={{ color: "var(--color-gold)" }}
        >
          {hen.relation}
        </p>

        {line && (
          <p
            className="font-display italic mt-3"
            style={{
              color: "var(--color-ink)",
              opacity: 0.78,
              fontSize: "15px",
              lineHeight: 1.5,
              letterSpacing: "-0.005em",
            }}
          >
            {line}
          </p>
        )}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[8.5px] uppercase tracking-eyebrow font-medium px-1.5 py-0.5 border"
      style={{ color: "var(--color-paper)", background: "var(--color-ink)", borderColor: "var(--color-ink)" }}
    >
      {children}
    </span>
  );
}

function ClaimCard({
  me,
  profiles,
  myHenId,
  onSaved,
}: {
  me: Guest;
  profiles: Record<string, Profile>;
  myHenId: string | null;
  onSaved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string>(myHenId ?? "");
  const [note, setNote] = useState<string>(myHenId ? profiles[myHenId]?.note ?? "" : "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (myHenId) {
      setPicked(myHenId);
      setNote(profiles[myHenId]?.note ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHenId]);

  // Hens not yet claimed by someone else (plus your own).
  const claimable = HENS.filter((h) => {
    const p = profiles[h.id];
    return !p?.claimed_by || p.claimed_by === me.id;
  });

  const saveNote = async () => {
    if (!picked) return;
    setBusy(true);
    const sb = supabase();
    const { error } = await sb
      .from("hen_profiles")
      .upsert(
        { hen_id: picked, note: note.slice(0, 140), claimed_by: me.id },
        { onConflict: "hen_id" },
      );
    setBusy(false);
    setFlash(error ? "That name's already taken by someone else." : "Saved.");
    setTimeout(() => setFlash(null), 2500);
    if (!error) onSaved();
  };

  const onFile = async (file: File) => {
    if (!picked) {
      setFlash("Pick your name first.");
      setTimeout(() => setFlash(null), 2500);
      return;
    }
    setBusy(true);
    const sb = supabase();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${me.id}/${picked}.${ext}`;
    const up = await sb.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });
    if (up.error) {
      setBusy(false);
      setFlash(`Upload failed: ${up.error.message}`);
      setTimeout(() => setFlash(null), 3000);
      return;
    }
    const { error } = await sb
      .from("hen_profiles")
      .upsert(
        { hen_id: picked, avatar_path: path, note: note.slice(0, 140), claimed_by: me.id },
        { onConflict: "hen_id" },
      );
    setBusy(false);
    setFlash(error ? "That name's already taken." : "Photo added ✓");
    setTimeout(() => setFlash(null), 2500);
    if (!error) onSaved();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="border p-5 mb-8" style={{ borderColor: "var(--color-rule-gold)" }}>
      <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
        {myHenId ? "Your profile" : "Add yourself"}
      </p>
      <p
        className="font-display italic mt-1"
        style={{ color: "var(--color-ink)", opacity: 0.7, fontSize: "13px" }}
      >
        Pick your name, add a photo and a line — so everyone knows who you are.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="label text-[8.5px]" style={{ color: "var(--color-ink)", opacity: 0.55 }}>
            Which one are you?
          </span>
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="mt-1.5 w-full border-b py-2.5 bg-transparent focus:outline-none font-display"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)", fontSize: "17px" }}
          >
            <option value="">Choose your name…</option>
            {claimable.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label text-[8.5px]" style={{ color: "var(--color-ink)", opacity: 0.55 }}>
            How you know Grace
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder="e.g. school friends since we were 12"
            className="mt-1.5 w-full border-b py-2.5 bg-transparent focus:outline-none font-display"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)", fontSize: "16px" }}
          />
        </label>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy || !picked}
            onClick={() => fileRef.current?.click()}
            className="flex-1 border py-3 label text-[9px] disabled:opacity-40"
            style={{ borderColor: "var(--color-gold)", color: "var(--color-ink)", minHeight: "44px" }}
          >
            {busy ? "Working…" : myHenId && profiles[myHenId]?.avatar_path ? "Change photo" : "Add photo"}
          </button>
          <button
            type="button"
            disabled={busy || !picked}
            onClick={saveNote}
            className="flex-1 py-3 label text-[9px] disabled:opacity-40"
            style={{
              background: "var(--color-navy)",
              color: "var(--color-paper)",
              border: "0.5px solid var(--color-navy)",
              minHeight: "44px",
            }}
          >
            Save line
          </button>
        </div>
        {flash && (
          <p className="font-display italic text-center" style={{ color: "var(--color-gold)", fontSize: "13px" }}>
            {flash}
          </p>
        )}
      </div>
    </div>
  );
}

function monogram(name: string): string {
  const parts = name.split(" ").filter((p) => /^[A-Za-z]/.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
