import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { settlePaid, paidUsdCents, type PaidAmounts } from "@/lib/settle";

export const dynamic = "force-dynamic";

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

  // idempotency
  const inserted = await db.insert(schema.webhookEvents)
    .values({ id: headers["webhook-id"], type: evt.type }).onConflictDoNothing().returning();
  if (!inserted.length) return NextResponse.json({ received: true, dup: true });

  if (evt.type === "payment.succeeded") {
    const d = evt.data as PaidAmounts & { payment_id: string; metadata?: Record<string, string> };
    const purchaseId = d.metadata?.purchase_id;
    if (purchaseId) await settlePaid(purchaseId, d.payment_id, paidUsdCents(d));
  } else if (evt.type === "refund.succeeded") {
    const d = evt.data as { payment_id: string; refund_id: string };
    const [p] = await db.update(schema.purchases).set({ status: "refunded", refundId: d.refund_id })
      .where(eq(schema.purchases.paymentId, d.payment_id))
      .returning();
    // Manual Dodo refund of the current holder: vacate the slot so it goes back on sale at the base price.
    if (p) {
      const [slot] = await db.select().from(schema.slots).where(eq(schema.slots.activePurchaseId, p.id));
      if (slot) {
        await db.update(schema.slots)
          .set({ activePurchaseId: null, currentPriceCents: slot.basePriceCents, updatedAt: new Date() })
          .where(eq(schema.slots.id, slot.id));
      }
    }
  } else if (evt.type === "payment.failed") {
    const d = evt.data as { metadata?: Record<string, string> };
    if (d.metadata?.purchase_id) await db.update(schema.purchases).set({ status: "failed" }).where(and(eq(schema.purchases.id, d.metadata.purchase_id), eq(schema.purchases.status, "pending")));
  }
  return NextResponse.json({ received: true });
}
