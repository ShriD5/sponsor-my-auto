import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSlotRow } from "@/lib/state";
import { slotById, nextPrice } from "@/lib/slots";
import { dodo, isMockPay } from "@/lib/dodo";
import { settlePaid } from "@/lib/settle";

export const dynamic = "force-dynamic";
const MAX_LOGO = 420_000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });
  const { slotId, sponsorName, url, logo, email } = body as Record<string, string>;

  const def = slotById(slotId ?? "");
  if (!def) return NextResponse.json({ error: "unknown slot" }, { status: 400 });
  if (!sponsorName || sponsorName.length > 60) return NextResponse.json({ error: "name required (≤60 chars)" }, { status: 400 });
  let link: URL;
  try { link = new URL(url); if (!/^https?:$/.test(link.protocol)) throw 0; } catch { return NextResponse.json({ error: "valid http(s) link required" }, { status: 400 }); }
  if (!logo || !logo.startsWith("data:image/") || logo.length > MAX_LOGO) return NextResponse.json({ error: "logo required (PNG/JPG/WebP/SVG, ≤400KB)" }, { status: 400 });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "bad email" }, { status: 400 });

  if (process.env.SALE_ENDS_AT && Date.now() > Date.parse(process.env.SALE_ENDS_AT)) {
    return NextResponse.json({ error: "sale closed" }, { status: 400 });
  }

  const row = await getSlotRow(def.id);
  if (!row) return NextResponse.json({ error: "slot missing" }, { status: 500 });
  const amount = nextPrice(row.basePriceCents, row.currentPriceCents, !!row.activePurchaseId);
  const mock = isMockPay();

  const [purchase] = await db.insert(schema.purchases).values({
    slotId: def.id, sponsorName: sponsorName.trim(), url: link.toString(), logoData: logo,
    email: email || null, amountCents: amount, isMock: mock,
  }).returning();

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (mock) {
    await settlePaid(purchase.id, `mock_${purchase.id.slice(0, 8)}`);
    return NextResponse.json({ url: `${origin}/thanks?p=${purchase.id}&status=succeeded` });
  }

  const session = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: process.env.DODO_PRODUCT_ID!, quantity: 1, amount }],
    return_url: `${origin}/thanks?p=${purchase.id}`,
    customer: email ? { email, name: sponsorName.trim() } : undefined,
    metadata: { purchase_id: purchase.id, slot_id: def.id, sponsor: sponsorName.trim().slice(0, 40) },
    feature_flags: { redirect_immediately: false },
  });
  return NextResponse.json({ url: session.checkout_url });
}
