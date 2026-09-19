import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db, schema } from "./db";
import { dodo, isMockPay } from "./dodo";

export type RefundRetry = { id: string; paymentId: string; ok: boolean; detail: string };

/**
 * Dodo pays refunds out of the merchant wallet, and a fresh takeover payment can take hours to be credited
 * there, so the instant refund in settlePaid can fail with INSUFFICIENT_WALLET_FUNDS. Those purchases stay
 * `superseded` with no refundId. This sweep retries them; it runs from the daily cron and after every Dodo
 * webhook (a new payment is exactly when the wallet gains funds).
 */
export async function retryPendingRefunds(): Promise<RefundRetry[]> {
  if (isMockPay()) return [];
  const due = await db.select().from(schema.purchases).where(and(
    eq(schema.purchases.status, "superseded"),
    eq(schema.purchases.isMock, false),
    isNotNull(schema.purchases.paymentId),
    isNull(schema.purchases.refundId),
  ));

  const results: RefundRetry[] = [];
  for (const p of due) {
    try {
      const r = await dodo().refunds.create({ payment_id: p.paymentId!, reason: "Slot taken over: full refund" });
      await db.update(schema.purchases).set({ status: "refunded", refundId: r.refund_id }).where(eq(schema.purchases.id, p.id));
      results.push({ id: p.id, paymentId: p.paymentId!, ok: true, detail: r.refund_id });
    } catch (e) {
      const err = e as { error?: { code?: string; message?: string } };
      results.push({ id: p.id, paymentId: p.paymentId!, ok: false, detail: err.error?.code ?? err.error?.message ?? String(e) });
    }
  }
  const still = results.filter((r) => !r.ok);
  if (still.length) console.warn("retry-refunds: still pending", still);
  return results;
}
