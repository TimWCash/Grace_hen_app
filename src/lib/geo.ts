// Dublin city centre bounds for projecting lat/lng → viewBox 0..100.
export const LAT_MIN = 53.335;
export const LAT_MAX = 53.350;
export const LNG_MIN = -6.275;
export const LNG_MAX = -6.250;

export function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100;
  return {
    x: Math.max(3, Math.min(97, x)),
    y: Math.max(3, Math.min(97, y)),
  };
}

// Coordinates for the real stops, keyed by the `venue` string in the
// stops table (see migration 004). These are APPROXIMATE Dublin
// city-centre placeholders — confirm exact venue locations and update.
// TODO(Tim): verify the real addresses for Pen & Player / Landmark /
// Maneki and the house, then set precise lat/lng here.
export const STOP_COORDS: Record<string, { lat: number; lng: number }> = {
  "The House": { lat: 53.3382, lng: -6.2536 }, // TK — Grace's / the host's house
  "Pen & Player": { lat: 53.3392, lng: -6.2585 }, // TK
  "Landmark": { lat: 53.3405, lng: -6.2602 }, // TK
  "Maneki": { lat: 53.3439, lng: -6.2624 }, // TK
};

export function shortVenue(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/^The /, "").split(" · ")[0];
}
