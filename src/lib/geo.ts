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

// Real approximate coordinates for the cocktail-crawl stops.
export const STOP_COORDS: Record<string, { lat: number; lng: number }> = {
  "The Horseshoe Bar": { lat: 53.338, lng: -6.257 },
  "9 Below": { lat: 53.3381, lng: -6.2575 },
  "Vintage Cocktail Club": { lat: 53.345, lng: -6.2625 },
  "Bar 1661": { lat: 53.3475, lng: -6.271 },
  "Peruke & Periwig": { lat: 53.3415, lng: -6.258 },
  "The Blind Pig": { lat: 53.342, lng: -6.262 },
};

export function shortVenue(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/^The /, "").split(" · ")[0];
}
