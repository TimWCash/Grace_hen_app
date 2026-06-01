import { EVENT } from "@/config/event";

export const HEN_DATE = EVENT.dates.hen;
export const WEDDING_DATE = EVENT.dates.wedding;
export const PHOTO_REVEAL_DATE = EVENT.dates.photoReveal;

export function countdownParts(target: Date, now: Date = new Date()) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return { days, hours, minutes, seconds, total: ms };
}
