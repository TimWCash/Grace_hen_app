type ImagePlaceholderProps = {
  caption?: string;
  mood?: "estate" | "interior" | "city" | "portrait";
  className?: string;
};

const MOOD_GRADIENT: Record<NonNullable<ImagePlaceholderProps["mood"]>, string> = {
  // Stand-ins for real photography. Replace the divs with <img> when assets arrive.
  estate:
    "linear-gradient(160deg, #2a2622 0%, #4a3f30 35%, #8a7345 65%, #c8a86a 100%)",
  interior:
    "linear-gradient(180deg, #1a1612 0%, #3a2a1f 50%, #2d1f15 100%)",
  city:
    "linear-gradient(180deg, #14213d 0%, #2a3556 50%, #5c4a2a 100%)",
  portrait:
    "linear-gradient(135deg, #1a1612 0%, #2a2622 100%)",
};

export function ImagePlaceholder({
  caption = "Photograph · TK",
  mood = "estate",
  className = "",
}: ImagePlaceholderProps) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ background: MOOD_GRADIENT[mood] }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 5px 5px",
          backgroundPosition: "0 0, 1px 1px",
        }}
      />
      {/* Caption — editorial "TK" placeholder */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3">
        <span
          className="text-[8.5px] uppercase tracking-eyebrow font-medium"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {caption}
        </span>
        <span
          className="text-[8.5px] uppercase tracking-eyebrow font-medium"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          To Come
        </span>
      </div>
    </div>
  );
}
