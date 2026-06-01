"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOutGuest } from "@/lib/guest";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    signOutGuest().finally(() => {
      if (cancelled) return;
      // Hard navigate to clear in-memory state, not just route push.
      window.location.href = "/";
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--color-paper)" }}
    >
      <p
        className="label text-[10px]"
        style={{ color: "var(--color-navy)", opacity: 0.5 }}
      >
        Signing out…
      </p>
    </div>
  );
}
