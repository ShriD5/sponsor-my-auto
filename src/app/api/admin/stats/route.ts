import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { SLOT_DEFS } from "@/lib/slots";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authed(req: NextRequest) {
  const want = process.env.ADMIN_TOKEN ?? "", got = req.headers.get("x-admin-token") ?? "";
  if (want.length < 24 || want.length !== got.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(got));
}

type Row = Record<string, unknown>;
const q = async <T extends Row = Row>(s: ReturnType<typeof sql>) => (await db.execute(s)).rows as T[];

/** Everything the /admin dashboard shows, in one round of parallel queries. Bots are excluded from traffic numbers. */
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "nope" }, { status: 401 });
  const human = sql`kind = 'view' and browser is distinct from 'bot'`;
  const top = (col: string, hours: number | null, limit = 10) =>
    q<{ k: string | null; n: number; u: number }>(sql`
      select ${sql.raw(col)} as k, count(*)::int as n, count(distinct visitor_id)::int as u from events
      where ${human} ${hours ? sql`and ts > now() - ${sql.raw(`interval '${hours} hours'`)}` : sql``}
      group by 1 order by n desc limit ${limit}`);

  const [
    totals, today, live, hourly, daily, referrers, utm, countries, cities, devices, browsers, os, funnel, perSlot, purchases, pendingRefunds,
  ] = await Promise.all([
    q<{ views: number; uniques: number; first: string | null }>(sql`select count(*)::int as views, count(distinct visitor_id)::int as uniques, min(ts) as first from events where ${human}`),
    q<{ views: number; uniques: number }>(sql`select count(*)::int as views, count(distinct visitor_id)::int as uniques from events where ${human} and ts > now() - interval '24 hours'`),
    q<{ n: number }>(sql`select count(*)::int as n from visitors where last_seen > now() - interval '60 seconds'`),
    q<{ h: string; n: number; u: number }>(sql`
      select to_char(date_trunc('hour', ts), 'YYYY-MM-DD"T"HH24:00:00"Z"') as h, count(*)::int as n, count(distinct visitor_id)::int as u
      from events where ${human} and ts > now() - interval '48 hours' group by 1 order by 1`),
    q<{ d: string; n: number; u: number }>(sql`
      select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as d, count(*)::int as n, count(distinct visitor_id)::int as u
      from events where ${human} and ts > now() - interval '30 days' group by 1 order by 1`),
    top("coalesce(referrer, '(direct)')", null, 15),
    top("coalesce(utm_source, '(none)')", null, 15),
    top("coalesce(country, '??')", null, 15),
    top("coalesce(city || ', ' || country, '??')", null, 15),
    top("coalesce(device, '?')", null, 5),
    top("coalesce(browser, '?')", null, 10),
    top("coalesce(os, '?')", null, 8),
    q<{ kind: string; n: number; u: number }>(sql`select kind, count(*)::int as n, count(distinct visitor_id)::int as u from events where browser is distinct from 'bot' group by kind`),
    q<{ slot_id: string; kind: string; u: number }>(sql`select slot_id, kind, count(distinct visitor_id)::int as u from events where kind in ('modal','checkout') and slot_id is not null group by 1, 2`),
    q<{ id: string; slot_id: string; sponsor_name: string; url: string; email: string | null; amount_cents: number; status: string; hidden: boolean; is_mock: boolean; refund_id: string | null; created_at: string; paid_at: string | null }>(sql`
      select id, slot_id, sponsor_name, url, email, amount_cents, status, hidden, is_mock, refund_id, created_at, paid_at
      from purchases where status <> 'pending' and status <> 'expired' order by coalesce(paid_at, created_at) desc limit 30`),
    q<{ n: number }>(sql`select count(*)::int as n from purchases where status in ('superseded','failed') and payment_id is not null and refund_id is null and is_mock = false`),
  ]);

  const paidBySlot = await q<{ slot_id: string; n: number; cents: number }>(sql`select slot_id, count(*)::int as n, coalesce(sum(amount_cents),0)::int as cents from purchases where status in ('paid','superseded','refunded') and is_mock = false group by 1`);
  const slots = SLOT_DEFS.map((s) => ({
    id: s.id, name: s.name,
    modal: perSlot.find((r) => r.slot_id === s.id && r.kind === "modal")?.u ?? 0,
    checkout: perSlot.find((r) => r.slot_id === s.id && r.kind === "checkout")?.u ?? 0,
    paid: paidBySlot.find((r) => r.slot_id === s.id)?.n ?? 0,
    cents: paidBySlot.find((r) => r.slot_id === s.id)?.cents ?? 0,
  }));
  const f = (k: string) => funnel.find((r) => r.kind === k) ?? { n: 0, u: 0 };

  return NextResponse.json({
    at: new Date().toISOString(),
    totals: { ...totals[0], today: today[0], live: live[0]?.n ?? 0 },
    hourly, daily, referrers, utm, countries, cities, devices, browsers, os,
    funnel: { views: f("view"), modal: f("modal"), checkout: f("checkout"), paid: paidBySlot.reduce((a, r) => a + r.n, 0) },
    slots, purchases, pendingRefunds: pendingRefunds[0]?.n ?? 0,
  }, { headers: { "Cache-Control": "no-store" } });
}
