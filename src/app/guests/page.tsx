import { PageFrame } from "@/components/PageFrame";
import { Ink } from "@/components/Ink";
import { HENS, type Hen } from "@/lib/hens";
import Image from "next/image";

export default function GuestsPage() {
  return (
    <PageFrame
      sectionMark="VII"
      eyebrow="The Hens · Roll Call"
      title="The Guests"
      subtitle="The hens, in order of arrival."
    >
      <ol className="space-y-0 mt-2">
        {HENS.map((hen, i) => (
          <li
            key={hen.id}
            className={`py-10 ${i === 0 ? "" : "border-t"}`}
            style={{ borderColor: "var(--color-rule)" }}
          >
            <Ink delay={Math.min(0.05 * i, 0.4)}>
              <Portrait hen={hen} index={i + 1} />
            </Ink>
          </li>
        ))}
      </ol>

      <div
        className="mt-10 py-10 border-t text-center"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <p
          className="text-[10px] uppercase tracking-eyebrow font-medium"
          style={{ color: "var(--color-ink)", opacity: 0.55 }}
        >
          Edit this list in
        </p>
        <p
          className="font-display italic mt-2"
          style={{ color: "var(--color-ink)", opacity: 0.7, fontSize: "14px" }}
        >
          src/lib/hens.ts
        </p>
      </div>
    </PageFrame>
  );
}

function Portrait({ hen, index }: { hen: Hen; index: number }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-5 items-start">
      {/* Photo / monogram */}
      <div
        className="relative w-[88px] aspect-[4/5] overflow-hidden"
        style={{
          background: "var(--color-paper-warm)",
          border: "0.5px solid var(--color-rule)",
        }}
      >
        {hen.photo ? (
          <Image
            src={hen.photo}
            alt={hen.name}
            fill
            sizes="88px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-display italic"
              style={{
                color: "var(--color-ink)",
                opacity: 0.35,
                fontSize: "32px",
                lineHeight: 1,
              }}
            >
              {monogram(hen.name)}
            </span>
          </div>
        )}
      </div>

      {/* Text column */}
      <div>
        <div className="flex items-baseline gap-2.5">
          <span
            className="font-display italic tabular-nums"
            style={{
              color: "var(--color-gold)",
              fontSize: "12px",
            }}
          >
            {String(index).padStart(2, "0")}
          </span>
          {hen.isMoH && (
            <span
              className="text-[8.5px] uppercase tracking-eyebrow font-medium px-1.5 py-0.5 border"
              style={{
                color: "var(--color-paper)",
                background: "var(--color-ink)",
                borderColor: "var(--color-ink)",
              }}
            >
              MoH
            </span>
          )}
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
          {hen.funFact}
        </p>
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
