/**
 * Event configuration — single source of truth for all event-specific data.
 *
 * Touch this file (and only this file) to retarget the app at another event:
 * change names, dates, city coordinates, brand colors, icon, etc. Everything
 * else reads from here.
 *
 * Long-game: when this app becomes multi-tenant, this object becomes a row
 * in Supabase keyed by event slug.
 */

export const EVENT = {
  /** Bride info */
  bride: {
    firstName: "Grace",
    maidenName: "Canning",
    futureName: "Brennan",
    futureTitle: "Mrs Brennan",
  },

  /** Groom info */
  groom: {
    firstName: "Mark",
    lastName: "Brennan",
  },

  /** Couple wordmark (matches Wordmark component) */
  couple: {
    label: "Grace & Mark",
    monogram: "G&M",
  },

  /** Core dates */
  dates: {
    hen: new Date("2026-06-28T17:00:00+01:00"),
    wedding: new Date("2026-07-11T14:00:00+01:00"),
    /** When sealed photos develop — defaults to wedding day at 14:00 */
    photoReveal: new Date("2026-07-11T14:00:00+01:00"),
  },

  /** City / map defaults */
  city: {
    name: "Dublin",
    /** Map center */
    lat: 53.3498,
    lng: -6.2603,
    /** Open-Meteo timezone string */
    timezone: "Europe/Dublin",
  },

  /** Brand */
  brand: {
    name: "Grace & Mark",
    /** RL Black Label palette */
    colors: {
      background: "#F5F5F5", // chalk
      text: "#002344",       // navy
      accent: "#C5A059",     // gold leaf
    },
    icon: "/icon.svg",
  },

  /** PWA / metadata */
  app: {
    title: "Grace & Mark — Summer 2026",
    shortName: "Grace & Mark",
    description: "Private invitation. Dublin, 28 June 2026.",
  },

  /** Concierge passcode — currently a duplicate of the Supabase value for
   * client-side display hints. The authoritative check still happens
   * server-side via verify_passcode(). */
  passcodeHint: "BrideSquad2026",
} as const;

export type EventConfig = typeof EVENT;
