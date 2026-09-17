import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
export const dynamic = "force-dynamic";

/** Kill switch: POST { purchaseId, hidden: true|false } with header x-admin-token. Hides a logo from the site without refunding. */
export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN || req.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN) return NextResponse.json({ error: "nope" }, { status: 401 });
  const { purchaseId, hidden = true } = (await req.json().catch(() => ({}))) as { purchaseId?: string; hidden?: boolean };
  if (!purchaseId) return NextResponse.json({ error: "purchaseId required" }, { status: 400 });
  const r = await db.update(schema.purchases).set({ hidden }).where(eq(schema.purchases.id, purchaseId)).returning({ id: schema.purchases.id });
  return NextResponse.json({ ok: r.length === 1 });
}

/** GET lists paid purchases (id, slot, sponsor, url, amount, hidden) for moderation. */
export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN || req.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN) return NextResponse.json({ error: "nope" }, { status: 401 });
  const rows = await db.select({ id: schema.purchases.id, slotId: schema.purchases.slotId, sponsor: schema.purchases.sponsorName, url: schema.purchases.url, amountCents: schema.purchases.amountCents, status: schema.purchases.status, hidden: schema.purchases.hidden, email: schema.purchases.email, paidAt: schema.purchases.paidAt }).from(schema.purchases).where(eq(schema.purchases.status, "paid"));
  return NextResponse.json(rows);
}
