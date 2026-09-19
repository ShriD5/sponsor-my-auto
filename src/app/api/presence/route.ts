import { NextRequest, NextResponse } from "next/server";
import { eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { eventRow, type ClientEvent } from "@/lib/track";
export const dynamic = "force-dynamic";

/**
 * Heartbeat + analytics from the client.
 *  - every beat: upsert visitors.last_seen ("N here now")
 *  - first beat of a page load (view=true): count a view and record a `view` event with referrer/utm/geo/device
 *  - optional `event`: a funnel step (`modal`, `checkout`) for the admin dashboard
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; view?: boolean; event?: ClientEvent };
  const { id, view, event } = body;
  if (!id || !/^[a-z0-9-]{8,64}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const [exists] = await db.select({ id: schema.visitors.id }).from(schema.visitors).where(eq(schema.visitors.id, id)).limit(1);
  if (!exists) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.visitors).where(gt(schema.visitors.firstSeen, new Date(Date.now() - 60_000)));
    if (n > 400) return NextResponse.json({ ok: true, throttled: true }); // flood: still 200, just not counted
  }
  await db.insert(schema.visitors).values({ id, views: 1 })
    .onConflictDoUpdate({ target: schema.visitors.id, set: { lastSeen: new Date(), ...(view ? { views: sql`${schema.visitors.views} + 1` } : {}) } });

  const ev: ClientEvent | null = event ?? (view ? { kind: "view", path: "/" } : null);
  if (ev) {
    const row = eventRow(req, id, ev);
    if (row) { try { await db.insert(schema.events).values(row); } catch (e) { console.error("event insert failed", e); } }
  }
  return NextResponse.json({ ok: true });
}
