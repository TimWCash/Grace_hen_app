// Fire a one-off celebration burst (confetti + tumbling Mark heads).
// Any success handler can call celebrate() — a <Celebration/> mounted in
// the layout listens for the event and renders the burst.

export const CELEBRATE_EVENT = "grace-celebrate";

export function celebrate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CELEBRATE_EVENT));
}
