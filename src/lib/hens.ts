/**
 * The hens. Edit this file to update names, relations, photos, fun facts.
 *
 * Photo path is relative to /public — drop files in /public/photos/hens/
 * and reference like "/photos/hens/fiona.jpg". If no photo, leave undefined
 * and the entry will render with a typographic monogram instead.
 */

export type Hen = {
  id: string;
  name: string;
  relation: string;        // e.g. "Sister", "Maid of Honour"
  funFact: string;         // one short sentence, please
  photo?: string;          // /photos/hens/xxx.jpg
  isMoH?: boolean;
};

export const HENS: Hen[] = [
  {
    id: "fiona",
    name: "Fiona Canning",
    relation: "Sister · Maid of Honour",
    funFact:
      "Has known Grace since the first day Grace was alive. Drafted this app, more or less.",
    isMoH: true,
  },
  {
    id: "hen-2",
    name: "[Name TK]",
    relation: "Sister",
    funFact:
      "[A specific, funny, one-line story Grace would recognise.]",
  },
  {
    id: "hen-3",
    name: "[Name TK]",
    relation: "Cousin",
    funFact:
      "[Something Grace would never expect to be said out loud.]",
  },
  {
    id: "hen-4",
    name: "[Name TK]",
    relation: "School friend",
    funFact:
      "[The story Grace tells about her, edited slightly for the night.]",
  },
  {
    id: "hen-5",
    name: "[Name TK]",
    relation: "University",
    funFact: "[A specific moment, in fewer than 20 words.]",
  },
  {
    id: "hen-6",
    name: "[Name TK]",
    relation: "Work",
    funFact: "[The thing Grace texts her about.]",
  },
];
