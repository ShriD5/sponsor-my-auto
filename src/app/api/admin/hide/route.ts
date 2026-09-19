import { NextRequest, NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db, schema } from "@/lib/db";
export const dynamic = "force-dynamic";

function authed(req: NextRequest) {
  const want = process.env.ADMIN_TOKEN ?? "", got = req.headers.get("x-admin-token") ?? "";
  if (want.length < 24 || want.length !== got.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(got));
}

/** Kill switch: POST { purchaseId, hidden: true|false } with header x-admin-token. Hides a logo from the site without refunding. */
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "nope" }, { status: 401 });
  const { purchaseId, hidden = true } = (await req.json().catch(() => ({}))) as { purchaseId?: string; hidden?: boolean };
  if (!purchaseId) return NextResponse.json({ error: "purchaseId required" }, { status: 400 });
  const r = await db.update(schema.purchases).set({ hidden }).where(eq(schema.purchases.id, purchaseId)).returning({ id: schema.purchases.id });
  return NextResponse.json({ ok: r.length === 1 });
}

/** GET lists paid purchases (id, slot, sponsor, url, amount, hidden) for moderation. */
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "nope" }, { status: 401 });
  const rows = await db.select({ id: schema.purchases.id, slotId: schema.purchases.slotId, sponsor: schema.purchases.sponsorName, url: schema.purchases.url, amountCents: schema.purchases.amountCents, status: schema.purchases.status, hidden: schema.purchases.hidden, email: schema.purchases.email, paidAt: schema.purchases.paidAt }).from(schema.purchases).where(ne(schema.purchases.status, "pending"));
  return NextResponse.json(rows);
}
