import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { dodo, isMockPay } from "./dodo";
import { emailLive, emailOutbid } from "./email";
import { slotById } from "./slots";

/** Shape of the Dodo payment fields we need. Customers may pay in INR etc.; settlement is what we receive, in USD. */
export type PaidAmounts = {
  currency?: string; total_amount?: number; tax?: number | null;
  settlement_currency?: string; settlement_amount?: number; settlement_tax?: number | null;
};

/** Net USD cents we actually received for a payment, or null if Dodo didn't give us a USD figure. */
export function paidUsdCents(pay: PaidAmounts): number | null {
  if (pay.settlement_currency === "USD" && typeof pay.settlement_amount === "number") return pay.settlement_amount - (pay.settlement_tax ?? 0);
  if (pay.currency === "USD" && typeof pay.total_amount === "number") return pay.total_amount - (pay.tax ?? 0);
  return null;
}

/**
 * Mark a purchase paid, make it the slot's active sponsor, supersede + refund the previous one.
 * The slot price is always the price we listed (p.amountCents); the paid figure is only a floor check,
 * because Dodo's total_amount is in the customer's currency (INR paise for Indian cards) and includes tax.
 * Idempotent: calling twice for the same purchase is a no-op.
 */
export async function settlePaid(purchaseId: string, paymentId: string | null, paidUsd?: number | null) {
  const [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, purchaseId));
  if (!p) throw new Error("purchase not found");
  if (p.status === "paid" || p.status === "superseded" || p.status === "refunded") return p;

  const amount = p.amountCents;
  // 3% tolerance for FX rounding on non-USD cards
  if (typeof paidUsd === "number" && paidUsd < Math.floor(amount * 0.97)) {
    // paid less than the slot price (tampered PWYW amount): don't activate, refund what came in
    await db.update(schema.purchases).set({ status: "failed", paymentId }).where(eq(schema.purchases.id, purchaseId));
    if (paymentId && !p.isMock && !isMockPay()) { try { await dodo().refunds.create({ payment_id: paymentId }); } catch (e) { console.error("short-pay refund failed", purchaseId, e); } }
    return { ...p, status: "failed" };
  }
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
      void emailOutbid(prev, slotById(p.slotId)?.name ?? p.slotId, amount);
    }
  }
  void emailLive({ ...p, amountCents: amount }, slotById(p.slotId)?.name ?? p.slotId);
  return { ...p, status: "paid" };
}
