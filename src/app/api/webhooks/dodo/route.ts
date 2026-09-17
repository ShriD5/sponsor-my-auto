import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db, schema } from "@/lib/db";
import { settlePaid } from "@/lib/settle";

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
    const d = evt.data as { payment_id: string; total_amount: number; metadata?: Record<string, string> };
    const purchaseId = d.metadata?.purchase_id;
    if (purchaseId) await settlePaid(purchaseId, d.payment_id, d.total_amount);
  }
  return NextResponse.json({ received: true });
}
