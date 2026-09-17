import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { dodo, isMockPay } from "./dodo";

/**
 * Mark a purchase paid, make it the slot's active sponsor, supersede + refund the previous one.
 * Idempotent: calling twice for the same purchase is a no-op.
 */
export async function settlePaid(purchaseId: string, paymentId: string | null, paidAmountCents?: number) {
  const [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, purchaseId));
  if (!p) throw new Error("purchase not found");
  if (p.status === "paid" || p.status === "superseded" || p.status === "refunded") return p;

  const amount = paidAmountCents ?? p.amountCents;
  const [slot] = await db.select().from(schema.slots).where(eq(schema.slots.id, p.slotId));
  const prevId = slot?.activePurchaseId ?? null;

  await db.update(schema.purchases)
    .set({ status: "paid", paymentId, amountCents: amount, paidAt: new Date() })
    .where(eq(schema.purchases.id, purchaseId));

  await db.update(schema.slots)
    .set({ activePurchaseId: purchaseId, currentPriceCents: amount, updatedAt: new Date() })
    .where(eq(schema.slots.id, p.slotId));

  if (prevId && prevId !== purchaseId) {
    const [prev] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, prevId));
    if (prev && prev.status === "paid") {
      let refundId: string | null = null;
      let status = "superseded";
      if (prev.paymentId && !prev.isMock && !isMockPay()) {
        try {
          const r = await dodo().refunds.create({ payment_id: prev.paymentId });
          refundId = r.refund_id;
          status = "refunded";
        } catch (e) {
          console.error("refund failed for", prev.id, e);
        }
      } else if (prev.isMock) {
        status = "refunded";
      }
      await db.update(schema.purchases).set({ status, refundId }).where(eq(schema.purchases.id, prevId));
    }
  }
  return { ...p, status: "paid" };
}
