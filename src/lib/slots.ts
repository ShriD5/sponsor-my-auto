export type SlotKind = "hood" | "back" | "tee" | "page";

export type SlotDef = {
  id: string;
  autoId: "a1" | "a2" | "site";
  kind: SlotKind;
  name: string;
  basePriceCents: number;
  size: string;
  seenBy: string;
  views: string;
  perk: string;
};

export const AUTOS = [
  { id: "a1", name: "Auto 1", driver: "Driver 1", area: "TBD route", plate: "KA·01" },
  { id: "a2", name: "Auto 2", driver: "Driver 2", area: "TBD route", plate: "KA·02" },
] as const;

const perAuto = (autoId: "a1" | "a2", label: string): SlotDef[] => [
  {
    id: `${autoId}-hood`, autoId, kind: "hood", name: `${label} · Hood`,
    basePriceCents: 120000,
    size: "Rear hood, 3 panels, ~8–9 sq ft",
    seenBy: "Everyone behind and beside the auto at signals",
    views: "8,500–12,000 / day",
    perk: "Physical hood panels shipped to you after the month + ride-along shoot",
  },
  {
    id: `${autoId}-back`, autoId, kind: "back", name: `${label} · Back Panel`,
    basePriceCents: 50000,
    size: "Lower rear panel, ~3–4 sq ft",
    seenBy: "Drivers stuck behind in traffic",
    views: "3,500–5,500 / day",
    perk: "QR + UTM link, scan count reported",
  },
  {
    id: `${autoId}-tee`, autoId, kind: "tee", name: `${label} · Driver Tee`,
    basePriceCents: 40000,
    size: "Front of the driver's tee (overshirt covers the rest)",
    seenBy: "Every passenger, 10–20 min captive, plus all content",
    views: "30–50 riders / day + every video",
    perk: "\"Meet the driver\" video in your tee, driver says your tagline on camera",
  },
];

export const SLOT_DEFS: SlotDef[] = [
  ...perAuto("a1", "Auto 1"),
  ...perAuto("a2", "Auto 2"),
  {
    id: "site-page", autoId: "site", kind: "page", name: "The Page",
    basePriceCents: 80000,
    size: "\"Presented by\" banner on this site",
    seenBy: "Everyone who lands here + every social post for the month",
    views: "Site traffic",
    perk: "Named in every update, reveal, and weekly post",
  },
];

export const slotById = (id: string) => SLOT_DEFS.find((s) => s.id === id);

export const fmtUsd = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const nextPrice = (basePriceCents: number, currentPriceCents: number, hasActive: boolean) =>
  hasActive ? currentPriceCents * 2 : basePriceCents;
