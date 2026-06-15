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
  {
    id: "claire",
    name: "Claire Canning",
    relation: "Maid of Honour",
    isMoH: true,
    funFact: "Running the show. The one with the plan (and this app's admin).",
  },
  { id: "fiona", name: "Fiona Canning", relation: "Sister of the bride" },
  { id: "orla", name: "Orla Canning", relation: "Family" },
  { id: "leanne", name: "Leanne Brennan", relation: "The groom's side" },
  { id: "ciara", name: "Ciara", relation: "Hen" },
  { id: "robyn", name: "Robyn", relation: "Hen" },
  { id: "anne", name: "Anne Lavelle", relation: "Hen" },
  { id: "carol", name: "Carol Wolohan", relation: "Hen" },
  { id: "hannah", name: "Hannah Treacy", relation: "Hen" },
  { id: "laura", name: "Laura O'Neill", relation: "Hen" },
  { id: "louise", name: "Louise Haran", relation: "Hen" },
  { id: "megan", name: "Megan", relation: "Hen" },
  { id: "paula", name: "Paula", relation: "Hen" },
  { id: "roisin", name: "Roisin", relation: "Hen" },
  { id: "sarah", name: "Sarah McLoughlin", relation: "Hen" },
];
