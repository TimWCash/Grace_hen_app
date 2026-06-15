import { PageFrame } from "@/components/PageFrame";
import { EVENT } from "@/config/event";

export default function EssentialsPage() {
  const e = EVENT.essentials;
  return (
    <PageFrame
      sectionMark="V"
      eyebrow="Everything you need"
      title="Essentials"
      subtitle="Dress, meeting point, contacts, taxis — and what to do if you lose the group."
    >
      <Row label="Dress">{e.dressCode}</Row>
      <Row label={e.meetingPoint.label}>{e.meetingPoint.value}</Row>
      <Row label={e.hotel.label}>{e.hotel.value}</Row>

      <Block label="Who to call">
        {e.contacts.map((c) => (
          <div key={c.name} className="mb-3 last:mb-0">
            <div
              className="font-display"
              style={{ color: "var(--color-navy)", fontSize: "20px" }}
            >
              {c.name}
            </div>
            <div
              className="label text-[9px] mt-0.5"
              style={{ color: "var(--color-gold)" }}
            >
              {c.role}
            </div>
            <a
              href={c.phone.startsWith("[") ? undefined : `tel:${c.phone.replace(/\s/g, "")}`}
              className="font-display italic mt-1 inline-block"
              style={{
                color: "var(--color-navy)",
                opacity: 0.85,
                fontSize: "16px",
                textDecoration: c.phone.startsWith("[") ? "none" : "underline",
                textDecorationThickness: "0.5px",
                textUnderlineOffset: "4px",
              }}
            >
              {c.phone}
            </a>
          </div>
        ))}
      </Block>

      <Block label="Taxis">
        <ul className="space-y-2">
          {e.taxis.map((t) => (
            <li
              key={t}
              className="font-display"
              style={{ color: "var(--color-navy)", opacity: 0.85, fontSize: "16px" }}
            >
              {t}
            </li>
          ))}
        </ul>
      </Block>

      <Block label="Lost the group?">
        <p
          className="font-display italic"
          style={{
            color: "var(--color-navy)",
            opacity: 0.85,
            fontSize: "16px",
            lineHeight: 1.5,
          }}
        >
          {e.lostProtocol}
        </p>
      </Block>
    </PageFrame>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="py-5 border-t first:border-t-0"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <p className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
        {label}
      </p>
      <p
        className="font-display mt-2"
        style={{ color: "var(--color-navy)", fontSize: "20px", letterSpacing: "-0.01em" }}
      >
        {children}
      </p>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="py-6 border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <p className="label text-[9px] mb-3" style={{ color: "var(--color-gold)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}
