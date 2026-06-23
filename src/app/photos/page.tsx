"use client";

import { useEffect, useRef, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { PHOTO_REVEAL_DATE, countdownParts } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";

type RevealedPhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  signedUrl?: string;
};

export default function PhotosPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parts, setParts] = useState(() => countdownParts(PHOTO_REVEAL_DATE));
  const [guestId, setGuestId] = useState<string | null>(null);
  const [serverRevealed, setServerRevealed] = useState<boolean | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [myCount, setMyCount] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedPhoto[] | null>(null);

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(PHOTO_REVEAL_DATE)), 1000);
    return () => clearInterval(id);
  }, []);

  // Server is the source of truth for the lock. Fall back to the date only
  // while the RPC is loading, so Fiona's "develop now" actually unlocks here.
  const locked = serverRevealed === null ? parts.total > 0 : !serverRevealed;

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const refresh = async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);

      const [{ data: total }, { data: mine }, { data: rev }] = await Promise.all([
        sb.rpc("photo_count"),
        sb.rpc("my_photo_count"),
        sb.rpc("photos_revealed"),
      ]);
      if (cancelled) return;
      if (typeof total === "number") setTotalCount(total);
      if (typeof mine === "number") setMyCount(mine);
      const isRevealed = !!rev;
      setServerRevealed(isRevealed);

      if (isRevealed) {
        const { data: photos } = await sb
          .from("photos")
          .select("*")
          .order("taken_at", { ascending: false });
        if (photos) {
          const withUrls = await Promise.all(
            (photos as RevealedPhoto[]).map(async (p) => {
              const { data } = await sb.storage
                .from("photos")
                .createSignedUrl(p.storage_path, 60 * 60);
              return { ...p, signedUrl: data?.signedUrl };
            }),
          );
          if (!cancelled) setRevealed(withUrls);
        }
      }
    };
    refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guestId) return;
    setUploading(true);
    setFlash(null);
    try {
      const sb = supabase();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${guestId}/${filename}`;

      const { error: upErr } = await sb.storage
        .from("photos")
        .upload(path, file, { contentType: file.type || `image/${ext}`, upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await sb
        .from("photos")
        .insert({ guest_id: guestId, storage_path: path });
      if (dbErr) throw dbErr;

      setMyCount((c) => c + 1);
      setTotalCount((c) => c + 1);
      setFlash("Sealed in the album.");
      setTimeout(() => setFlash(null), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error(err);
      setFlash(`Couldn't save: ${msg}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <PageFrame
      sectionMark="III"
      eyebrow="Captured · Sealed · Revealed"
      title="The Trophy Room"
      subtitle="Every photo from the night, kept in the dark until the morning after."
    >
      {/* Sealed vault card (intentionally dark; flips with night mode tokens) */}
      <div
        className="border p-7 text-center"
        style={{ background: "var(--color-navy)", borderColor: "var(--color-rule-gold)" }}
      >
        <p className="label text-[10px]" style={{ color: "var(--color-gold-soft)" }}>
          {locked ? "Develops On" : "Now Revealed"}
        </p>
        <p className="font-display mt-3" style={{ color: "var(--color-paper)", fontSize: "30px", letterSpacing: "-0.02em" }}>
          28 June 2026
        </p>
        <div className="mx-auto my-6 w-12" style={{ height: "0.5px", background: "var(--color-rule-gold)" }} />

        {/* Monogram seal — a square, in keeping with the no-radius system */}
        <div
          className="mx-auto w-24 h-24 border flex items-center justify-center"
          style={{ borderColor: "var(--color-rule-gold)" }}
        >
          <div className="flex flex-col items-center leading-none" style={{ color: "var(--color-gold-soft)" }}>
            <span className="font-display italic" style={{ fontSize: "30px" }}>G</span>
            <span className="font-display italic" style={{ fontSize: "15px", opacity: 0.8 }}>&amp;</span>
            <span className="font-display italic" style={{ fontSize: "30px" }}>M</span>
          </div>
        </div>

        {locked ? (
          <>
            <p
              className="font-display italic mt-6"
              style={{ color: "var(--color-paper)", opacity: 0.85, fontSize: "15px", lineHeight: 1.5 }}
            >
              Snap as much as you like. No one sees a thing until the morning after.
            </p>
            <div className="mt-6 grid grid-cols-4 gap-0 border-t border-b" style={{ borderColor: "var(--color-rule-gold)" }}>
              {[
                { v: parts.days, l: "Days" },
                { v: parts.hours, l: "Hrs" },
                { v: parts.minutes, l: "Min" },
                { v: parts.seconds, l: "Sec" },
              ].map((c, i) => (
                <div
                  key={c.l}
                  className={`py-3 ${i > 0 ? "border-l" : ""}`}
                  style={{ borderColor: "var(--color-rule-gold)" }}
                >
                  <div className="font-display tabular-nums" style={{ color: "var(--color-paper)", fontSize: "24px" }}>
                    {String(c.v).padStart(2, "0")}
                  </div>
                  <div className="label text-[7.5px] mt-1" style={{ color: "var(--color-gold-soft)" }}>
                    {c.l}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="font-display italic mt-6" style={{ color: "var(--color-paper)", fontSize: "16px" }}>
            {revealed && revealed.length > 0 ? "Tap any tile to view full size." : "The album waits."}
          </p>
        )}
      </div>

      {/* Capture */}
      <div className="mt-6">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !guestId}
          className="w-full border py-4 label text-[10px] disabled:opacity-60"
          style={{
            background: "var(--color-navy)",
            color: "var(--color-paper)",
            border: "0.5px solid var(--color-navy)",
            minHeight: "52px",
          }}
        >
          {uploading ? "Saving" : "Capture a Moment"}
        </button>
        <p className="label text-[8.5px] mt-3 text-center" style={{ color: "var(--color-navy)", opacity: 0.55 }}>
          {myCount > 0 ? `You've sealed ${myCount} · the room has ${totalCount}` : "Photos go straight to the sealed album"}
        </p>
        {flash && (
          <p className="font-display italic text-center mt-2" style={{ color: "var(--color-gold)" }}>
            {flash}
          </p>
        )}
      </div>

      {/* Album */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
            {locked ? "Sealed Album" : "The Album"}
          </span>
          <span className="font-display tabular-nums" style={{ color: "var(--color-navy)", fontSize: "22px" }}>
            {String(totalCount).padStart(2, "0")}
          </span>
        </div>
        <div className="rule mt-2 mb-4" />
        {locked ? <LockedGrid count={totalCount} /> : <RevealedGrid photos={revealed ?? []} />}
        <p className="font-display italic text-center mt-5" style={{ color: "var(--color-navy)", opacity: 0.6, fontSize: "14px" }}>
          {totalCount === 0
            ? "Nothing captured yet — be the first."
            : locked
            ? `${totalCount} ${totalCount === 1 ? "moment" : "moments"} sealed.`
            : `${totalCount} ${totalCount === 1 ? "photo" : "photos"} revealed.`}
        </p>
      </div>
    </PageFrame>
  );
}

function LockedGrid({ count }: { count: number }) {
  const tiles = Math.max(12, Math.min(count + 3, 24));
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="aspect-square border flex items-center justify-center"
          style={{ background: "var(--color-navy)", borderColor: "var(--color-rule)" }}
        >
          <span className="font-display italic" style={{ color: "var(--color-gold-soft)", opacity: 0.4, fontSize: "18px" }}>
            ·
          </span>
        </div>
      ))}
    </div>
  );
}

function RevealedGrid({ photos }: { photos: RevealedPhoto[] }) {
  if (photos.length === 0) return <LockedGrid count={0} />;
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {photos.map((p) => (
        <a
          key={p.id}
          href={p.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-square border overflow-hidden"
          style={{ borderColor: "var(--color-rule)" }}
        >
          {p.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.signedUrl} alt={p.caption ?? ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full animate-pulse" style={{ background: "var(--color-paper-warm)" }} />
          )}
        </a>
      ))}
    </div>
  );
}
