import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { retryPendingRefunds } from "@/lib/refunds";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron (see vercel.json) calls this with `Authorization: Bearer $CRON_SECRET`; `x-admin-token` also works for a manual poke. */
function authed(req: NextRequest) {
  const cron = process.env.CRON_SECRET ?? "", admin = process.env.ADMIN_TOKEN ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const adminGot = req.headers.get("x-admin-token") ?? "";
  const same = (a: string, b: string) => a.length >= 24 && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  return same(cron, bearer) || same(admin, adminGot);
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "nope" }, { status: 401 });
  const results = await retryPendingRefunds();
  return NextResponse.json({ ok: true, pending: results.filter((r) => !r.ok).length, results });
}
