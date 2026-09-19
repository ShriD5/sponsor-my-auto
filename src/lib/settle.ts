import { and, eq, inArray, isNull } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "./db";
import { dodo, isMockPay } from "./dodo";
import { emailLive, emailOutbid } from "./email";
import { nextPrice, slotById } from "./slots";

/** Shape of the Dodo payment fields we need. Customers may pay in INR etc.; settlement is what we receive, in USD. */
export type PaidAmounts = {
  currency?: string; total_amount?: number; tax?: number | null;
  settlement_currency?: string; settlement_amount?: number; settlement_tax?: number | null;
};

/**
 * USD cents the customer paid us for a payment (gross of Dodo's fee, net of tax), or null if Dodo gave no USD figure.
 * Verified on live payments: settlement_amount - settlement_tax == the amount we asked for.
 */
export function paidUsdCents(pay: PaidAmounts): number | null {
  if (pay.settlement_currency === "USD" && typeof pay.settlement_amount === "number") return pay.settlement_amount - (pay.settlement_tax ?? 0);
  if (pay.currency === "USD" && typeof pay.total_amount === "number") return pay.total_amount - (pay.tax ?? 0);
  return null;
}

type Purchase = typeof schema.purchases.$inferSelect;

/** Run after the response is sent (guaranteed on Vercel, unlike a dangling promise); outside a request just run it. */
function defer(fn: () => Promise<unknown>) {
  try { after(fn); } catch { void fn().catch((e) => console.error("deferred task failed", e)); }
}

/** Refund a real payment in full. Returns the refund id, or null if Dodo refused (wallet balance etc.); the sweep retries those. */
async function refund(p: { id: string; paymentId: string | null; isMock: boolean }, reason: string): Promise<string | null> {
  if (!p.paymentId || p.isMock || isMockPay()) return p.isMock ? `mock_refund_${p.id.slice(0, 8)}` : null;
  try {
    const r = await dodo().refunds.create({ payment_id: p.paymentId, reason });
    return r.refund_id;
  } catch (e) {
    console.error("refund failed for", p.id, e);
    return null;
  }
}

/** Purchase paid but must not hold the slot (short-paid, or price moved under them): mark it and give the money back. */
async function reject(p: Purchase, paymentId: string | null, why: string) {
  const claimed = await db.update(schema.purchases)
    .set({ status: "failed", paymentId, paidAt: new Date() })
    .where(and(eq(schema.purchases.id, p.id), inArray(schema.purchases.status, ["pending", "expired"])))
    .returning();
  if (!claimed.length) return p; // someone else already settled it
  console.warn("settle: rejecting", p.id, why);
  const refundId = await refund({ ...p, paymentId }, why);
  if (refundId) await db.update(schema.purchases).set({ refundId }).where(eq(schema.purchases.id, p.id));
  return { ...p, status: "failed", paymentId, refundId };
}

/**
 * Mark a purchase paid, make it the slot's active sponsor, supersede + refund the previous one.
 *
 * Every write is a compare-and-swap on the state we read, because the webhook and the thanks-page verify can
 * run this at the same moment for the same purchase, and two buyers' webhooks can land together for one slot.
 * There are no transactions on the neon-http driver, so we rely on single-statement conditional updates.
 *
 * The slot price is always the price we listed (p.amountCents). paidUsd is a floor check against a tampered
 * pay-what-you-want amount; it must be present for real payments (fail closed). The listed price must also still
 * be at least the slot's *current* asking price, otherwise a stale checkout could displace a holder for the same money.
 */
export async function settlePaid(purchaseId: string, paymentId: string | null, paidUsd?: number | null) {
  const [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, purchaseId));
  if (!p) throw new Error("purchase not found");
  if (p.status !== "pending" && p.status !== "expired") return p; // idempotent

  const amount = p.amountCents;
  const real = !p.isMock && !isMockPay();
  // 3% tolerance for FX rounding on non-USD cards
  if (real && (typeof paidUsd !== "number" || paidUsd < Math.floor(amount * 0.97))) {
    return reject(p, paymentId, `paid ${paidUsd ?? "unknown"} for a ${amount} slot`);
  }

  const slotName = slotById(p.slotId)?.name ?? p.slotId;
  const readSlot = async () => {
    const [slot] = await db.select().from(schema.slots).where(eq(schema.slots.id, p.slotId));
    if (!slot) throw new Error("slot missing");
    const prevId = slot.activePurchaseId ?? null;
    return { prevId, asking: nextPrice(slot.basePriceCents, slot.currentPriceCents, !!prevId) };
  };

  // 0. price still current? (someone may have taken the slot while this buyer was on the Dodo page)
  let { prevId, asking } = await readSlot();
  if (amount < asking) return reject(p, paymentId, `slot ${p.slotId} now asks ${asking}, purchase listed ${amount}`);

  // 1. claim the purchase (pending -> paid). Losing this means another caller settled the same purchase.
  const claimed = await db.update(schema.purchases)
    .set({ status: "paid", paymentId, paidAt: new Date() })
    .where(and(eq(schema.purchases.id, purchaseId), inArray(schema.purchases.status, ["pending", "expired"])))
    .returning();
  if (!claimed.length) { const [now] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, purchaseId)); return now ?? p; }

  // we hold `paid` but lost the slot to a concurrent settle: step aside and refund ourselves in full
  const stepAside = async (why: string) => {
    console.warn("settle: stepping aside", purchaseId, why);
    await db.update(schema.purchases).set({ status: "superseded" }).where(eq(schema.purchases.id, purchaseId));
    const refundId = await refund({ ...p, paymentId }, "Slot taken over: full refund");
    if (refundId) await db.update(schema.purchases).set({ status: "refunded", refundId }).where(eq(schema.purchases.id, purchaseId));
    return { ...p, status: refundId ? "refunded" : "superseded", paymentId, refundId };
  };

  for (let attempt = 0; ; attempt++) {
    // 2. move the slot, only if it still points at the holder we read
    const moved = await db.update(schema.slots)
      .set({ activePurchaseId: purchaseId, currentPriceCents: amount, updatedAt: new Date() })
      .where(and(eq(schema.slots.id, p.slotId), prevId ? eq(schema.slots.activePurchaseId, prevId) : isNull(schema.slots.activePurchaseId)))
      .returning();
    if (!moved.length) {
      if (attempt >= 2) return stepAside("slot still contended after retries");
      ({ prevId, asking } = await readSlot()); // slot changed under us: re-read, re-check the price, try once more
      if (amount < asking) return stepAside(`slot now asks ${asking}, purchase listed ${amount}`);
      continue;
    }

    // 3. supersede the previous holder: claim paid -> superseded first so only one caller ever issues the refund
    if (prevId && prevId !== purchaseId) {
      const [prev] = await db.update(schema.purchases)
        .set({ status: "superseded" })
        .where(and(eq(schema.purchases.id, prevId), eq(schema.purchases.status, "paid")))
        .returning();
      if (prev) {
        const refundId = await refund(prev, "Slot taken over: full refund");
        if (refundId) await db.update(schema.purchases).set({ status: "refunded", refundId }).where(eq(schema.purchases.id, prevId));
        defer(() => emailOutbid(prev, slotName, amount));
      }
    }
    defer(() => emailLive({ ...p, amountCents: amount }, slotName));
    return { ...p, status: "paid", paymentId };
  }
}
