import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { dodo, isMockPay } from "@/lib/dodo";
import { settlePaid } from "@/lib/settle";
import { slotById } from "@/lib/slots";

export const dynamic = "force-dynamic";

/** Status for the thanks page. If Dodo redirected back with a payment_id before the webhook landed,
 *  verify directly with Dodo and settle so the sponsor sees themselves live instantly. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const paymentId = req.nextUrl.searchParams.get("payment_id");
  let [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id));
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (p.status === "pending" && paymentId && !isMockPay()) {
    try {
      const pay = await dodo().payments.retrieve(paymentId);
      if (pay.status === "succeeded" && pay.metadata?.purchase_id === id) {
        await settlePaid(id, paymentId, pay.total_amount);
        [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id));
      }
    } catch (e) { console.error("verify failed", e); }
  }
  const def = slotById(p.slotId);
  return NextResponse.json({
    id: p.id, status: p.status, slotId: p.slotId, slotName: def?.name, sponsorName: p.sponsorName,
    url: p.url, logo: p.logoData, amountCents: p.amountCents,
  }, { headers: { "Cache-Control": "no-store" } });
}
