"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
};

const items: Item[] = [
  { href: "/", label: "Cover" },
  { href: "/itinerary", label: "Program" },
  { href: "/map", label: "Squad" },
  { href: "/photos", label: "Trophy" },
  { href: "/guests", label: "Hens" },
  { href: "/polls", label: "Ballot" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-rule)",
      }}
    >
      <ul className="mx-auto max-w-[640px] grid grid-cols-6">
        {items.map(({ href, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className="flex flex-1 items-center justify-center py-3.5 relative"
                aria-current={active ? "page" : undefined}
              >
                <span
                  className="text-[9px] uppercase tracking-eyebrow"
                  style={{
                    color: active ? "var(--color-ink)" : "var(--color-ink)",
                    opacity: active ? 1 : 0.55,
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-px"
                    style={{ background: "var(--color-gold)" }}
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
