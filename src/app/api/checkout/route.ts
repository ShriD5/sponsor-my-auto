import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSlotRow } from "@/lib/state";
import { slotById, nextPrice } from "@/lib/slots";
import { dodo, isMockPay } from "@/lib/dodo";
import { settlePaid } from "@/lib/settle";
import { and, eq, gt, lt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
const MAX_LOGO = 420_000;
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
};
function validLogo(dataUrl: string): boolean {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return false;
  const buf = Buffer.from(m[2], "base64");
  return buf.length > 100 && buf.length <= MAX_LOGO && MAGIC[m[1]](buf);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });
  const { slotId, sponsorName, url, logo, email } = body as Record<string, string>;

  const def = slotById(slotId ?? "");
  if (!def) return NextResponse.json({ error: "unknown slot" }, { status: 400 });
  const cleanName = (sponsorName ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f]/g, "").trim();
  if (!cleanName || cleanName.length > 60) return NextResponse.json({ error: "name required (≤60 chars)" }, { status: 400 });
  let link: URL;
  try { link = new URL(url); if (!/^https?:$/.test(link.protocol) || !/\./.test(link.hostname) || link.username || link.password) throw 0; } catch { return NextResponse.json({ error: "valid http(s) link required" }, { status: 400 }); }
  if (!logo || logo.length > MAX_LOGO * 1.4 || !validLogo(logo)) return NextResponse.json({ error: "logo must be a PNG, JPG, or WebP under 400KB" }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "email required, so we can refund you if someone takes your slot" }, { status: 400 });

  if (process.env.SALE_ENDS_AT && Date.now() > Date.parse(process.env.SALE_ENDS_AT)) {
    return NextResponse.json({ error: "sale closed" }, { status: 400 });
  }

  // abuse limits: prune stale pending rows, cap pending checkouts per IP
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  await db.delete(schema.purchases).where(and(eq(schema.purchases.status, "pending"), lt(schema.purchases.createdAt, new Date(Date.now() - 24 * 3600_000))));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.purchases)
    .where(and(eq(schema.purchases.ip, ip), eq(schema.purchases.status, "pending"), gt(schema.purchases.createdAt, new Date(Date.now() - 10 * 60_000))));
  if (n >= 5) return NextResponse.json({ error: "too many attempts, try again in a few minutes" }, { status: 429 });
  const [{ n: g }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.purchases)
    .where(and(eq(schema.purchases.status, "pending"), gt(schema.purchases.createdAt, new Date(Date.now() - 10 * 60_000))));
  if (g >= 60) return NextResponse.json({ error: "checkout is very busy, try again in a minute" }, { status: 429 });

  const row = await getSlotRow(def.id);
  if (!row) return NextResponse.json({ error: "slot missing" }, { status: 500 });
  const amount = nextPrice(row.basePriceCents, row.currentPriceCents, !!row.activePurchaseId);
  const mock = isMockPay();

  const [purchase] = await db.insert(schema.purchases).values({
    slotId: def.id, sponsorName: cleanName, url: link.toString(), logoData: logo,
    email, amountCents: amount, isMock: mock, ip,
  }).returning();

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (mock) {
    await settlePaid(purchase.id, `mock_${purchase.id.slice(0, 8)}`);
    return NextResponse.json({ url: `${origin}/thanks?p=${purchase.id}&status=succeeded` });
  }

  const session = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: process.env.DODO_PRODUCT_ID!, quantity: 1, amount }],
    return_url: `${origin}/thanks?p=${purchase.id}`,
    customer: { email, name: cleanName },
    metadata: { purchase_id: purchase.id, slot_id: def.id, sponsor: cleanName.slice(0, 40), expected_cents: String(amount) },
    feature_flags: { redirect_immediately: false },
  });
  return NextResponse.json({ url: session.checkout_url });
}
