"use client";

import { useEffect, useRef, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { WEDDING_DATE, countdownParts } from "@/lib/dates";
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
  const [parts, setParts] = useState(() => countdownParts(WEDDING_DATE));
  const [guestId, setGuestId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [myCount, setMyCount] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedPhoto[] | null>(null);

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(WEDDING_DATE)), 1000);
    return () => clearInterval(id);
  }, []);

  const locked = parts.total > 0;

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const refresh = async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);

      const [{ data: total }, { data: mine }] = await Promise.all([
        sb.rpc("photo_count"),
        sb.rpc("my_photo_count"),
      ]);
      if (cancelled) return;
      if (typeof total === "number") setTotalCount(total);
      if (typeof mine === "number") setMyCount(mine);

      if (!locked) {
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
  }, [locked]);

  const onPick = () => fileRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guestId) return;
    setUploading(true);
    setFlash(null);
    try {
      const sb = supabase();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const path = `${guestId}/${filename}`;

      const { error: upErr } = await sb.storage
        .from("photos")
        .upload(path, file, {
          contentType: file.type || `image/${ext}`,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { error: dbErr } = await sb.from("photos").insert({
        guest_id: guestId,
        storage_path: path,
      });
      if (dbErr) throw dbErr;

      setMyCount((c) => c + 1);
      setTotalCount((c) => c + 1);
      setFlash("Sealed in the album. ✦");
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
      eyebrow="Captured · Sealed · Revealed"
      title="The Reveal"
      subtitle="every photo from the weekend, kept in the dark until the day"
    >
      <div
        className="rounded-2xl border p-6 text-center overflow-hidden relative"
        style={{
          background:
            "linear-gradient(180deg, var(--color-navy) 0%, var(--color-navy-deep) 100%)",
          borderColor: "var(--color-rule)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.08] paper-grain pointer-events-none" />
        <p
          className="text-[10px] uppercase tracking-[0.45em] mb-4"
          style={{ color: "var(--color-gold-soft)" }}
        >
          {locked ? "Develops On" : "Now Revealed"}
        </p>
        <p
          className="font-display text-3xl"
          style={{ color: "var(--color-cream)" }}
        >
          11 July 2026
        </p>
        <div className="gold-rule my-5 mx-auto w-24" />

        <div className="relative mx-auto w-28 h-28 my-2">
          <div
            className="absolute inset-0 rounded-full seal-stamp shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #8a2a3c, var(--color-oxblood) 60%, #4a0f1c 100%)",
            }}
          />
          <div
            className="absolute inset-2 rounded-full border seal-stamp flex items-center justify-center"
            style={{
              borderColor: "var(--color-gold-soft)",
              animationDelay: "0.1s",
            }}
          >
            <div className="flex flex-col items-center leading-none text-[#f3e3b8]">
              <span className="font-display italic text-3xl -mb-1">G</span>
              <span className="font-display italic text-base opacity-80">&amp;</span>
              <span className="font-display italic text-3xl -mt-1">M</span>
            </div>
          </div>
        </div>

        {locked ? (
          <>
            <p
              className="font-display italic text-base mt-4"
              style={{ color: "var(--color-cream)", opacity: 0.85 }}
            >
              Snap as much as you like.<br />
              No one sees a thing until the wedding day.
            </p>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {[
                { v: parts.days, l: "D" },
                { v: parts.hours, l: "H" },
                { v: parts.minutes, l: "M" },
                { v: parts.seconds, l: "S" },
              ].map((c) => (
                <div
                  key={c.l}
                  className="rounded-md py-2 border"
                  style={{
                    borderColor: "rgba(214, 191, 134, 0.3)",
                    background: "rgba(245, 239, 224, 0.05)",
                  }}
                >
                  <div
                    className="font-display text-2xl tabular-nums"
                    style={{ color: "var(--color-cream)" }}
                  >
                    {String(c.v).padStart(2, "0")}
                  </div>
                  <div
                    className="text-[9px] tracking-[0.3em] mt-0.5"
                    style={{ color: "var(--color-gold-soft)" }}
                  >
                    {c.l}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p
            className="font-display italic text-lg mt-4"
            style={{ color: "var(--color-cream)" }}
          >
            {revealed && revealed.length > 0
              ? "Tap any tile to view full size."
              : "No photos yet — the album waits."}
          </p>
        )}
      </div>

      <div className="mt-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onChange}
        />
        <button
          type="button"
          onClick={onPick}
          disabled={uploading || !guestId}
          className="w-full rounded-xl border-2 py-4 font-display text-lg tracking-wide transition-all active:scale-[0.99] disabled:opacity-60"
          style={{
            background: "var(--color-cream)",
            color: "var(--color-navy)",
            borderColor: "var(--color-gold)",
          }}
        >
          <span
            className="text-2xl mr-2"
            style={{ color: "var(--color-oxblood)" }}
          >
            ●
          </span>
          {uploading ? "Saving…" : "Capture a Moment"}
        </button>
        <p
          className="text-center text-[10px] uppercase tracking-[0.3em] mt-3"
          style={{ color: "var(--color-navy)", opacity: 0.55 }}
        >
          {myCount > 0
            ? `You've sealed ${myCount} · the room has ${totalCount}`
            : "Photos go straight to the sealed album"}
        </p>
        {flash && (
          <p
            className="text-center font-display italic mt-2"
            style={{ color: "var(--color-gold)" }}
          >
            {flash}
          </p>
        )}
      </div>

      <div className="mt-8 relative">
        {/* Envelope frame */}
        <div
          className="rounded-lg p-3"
          style={{
            background: "var(--color-ivory)",
            border: "1px solid var(--color-rule)",
            boxShadow:
              "inset 0 0 0 1px rgba(251, 248, 239, 0.4), inset 0 0 0 2px rgba(184, 155, 94, 0.25), 0 6px 18px -14px rgba(10, 31, 68, 0.2)",
          }}
        >
          <div className="flex items-center justify-between px-1 mb-3">
            <span
              className="text-[9px] uppercase tracking-[0.4em]"
              style={{ color: "var(--color-gold)" }}
            >
              {locked ? "Sealed Album" : "The Album"}
            </span>
            <span
              className="font-display tabular-nums text-2xl leading-none"
              style={{ color: "var(--color-navy)" }}
            >
              {String(totalCount).padStart(2, "0")}
            </span>
          </div>
          {locked ? (
            <LockedGrid count={totalCount} />
          ) : (
            <RevealedGrid photos={revealed ?? []} />
          )}
        </div>
        <p
          className="text-center font-display italic mt-5"
          style={{ color: "var(--color-navy)", opacity: 0.72 }}
        >
          {totalCount === 0
            ? "0 captures so far — be the first."
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
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-md border flex items-center justify-center relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-deep) 100%)",
            borderColor: "var(--color-rule)",
          }}
        >
          <div className="paper-grain absolute inset-0 opacity-[0.08]" />
          <div
            className="font-display italic text-2xl shimmer"
            style={{ color: "var(--color-gold-soft)" }}
          >
            ?
          </div>
        </div>
      ))}
    </div>
  );
}

function RevealedGrid({ photos }: { photos: RevealedPhoto[] }) {
  if (photos.length === 0) {
    return <LockedGrid count={0} />;
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <a
          key={p.id}
          href={p.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-square rounded-md border overflow-hidden relative"
          style={{ borderColor: "var(--color-rule)" }}
        >
          {p.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.signedUrl}
              alt={p.caption ?? ""}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-200 animate-pulse" />
          )}
        </a>
      ))}
    </div>
  );
}
