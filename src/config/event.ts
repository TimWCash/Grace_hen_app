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
    // Hen: Saturday 27 June 2026, lunch at House at 2:15pm (IST = UTC+1).
    hen: new Date("2026-06-27T14:15:00+01:00"),
    wedding: new Date("2026-07-11T14:00:00+01:00"),
    /** When sealed photos develop — the morning after the hen */
    photoReveal: new Date("2026-06-28T10:00:00+01:00"),
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
    description: "Private invitation. Dublin, 27 June 2026.",
  },

  /** Essentials — logistics shown on /essentials. TK fields await Tim. */
  essentials: {
    dressCode: "Dress in black. Sleek and bold.",
    meetingPoint: {
      label: "Curtain up",
      value: "House, Lower Leeson St — 2:15pm, lunch before the off",
    },
    hotel: {
      label: "Base for the night",
      value: "[Address TK — ask Claire]",
    },
    contacts: [
      {
        name: "Claire Canning",
        role: "Maid of Honour · runs the night",
        phone: "[TK]",
      },
    ],
    taxis: [
      "FREE NOW app — works everywhere in Dublin",
      "Lynk Taxis · 01 820 2020",
    ],
    lostProtocol:
      "Open the Map and turn on location sharing — the squad will find you. Failing that, ring Claire and stay where you are.",
  },
} as const;

export type EventConfig = typeof EVENT;
