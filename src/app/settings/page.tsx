"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageFrame } from "@/components/PageFrame";
import { useGuest } from "@/components/GuestProvider";
import { signOutGuest, tryUnlockAdmin } from "@/lib/guest";

export default function SettingsPage() {
  const router = useRouter();
  const { guest, isAdmin, refresh, setGuest } = useGuest();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  return (
    <PageFrame
      sectionMark="Settings"
      eyebrow="By Invitation Only"
      title="Settings"
      subtitle={guest ? `Signed in as ${guest.display_name}` : ""}
    >
      {/* Admin */}
      <section className="border p-5" style={{ borderColor: "var(--color-rule)" }}>
        <p className="label text-[10px] text-center" style={{ color: "var(--color-gold)" }}>
          {isAdmin ? "Concierge · Unlocked" : "Concierge"}
        </p>
        <div className="rule mt-3 mb-4" />

        {isAdmin ? (
          <div className="text-center">
            <p
              className="font-display"
              style={{ color: "var(--color-navy)", fontSize: "24px", letterSpacing: "-0.02em" }}
            >
              You can run the night.
            </p>
            <p
              className="font-display italic mt-2"
              style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px" }}
            >
              Send warnings, take orders, trigger Mark&apos;s video.
            </p>
            <Link
              href="/admin"
              className="mt-5 inline-flex items-center justify-center w-full py-4 label text-[10px]"
              style={{
                background: "var(--color-navy)",
                color: "var(--color-paper)",
                border: "0.5px solid var(--color-navy)",
                minHeight: "48px",
              }}
            >
              Open the Concierge dashboard →
            </Link>
          </div>
        ) : (
          <>
            <p
              className="font-display italic text-center"
              style={{ color: "var(--color-navy)", opacity: 0.75, fontSize: "14px" }}
            >
              For Fiona &amp; Claire. Unlocks running the night — warnings, orders, the album.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPinError(null);
                setUnlocking(true);
                const ok = await tryUnlockAdmin(pin);
                setUnlocking(false);
                if (!ok) {
                  setPinError("Wrong PIN");
                  return;
                }
                await refresh();
                setPin("");
                router.refresh();
              }}
              className="mt-5"
            >
              <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
                Admin PIN
              </span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-2 w-full border-b py-3 bg-transparent focus:outline-none font-display text-center"
                style={{
                  borderColor: "var(--color-rule)",
                  color: "var(--color-navy)",
                  fontSize: "22px",
                  letterSpacing: "0.4em",
                }}
              />
              {pinError && (
                <p
                  className="font-display italic text-center mt-3"
                  style={{ color: "var(--color-destructive)", fontSize: "14px" }}
                >
                  {pinError}
                </p>
              )}
              <button
                type="submit"
                disabled={unlocking || pin.length === 0}
                className="mt-4 w-full py-4 label text-[10px] disabled:opacity-50"
                style={{
                  background: "var(--color-navy)",
                  color: "var(--color-paper)",
                  border: "0.5px solid var(--color-navy)",
                  minHeight: "48px",
                }}
              >
                {unlocking ? "Checking" : "Unlock"}
              </button>
            </form>
          </>
        )}
      </section>

      {/* Account */}
      <section
        className="border p-5 mt-4 flex items-center justify-between"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div>
          <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
            Account
          </span>
          <div
            className="font-display mt-1.5"
            style={{ color: "var(--color-navy)", fontSize: "20px" }}
          >
            {guest?.display_name ?? "—"}
          </div>
          <div
            className="label text-[8.5px] mt-0.5"
            style={{ color: "var(--color-navy)", opacity: 0.55 }}
          >
            {guest?.is_bride ? "Bride" : isAdmin ? "Admin" : "Hen"}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOutGuest();
            setGuest(null);
            window.location.href = "/";
          }}
          className="border px-5 py-3 label text-[9px]"
          style={{
            borderColor: "var(--color-rule)",
            color: "var(--color-navy)",
            minHeight: "44px",
          }}
        >
          Sign out
        </button>
      </section>

      <p
        className="label text-[9px] mt-10 text-center"
        style={{ color: "var(--color-navy)", opacity: 0.45 }}
      >
        Made for Grace · Dublin · MMXXVI
      </p>
    </PageFrame>
  );
}
