"use client";

import Link from "next/link";
import { useGuest } from "./GuestProvider";

export function AdminBadge() {
  const { isAdmin, guest } = useGuest();
  if (!isAdmin) return null;
  return (
    <Link
      href="/settings"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 border"
      style={{
        background: "var(--color-ink)",
        color: "var(--color-paper)",
        borderColor: "var(--color-ink)",
      }}
      aria-label="Admin mode"
    >
      <span
        className="inline-block w-1 h-1"
        style={{ background: "var(--color-gold)" }}
      />
      <span className="text-[8.5px] uppercase tracking-eyebrow font-medium">
        Admin · {guest?.display_name?.split(" ")[0] ?? "On"}
      </span>
    </Link>
  );
}
