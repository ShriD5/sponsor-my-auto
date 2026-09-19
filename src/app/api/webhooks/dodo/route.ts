import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db, schema } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";
import { settlePaid, paidUsdCents, type PaidAmounts } from "@/lib/settle";
import { retryPendingRefunds } from "@/lib/refunds";
import { dodo, isMockPay } from "@/lib/dodo";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // settle = several Neon round-trips + a Dodo refund; don't let Hobby's 10s default cut it mid-write

export async function POST(req: NextRequest) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  const raw = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };
  try {
    new Webhook(secret).verify(raw, headers);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  const evt = JSON.parse(raw) as { type: string; data: Record<string, unknown> };

  // idempotency: skip events we've fully processed. The row is written *after* processing, so a failure here
  // (5xx) makes Dodo retry and we get another go; settlePaid's compare-and-swap writes make a double run harmless.
  const seen = await db.select({ id: schema.webhookEvents.id }).from(schema.webhookEvents).where(eq(schema.webhookEvents.id, headers["webhook-id"]));
  if (seen.length) return NextResponse.json({ received: true, dup: true });

  if (evt.type === "payment.succeeded") {
    const d = evt.data as PaidAmounts & { payment_id: string; metadata?: Record<string, string> };
    const purchaseId = d.metadata?.purchase_id;
    const [p] = purchaseId ? await db.select({ id: schema.purchases.id }).from(schema.purchases).where(eq(schema.purchases.id, purchaseId)) : [];
    if (p) {
      await settlePaid(purchaseId!, d.payment_id, paidUsdCents(d));
    } else if (!isMockPay()) {
      // money for our product with no purchase behind it (payment link, or a row we no longer have): give it back
      console.warn("webhook: orphan payment, refunding", d.payment_id, purchaseId);
      try { await dodo().refunds.create({ payment_id: d.payment_id, reason: "No matching slot purchase: full refund" }); } catch (e) { console.error("orphan refund failed", d.payment_id, e); }
    }
    // a new payment is when the Dodo wallet gains funds: clear any refunds that failed earlier on balance
    try { await retryPendingRefunds(); } catch (e) { console.error("retry-refunds", e); }
  } else if (evt.type === "refund.succeeded") {
    const d = evt.data as { payment_id: string; refund_id: string };
    // record the refund on whatever row it belongs to; only a holder/outbid row changes status
    await db.update(schema.purchases).set({ refundId: d.refund_id }).where(eq(schema.purchases.paymentId, d.payment_id));
    const [p] = await db.update(schema.purchases).set({ status: "refunded" })
      .where(and(eq(schema.purchases.paymentId, d.payment_id), inArray(schema.purchases.status, ["paid", "superseded"])))
      .returning();
    // Manual Dodo refund of the current holder: vacate the slot so it goes back on sale at the base price.
    if (p) {
      const [slot] = await db.select().from(schema.slots).where(eq(schema.slots.activePurchaseId, p.id));
      if (slot) {
        await db.update(schema.slots)
          .set({ activePurchaseId: null, currentPriceCents: slot.basePriceCents, updatedAt: new Date() })
          .where(and(eq(schema.slots.id, slot.id), eq(schema.slots.activePurchaseId, p.id)));
      }
    }
  } else if (evt.type === "payment.failed") {
    const d = evt.data as { metadata?: Record<string, string> };
    if (d.metadata?.purchase_id) await db.update(schema.purchases).set({ status: "failed" }).where(and(eq(schema.purchases.id, d.metadata.purchase_id), eq(schema.purchases.status, "pending")));
  }

  await db.insert(schema.webhookEvents).values({ id: headers["webhook-id"], type: evt.type }).onConflictDoNothing();
  return NextResponse.json({ received: true });
}
