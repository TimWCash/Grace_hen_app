type WordmarkProps = {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  className?: string;
};

const SIZE: Record<NonNullable<WordmarkProps["size"]>, string> = {
  sm: "text-[11px]",
  md: "text-[14px]",
  lg: "text-[18px]",
  xl: "text-[22px]",
};

/**
 * RL-style wordmark. No shield, no monogram, no flourishes.
 * Just typography, tracked wide, set in Playfair.
 */
export function Wordmark({
  size = "md",
  color = "currentColor",
  className = "",
}: WordmarkProps) {
  return (
    <span
      className={`font-display tracking-wide-rl uppercase ${SIZE[size]} ${className}`}
      style={{ color, letterSpacing: "0.32em" }}
    >
      Grace<span style={{ opacity: 0.5, margin: "0 0.45em" }}>&</span>Mark
    </span>
  );
}
