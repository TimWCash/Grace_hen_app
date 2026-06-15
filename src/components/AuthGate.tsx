"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { enterEvent, getCurrentGuest, rememberedName } from "@/lib/guest";
import type { Guest } from "@/lib/supabase";
import { GuestProvider } from "./GuestProvider";
import { Wordmark } from "./Wordmark";
import { Ink } from "./Ink";

// Routes that should render without the auth gate.
const PUBLIC_ROUTES = ["/nice-try", "/logout"];

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some((r) => pathname?.startsWith(r));

  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">(
    "loading",
  );
  const [guest, setGuest] = useState<Guest | null>(null);
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setName(rememberedName());
    getCurrentGuest().then((g) => {
      if (!mounted) return;
      if (g) {
        setGuest(g);
        setStatus("unlocked");
      } else {
        setStatus("locked");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Public routes bypass the gate entirely.
  if (isPublic) return <>{children}</>;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="opacity-30">
          <Wordmark size="md" />
        </div>
      </div>
    );
  }

  if (status === "unlocked")
    return <GuestProvider initialGuest={guest}>{children}</GuestProvider>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-full max-w-[420px]">
        <Ink delay={0.05}>
          <div className="text-center">
            <p
              className="text-[9px] uppercase tracking-eyebrow font-medium"
              style={{ color: "var(--color-ink)", opacity: 0.55 }}
            >
              Private
            </p>
            <div className="rule mt-3" />
            <div className="mt-6 mb-6 flex justify-center">
              <Wordmark size="lg" />
            </div>
            <div className="rule" />
          </div>
        </Ink>

        <Ink delay={0.2}>
          <p
            className="font-display italic text-center mt-8"
            style={{ color: "var(--color-ink)", opacity: 0.7, fontSize: "16px" }}
          >
            Dublin · 27 June 2026
          </p>
          <h1
            className="font-display text-center mt-6"
            style={{
              fontSize: "clamp(48px, 13vw, 80px)",
              lineHeight: 0.88,
              letterSpacing: "-0.04em",
              color: "var(--color-ink)",
              fontWeight: 500,
            }}
          >
            GRACE
          </h1>
          <p
            className="mt-6 text-[10px] uppercase tracking-eyebrow font-medium text-center"
            style={{ color: "var(--color-ink)", opacity: 0.6 }}
          >
            The Hen Weekend
          </p>
        </Ink>

        <Ink delay={0.4}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              const res = await enterEvent(passcode, name);
              setSubmitting(false);
              if (!res.ok) {
                // Wrong passcode (or other failure) → show them out.
                router.push("/nice-try");
                return;
              }
              setGuest(res.guest);
              setStatus("unlocked");
            }}
            className="mt-12 space-y-5"
          >
            <Field
              label="Your name"
              value={name}
              onChange={setName}
              autoComplete="given-name"
              required
            />
            <Field
              label="Passcode"
              value={passcode}
              onChange={setPasscode}
              autoComplete="off"
              autoCapitalize="off"
              required
              tracked
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 transition-opacity disabled:opacity-50 mt-2"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-paper)",
                border: "0.5px solid var(--color-ink)",
              }}
            >
              <span className="text-[10px] uppercase tracking-eyebrow font-medium">
                {submitting ? "Opening" : "Enter"}
              </span>
            </button>
          </form>
        </Ink>

        <Ink delay={0.55}>
          <p
            className="mt-10 text-[9px] uppercase tracking-eyebrow font-medium text-center"
            style={{ color: "var(--color-ink)", opacity: 0.4 }}
          >
            Hen · 27 June · Wedding · 11 July
          </p>
        </Ink>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  autoCapitalize,
  required,
  tracked = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoCapitalize?: string;
  required?: boolean;
  tracked?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="text-[9px] uppercase tracking-eyebrow font-medium"
        style={{ color: "var(--color-ink)", opacity: 0.55 }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        required={required}
        className="mt-2 w-full border-b py-3 font-display bg-transparent focus:outline-none"
        style={{
          borderColor: "var(--color-rule)",
          color: "var(--color-ink)",
          fontSize: "20px",
          letterSpacing: tracked ? "0.25em" : "0",
        }}
      />
    </label>
  );
}
