type CrestProps = {
  size?: number;
  className?: string;
  monochrome?: boolean;
};

export function Crest({ size = 96, className = "", monochrome = false }: CrestProps) {
  const gold = monochrome ? "currentColor" : "var(--color-gold)";
  const navy = monochrome ? "currentColor" : "var(--color-navy)";
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={className}
      aria-label="G & M monogram crest"
      role="img"
    >
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={monochrome ? "currentColor" : "#d6bf86"} />
          <stop offset="50%" stopColor={gold} />
          <stop offset="100%" stopColor={monochrome ? "currentColor" : "#8a7140"} />
        </linearGradient>
      </defs>

      {/* shield */}
      <path
        d="M60 6 L108 22 L108 70 C108 96 86 120 60 132 C34 120 12 96 12 70 L12 22 Z"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="1.4"
      />
      <path
        d="M60 10 L104 24 L104 70 C104 94 84 116 60 127 C36 116 16 94 16 70 L16 24 Z"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* top crown */}
      <g stroke="url(#goldGrad)" strokeWidth="1.2" fill="none">
        <line x1="42" y1="20" x2="42" y2="14" />
        <line x1="50" y1="20" x2="50" y2="12" />
        <line x1="60" y1="20" x2="60" y2="9" />
        <line x1="70" y1="20" x2="70" y2="12" />
        <line x1="78" y1="20" x2="78" y2="14" />
        <circle cx="42" cy="13" r="1.3" fill={gold} />
        <circle cx="50" cy="11" r="1.3" fill={gold} />
        <circle cx="60" cy="8" r="1.6" fill={gold} />
        <circle cx="70" cy="11" r="1.3" fill={gold} />
        <circle cx="78" cy="13" r="1.3" fill={gold} />
      </g>

      {/* G & M monogram — stacked, ampersand centered between */}
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fontFamily="var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
        fontSize="36"
        fontWeight="400"
        fill={navy}
        fontStyle="italic"
      >
        G
      </text>
      <text
        x="60"
        y="84"
        textAnchor="middle"
        fontFamily="var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
        fontSize="18"
        fontWeight="400"
        fill={gold}
        fontStyle="italic"
      >
        &amp;
      </text>
      <text
        x="60"
        y="104"
        textAnchor="middle"
        fontFamily="var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
        fontSize="36"
        fontWeight="400"
        fill={navy}
        fontStyle="italic"
      >
        M
      </text>

      {/* laurel sprigs */}
      <g stroke="url(#goldGrad)" strokeWidth="0.8" fill="none" opacity="0.85">
        <path d="M22 80 Q30 95 36 110" />
        <path d="M26 84 Q30 86 32 88" />
        <path d="M28 90 Q32 92 34 94" />
        <path d="M30 96 Q34 98 36 100" />
        <path d="M32 102 Q36 104 38 106" />

        <path d="M98 80 Q90 95 84 110" />
        <path d="M94 84 Q90 86 88 88" />
        <path d="M92 90 Q88 92 86 94" />
        <path d="M90 96 Q86 98 84 100" />
        <path d="M88 102 Q84 104 82 106" />
      </g>

      {/* bottom ribbon */}
      <path
        d="M28 119 Q60 132 92 119"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="0.8"
      />
      <text
        x="60"
        y="127"
        textAnchor="middle"
        fontFamily="var(--font-cormorant), serif"
        fontSize="6"
        letterSpacing="3"
        fill={navy}
        fontStyle="italic"
      >
        XI · VII · MMXXVI
      </text>
    </svg>
  );
}
