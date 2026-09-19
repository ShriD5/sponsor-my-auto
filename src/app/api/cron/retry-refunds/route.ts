import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db, schema } from "@/lib/db";
import { dodo, isMockPay } from "@/lib/dodo";

export const dynamic = "force-dynamic";

/**
 * Dodo pays refunds out of the merchant wallet, and a fresh takeover payment can take hours to be credited
 * there, so the instant refund in settlePaid can fail with INSUFFICIENT_WALLET_FUNDS. Those purchases stay
 * `superseded` with no refundId; this sweep retries them until Dodo accepts.
 * Vercel Cron calls it (see vercel.json) with `Authorization: Bearer $CRON_SECRET`; ADMIN_TOKEN also works
 * via `x-admin-token` for a manual poke.
 */
function authed(req: NextRequest) {
  const cron = process.env.CRON_SECRET ?? "", admin = process.env.ADMIN_TOKEN ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const adminGot = req.headers.get("x-admin-token") ?? "";
  const eq = (a: string, b: string) => a.length >= 24 && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  return eq(cron, bearer) || eq(admin, adminGot);
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "nope" }, { status: 401 });
  if (isMockPay()) return NextResponse.json({ ok: true, skipped: "mock" });

  const due = await db.select().from(schema.purchases).where(and(
    eq(schema.purchases.status, "superseded"),
    eq(schema.purchases.isMock, false),
    isNotNull(schema.purchases.paymentId),
    isNull(schema.purchases.refundId),
  ));

  const results: { id: string; paymentId: string; ok: boolean; detail: string }[] = [];
  for (const p of due) {
    try {
      const r = await dodo().refunds.create({ payment_id: p.paymentId!, reason: "Slot taken over: full refund" });
      await db.update(schema.purchases).set({ status: "refunded", refundId: r.refund_id }).where(eq(schema.purchases.id, p.id));
      results.push({ id: p.id, paymentId: p.paymentId!, ok: true, detail: r.refund_id });
    } catch (e) {
      const err = e as { status?: number; error?: { code?: string; message?: string } };
      results.push({ id: p.id, paymentId: p.paymentId!, ok: false, detail: err.error?.code ?? err.error?.message ?? String(e) });
    }
  }
  if (results.some((r) => !r.ok)) console.warn("retry-refunds: still pending", results.filter((r) => !r.ok));
  return NextResponse.json({ ok: true, pending: due.length, results });
}
