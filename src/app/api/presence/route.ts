import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
export const dynamic = "force-dynamic";

/** Heartbeat from the client: upsert last_seen; count a view on the first beat of a page load. */
export async function POST(req: NextRequest) {
  const { id, view } = (await req.json().catch(() => ({}))) as { id?: string; view?: boolean };
  if (!id || !/^[a-z0-9-]{8,64}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  await db.insert(schema.visitors).values({ id, views: 1 })
    .onConflictDoUpdate({ target: schema.visitors.id, set: { lastSeen: new Date(), ...(view ? { views: sql`${schema.visitors.views} + 1` } : {}) } });
  return NextResponse.json({ ok: true });
}
