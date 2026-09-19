export type SlotKind = "hood" | "visor" | "side" | "top" | "page";

export type SlotDef = {
  id: string;
  autoId: "a1" | "site";
  kind: SlotKind;
  name: string;
  short: string;            // what gets printed on the placeholder sticker
  basePriceCents: number;
  tag: string;              // sticker tag on the card
  lines: string[];          // card bullets
};

export const AUTO = { id: "a1", name: "The Auto", driver: "Driver TBD", area: "Bengaluru", plate: "KA" } as const;

export const SLOT_DEFS: SlotDef[] = [
  {
    id: "a1-hood", autoId: "a1", kind: "hood", name: "The Hood", short: "THE HOOD",
    basePriceCents: 350000, tag: "THE BIG ONE",
    lines: ["The whole rear of the canopy, ~8–9 sq ft", "Read by every car stuck behind it, all day", "~10k eyeballs a day", "Printed panel shipped to you after"],
  },
  {
    id: "a1-side-l", autoId: "a1", kind: "side", name: "Left Side", short: "LEFT SIDE",
    basePriceCents: 80000, tag: "FOOTPATH SIDE",
    lines: ["Vertical panel on the left of the canopy", "Faces the footpath and every bus stop", "Pedestrian eye level, close range", "~3 sq ft"],
  },
  {
    id: "a1-side-r", autoId: "a1", kind: "side", name: "Right Side", short: "RIGHT SIDE",
    basePriceCents: 80000, tag: "TRAFFIC SIDE",
    lines: ["Vertical panel on the right of the canopy", "Faces overtaking bikes and cars", "Seen at every signal, every lane change", "~3 sq ft"],
  },
  {
    id: "a1-visor", autoId: "a1", kind: "visor", name: "The Visor", short: "THE VISOR",
    basePriceCents: 75000, tag: "THE FACE",
    lines: ["Strip across the front, above the windshield", "Seen by everything the auto drives at", "Where drivers paint their own name", "Your name instead, for a month"],
  },
  {
    id: "a1-top", autoId: "a1", kind: "top", name: "The Roofline", short: "ROOFLINE",
    basePriceCents: 50000, tag: "THE CHERRY",
    lines: ["Thin strip along the top edge of the hood", "Reads from behind, above the big panel", "Bus and truck drivers see this one", "Cheapest spot on the metal"],
  },
  {
    id: "site-page", autoId: "site", kind: "page", name: "The Page", short: "THE PAGE",
    basePriceCents: 100, tag: "THE INTERNET",
    lines: ["Presented-by banner on this site", "Named in every post for the month", "Your logo and link on this site all month", "Cheapest way into the story"],
  },
];

export const slotById = (id: string) => SLOT_DEFS.find((s) => s.id === id);

export const fmtUsd = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Takeover step. 2 = Marc Lou / Sponsor My Dress style doubling. Override with TAKEOVER_MULTIPLIER (e.g. 1.5). */
export const TAKEOVER_MULTIPLIER = Number(process.env.TAKEOVER_MULTIPLIER || process.env.NEXT_PUBLIC_TAKEOVER_MULTIPLIER || 2);
export const nextPrice = (basePriceCents: number, currentPriceCents: number, hasActive: boolean) =>
  hasActive ? Math.round((currentPriceCents * TAKEOVER_MULTIPLIER) / 100) * 100 : basePriceCents;
