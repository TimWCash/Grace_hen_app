"use client";

import { useState } from "react";
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
      eyebrow="By Invitation Only"
      title="Settings"
      subtitle={guest ? `Signed in as ${guest.display_name}` : ""}
    >
      {/* Admin section */}
      <section
        className="rounded-xl border p-5"
        style={{
          background: "var(--color-ivory)",
          borderColor: "var(--color-rule)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.4em] text-center mb-3"
          style={{ color: "var(--color-gold)" }}
        >
          {isAdmin ? "Admin · Unlocked" : "Admin"}
        </p>

        {isAdmin ? (
          <div className="text-center">
            <div
              className="font-display text-2xl mb-2"
              style={{ color: "var(--color-navy)" }}
            >
              You can edit the night.
            </div>
            <p
              className="font-display italic text-sm leading-snug"
              style={{ color: "var(--color-navy)", opacity: 0.7 }}
            >
              Open the itinerary or polls — admin controls appear inline.
            </p>
            <div className="gold-rule my-5 mx-auto w-32" />
            <ul
              className="text-sm space-y-1 text-left mx-auto inline-block"
              style={{ color: "var(--color-navy)", opacity: 0.85 }}
            >
              <li>· Tap a stop's status pill to mark it Here / Done / Skipped</li>
              <li>· Add a new poll from the Polls page</li>
              <li>· Close or reopen any poll</li>
              <li>· View the locked photo album any time</li>
            </ul>
          </div>
        ) : (
          <>
            <p
              className="font-display italic text-center text-sm"
              style={{ color: "var(--color-navy)", opacity: 0.75 }}
            >
              For Fiona. Unlocks editing the plan, polls, and photo album live.
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
                const next = await refresh();
                setPin("");
                if (next) {
                  router.refresh();
                }
              }}
              className="mt-4 space-y-2"
            >
              <label className="block">
                <span
                  className="text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "var(--color-gold)" }}
                >
                  Admin PIN
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-4 py-3 font-display text-lg tracking-[0.4em] text-center"
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    borderColor: "var(--color-rule)",
                    color: "var(--color-navy)",
                  }}
                />
              </label>
              {pinError && (
                <p
                  className="text-sm font-display italic text-center"
                  style={{ color: "var(--color-oxblood)" }}
                >
                  {pinError}
                </p>
              )}
              <button
                type="submit"
                disabled={unlocking || pin.length === 0}
                className="w-full rounded-lg py-3 font-display tracking-wider transition-all disabled:opacity-50"
                style={{
                  background: "var(--color-navy)",
                  color: "var(--color-cream)",
                  border: "1px solid var(--color-gold)",
                }}
              >
                {unlocking ? "Checking…" : "Unlock"}
              </button>
            </form>
          </>
        )}
      </section>

      {/* Account section */}
      <section
        className="rounded-xl border p-5 mt-4"
        style={{
          background: "rgba(255, 255, 255, 0.7)",
          borderColor: "var(--color-rule)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-3"
          style={{ color: "var(--color-gold)" }}
        >
          Account
        </p>
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-display text-lg"
              style={{ color: "var(--color-navy)" }}
            >
              {guest?.display_name ?? "—"}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--color-navy)", opacity: 0.6 }}
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
            className="rounded-md border px-4 py-2 text-sm font-display"
            style={{
              borderColor: "var(--color-rule)",
              color: "var(--color-navy)",
              background: "rgba(255,255,255,0.5)",
            }}
          >
            Sign out
          </button>
        </div>
      </section>

      <p
        className="text-[10px] uppercase tracking-[0.35em] mt-8 text-center"
        style={{ color: "var(--color-navy)", opacity: 0.45 }}
      >
        Made for Grace · G · M · MMXXVI
      </p>
    </PageFrame>
  );
}
