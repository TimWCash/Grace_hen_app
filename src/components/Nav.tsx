"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
};

const items: Item[] = [
  { href: "/", label: "Cover" },
  { href: "/tonight", label: "Tonight" },
  { href: "/itinerary", label: "Program" },
  { href: "/photos", label: "Trophy" },
  { href: "/more", label: "More" },
];

// Sub-pages reached via /more highlight the More tab.
const MORE_SECTIONS = ["/guests", "/games", "/polls", "/map", "/essentials", "/settings", "/admin"];

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
      <ul className="mx-auto max-w-[640px] grid grid-cols-5">
        {items.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/more"
              ? pathname?.startsWith("/more") ||
                MORE_SECTIONS.some((s) => pathname?.startsWith(s))
              : pathname?.startsWith(href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className="flex flex-1 items-center justify-center py-4 relative"
                style={{ minHeight: "52px" }}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className="label text-[9.5px]"
                  style={{
                    color: "var(--color-navy)",
                    opacity: active ? 1 : 0.55,
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-px"
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
