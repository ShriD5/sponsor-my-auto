import { eq, inArray, gt, sql, and, or } from "drizzle-orm";
import { db, schema } from "./db";
import { SLOT_DEFS, nextPrice } from "./slots";

/** logo is a same-origin URL (/api/logo/:purchaseId), not the image bytes: state is polled every 10s by every open tab. */
export type SponsorPublic = { name: string; url: string; logo: string; amountCents: number; since: string };
export const logoUrl = (purchaseId: string) => `/api/logo/${purchaseId}`;
export type SlotState = {
  id: string; autoId: string; kind: string; name: string; short: string;
  basePriceCents: number; currentPriceCents: number; nextPriceCents: number;
  sponsor: SponsorPublic | null;
  tag: string; lines: string[];
};

let seeded = false;
/** Sync slot rows with SLOT_DEFS. Runs once per warm function instance; a deploy (new instances) picks up config edits. */
export async function ensureSeeded() {
  if (seeded) return;
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
  // keep unsold slots in sync with the config (price/name edits), and drop retired unsold slots
  const rows = await db.select().from(schema.slots);
  const defIds = new Set(SLOT_DEFS.map((d) => d.id));
  for (const r of rows) {
    const def = SLOT_DEFS.find((d) => d.id === r.id);
    if (r.activePurchaseId) continue;
    if (!def) { await db.delete(schema.slots).where(eq(schema.slots.id, r.id)); continue; }
    if (r.basePriceCents !== def.basePriceCents || r.name !== def.name) {
      await db.update(schema.slots)
        .set({ basePriceCents: def.basePriceCents, currentPriceCents: def.basePriceCents, name: def.name, updatedAt: new Date() })
        .where(eq(schema.slots.id, r.id));
    }
  }
  seeded = true;
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
    const visible = p && !p.hidden;
    return {
      id: def.id, autoId: def.autoId, kind: def.kind, name: def.name, short: def.short,
      basePriceCents: row.basePriceCents, currentPriceCents: row.currentPriceCents,
      nextPriceCents: nextPrice(row.basePriceCents, row.currentPriceCents, !!p),
      sponsor: visible ? { name: p.sponsorName, url: p.url, logo: logoUrl(p.id), amountCents: p.amountCents, since: (p.paidAt ?? p.createdAt).toISOString() } : null,
      tag: def.tag, lines: def.lines,
    };
  });
  const raisedCents = rows.reduce((a, r) => a + (r.activePurchaseId ? (byId.get(r.activePurchaseId)?.amountCents ?? 0) : 0), 0);
  const since = new Date(Date.now() - 60_000);
  const [[live], [visits], [takeovers]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.visitors).where(gt(schema.visitors.lastSeen, since)),
    db.select({ n: sql<number>`coalesce(sum(${schema.visitors.views}),0)::int` }).from(schema.visitors),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.purchases).where(or(eq(schema.purchases.status, "superseded"), eq(schema.purchases.status, "refunded"))),
  ]);
  return {
    slots, raisedCents,
    live: live?.n ?? 0, visits: visits?.n ?? 0, takeovers: takeovers?.n ?? 0,
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
