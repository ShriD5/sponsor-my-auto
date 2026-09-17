export type SlotKind = "hood" | "visor" | "tee" | "page";

export type SlotDef = {
  id: string;
  autoId: "a1" | "site";
  kind: SlotKind;
  name: string;
  basePriceCents: number;
  size: string;
  seenBy: string;
  views: string;
  perk: string;
};

export const AUTO = { id: "a1", name: "The Auto", driver: "Driver TBD", area: "Bengaluru", plate: "KA" } as const;

export const SLOT_DEFS: SlotDef[] = [
  {
    id: "a1-hood", autoId: "a1", kind: "hood", name: "The Hood",
    basePriceCents: 350000,
    size: "Full rear hood, 3 panels, ~8–9 sq ft",
    seenBy: "Every car, bike, and bus stuck behind the auto at a signal, plus both sides",
    views: "8,500–12,000 eyeballs / day",
    perk: "The printed hood panels are shipped to you when the month ends",
  },
  {
    id: "a1-visor", autoId: "a1", kind: "visor", name: "The Visor",
    basePriceCents: 75000,
    size: "The strip across the front of the canopy, above the windshield",
    seenBy: "Oncoming traffic and everyone on the footpath the auto drives toward",
    views: "Front-facing, all day",
    perk: "The spot autos usually save for the driver's own name. This month it's yours.",
  },
  {
    id: "a1-tee", autoId: "a1", kind: "tee", name: "The Driver's Tee",
    basePriceCents: 50000,
    size: "Front chest print on the driver's tee (worn under the uniform shirt, chest visible)",
    seenBy: "Every passenger for the whole ride, and every photo and video we post",
    views: "30–50 riders / day, 10–20 min each",
    perk: "A \"meet the driver\" video in your tee, and the driver says your tagline on camera",
  },
  {
    id: "site-page", autoId: "site", kind: "page", name: "The Page",
    basePriceCents: 50000,
    size: "\"Presented by\" banner across the top of this site",
    seenBy: "Everyone who lands here, and every social post for the month",
    views: "Site traffic",
    perk: "Named in every update, the reveal, and the weekly posts",
  },
];

export const slotById = (id: string) => SLOT_DEFS.find((s) => s.id === id);

export const fmtUsd = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const nextPrice = (basePriceCents: number, currentPriceCents: number, hasActive: boolean) =>
  hasActive ? currentPriceCents * 2 : basePriceCents;
