/**
 * The hens. Edit this file to update names, relations, photos, fun facts.
 *
 * Photo path is relative to /public — drop files in /public/photos/hens/
 * and reference like "/photos/hens/claire.jpg". If no photo, the entry
 * renders with a typographic monogram instead.
 *
 * funFact is OPTIONAL — leave it off and the card just shows name + relation.
 * Add a short, specific line per person when you have one.
 */

export type Hen = {
  id: string;
  name: string;
  relation: string; // e.g. "Sister", "Maid of Honour", "Hen"
  funFact?: string; // optional — one short sentence
  photo?: string; // /photos/hens/xxx.jpg
  isMoH?: boolean;
};

export const HENS: Hen[] = [
  { id: "claire", name: "Claire Canning", relation: "Maid of Honour", isMoH: true },
  { id: "fiona", name: "Fiona Canning", relation: "Sister" },
  { id: "orla", name: "Orla Canning", relation: "Sister" },
  { id: "mam", name: "Mammy Canning", relation: "Mother of the Bride" },
  { id: "paula", name: "Paula Brennan", relation: "Mother of the Groom" },
  { id: "leanne", name: "Leanne Brennan", relation: "Groom's Sister" },
  { id: "ciara", name: "Ciara", relation: "Friend" },
  { id: "robyn", name: "Robyn", relation: "Friend" },
  { id: "anne", name: "Anne Lavelle", relation: "Friend" },
  { id: "carol", name: "Carol Wolohan", relation: "Friend" },
  { id: "hannah", name: "Hannah Treacy", relation: "Friend" },
  { id: "laura", name: "Laura O'Neill", relation: "Friend" },
  { id: "louise", name: "Louise Haran", relation: "Friend" },
  { id: "megan", name: "Megan", relation: "Friend" },
  { id: "sarah", name: "Sarah McLoughlin", relation: "Friend" },
];
