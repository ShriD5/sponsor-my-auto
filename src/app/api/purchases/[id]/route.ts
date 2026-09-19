import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { dodo, isMockPay } from "@/lib/dodo";
import { settlePaid, paidUsdCents } from "@/lib/settle";
import { slotById } from "@/lib/slots";
import { logoUrl } from "@/lib/state";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Status for the thanks page. If Dodo redirected back with a payment_id before the webhook landed,
 *  verify directly with Dodo and settle so the sponsor sees themselves live instantly. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const paymentId = req.nextUrl.searchParams.get("payment_id");
  let [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id));
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  if ((p.status === "pending" || p.status === "expired") && paymentId && !isMockPay()) {
    try {
      const pay = await dodo().payments.retrieve(paymentId);
      if (pay.status === "succeeded" && pay.metadata?.purchase_id === id) {
        await settlePaid(id, paymentId, paidUsdCents(pay));
        [p] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id));
      }
    } catch (e) { console.error("verify failed", e); }
  }
  const def = slotById(p.slotId);
  return NextResponse.json({
    id: p.id, status: p.status, slotId: p.slotId, slotName: def?.name, sponsorName: p.sponsorName,
    url: p.url, logo: logoUrl(p.id), amountCents: p.amountCents,
  }, { headers: { "Cache-Control": "no-store" } });
}
