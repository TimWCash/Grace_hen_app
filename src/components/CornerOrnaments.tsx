type CornerOrnamentsProps = {
  size?: number;
  inset?: number;
  color?: string;
};

/**
 * Four art-deco corner flourishes for invitation-card framing.
 * Pure SVG, no JS. Designed to sit inside a positioned card.
 */
export function CornerOrnaments({
  size = 38,
  inset = 10,
  color = "var(--color-gold)",
}: CornerOrnamentsProps) {
  return (
    <>
      <Corner
        position={{ top: inset, left: inset }}
        size={size}
        color={color}
        rotation={0}
      />
      <Corner
        position={{ top: inset, right: inset }}
        size={size}
        color={color}
        rotation={90}
      />
      <Corner
        position={{ bottom: inset, right: inset }}
        size={size}
        color={color}
        rotation={180}
      />
      <Corner
        position={{ bottom: inset, left: inset }}
        size={size}
        color={color}
        rotation={270}
      />
    </>
  );
}

function Corner({
  position,
  size,
  color,
  rotation,
}: {
  position: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  size: number;
  color: string;
  rotation: number;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      style={{
        position: "absolute",
        ...position,
        transform: `rotate(${rotation}deg)`,
        color,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {/* Long horizontal */}
      <line x1="0" y1="2" x2="32" y2="2" stroke="currentColor" strokeWidth="0.9" />
      {/* Long vertical */}
      <line x1="2" y1="0" x2="2" y2="32" stroke="currentColor" strokeWidth="0.9" />
      {/* Inner short horizontal */}
      <line x1="6" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
      {/* Inner short vertical */}
      <line x1="6" y1="6" x2="6" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
      {/* Diamond accent at the joint */}
      <rect
        x="0.5"
        y="0.5"
        width="3"
        height="3"
        transform="rotate(45 2 2)"
        fill="currentColor"
      />
      {/* Tiny flourish curl */}
      <path
        d="M 32 2 Q 36 2 36 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <path
        d="M 2 32 Q 2 36 6 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
      />
    </svg>
  );
}
