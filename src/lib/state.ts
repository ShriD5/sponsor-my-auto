import { eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { SLOT_DEFS, nextPrice } from "./slots";

export type SponsorPublic = { name: string; url: string; logo: string; amountCents: number; since: string };
export type SlotState = {
  id: string; autoId: string; kind: string; name: string;
  basePriceCents: number; currentPriceCents: number; nextPriceCents: number;
  sponsor: SponsorPublic | null;
  size: string; seenBy: string; views: string; perk: string;
};

export async function ensureSeeded() {
  const existing = await db.select({ id: schema.slots.id }).from(schema.slots);
  const have = new Set(existing.map((r) => r.id));
  const missing = SLOT_DEFS.filter((s) => !have.has(s.id));
  if (missing.length) {
    await db.insert(schema.slots).values(
      missing.map((s) => ({
        id: s.id, autoId: s.autoId, kind: s.kind, name: s.name,
        basePriceCents: s.basePriceCents, currentPriceCents: s.basePriceCents,
      }))
    ).onConflictDoNothing();
  }
}

export async function getState() {
  await ensureSeeded();
  const rows = await db.select().from(schema.slots);
  const activeIds = rows.map((r) => r.activePurchaseId).filter(Boolean) as string[];
  const actives = activeIds.length
    ? await db.select().from(schema.purchases).where(inArray(schema.purchases.id, activeIds))
    : [];
  const byId = new Map(actives.map((p) => [p.id, p]));

  const slots: SlotState[] = SLOT_DEFS.map((def) => {
    const row = rows.find((r) => r.id === def.id)!;
    const p = row.activePurchaseId ? byId.get(row.activePurchaseId) : undefined;
    return {
      id: def.id, autoId: def.autoId, kind: def.kind, name: def.name,
      basePriceCents: row.basePriceCents, currentPriceCents: row.currentPriceCents,
      nextPriceCents: nextPrice(row.basePriceCents, row.currentPriceCents, !!p),
      sponsor: p ? { name: p.sponsorName, url: p.url, logo: p.logoData, amountCents: p.amountCents, since: (p.paidAt ?? p.createdAt).toISOString() } : null,
      size: def.size, seenBy: def.seenBy, views: def.views, perk: def.perk,
    };
  });
  const raisedCents = slots.reduce((a, s) => a + (s.sponsor?.amountCents ?? 0), 0);
  return {
    slots, raisedCents,
    saleEndsAt: process.env.SALE_ENDS_AT ?? null,
    wrapDay: process.env.WRAP_DAY ?? null,
    mock: process.env.MOCK_PAY === "1",
  };
}

export async function getSlotRow(id: string) {
  await ensureSeeded();
  const [row] = await db.select().from(schema.slots).where(eq(schema.slots.id, id));
  return row ?? null;
}
