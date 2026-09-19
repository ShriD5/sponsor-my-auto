import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves a purchase's logo as a real image. The board state and the 10s poll carry only this URL instead of a
 * ~400KB data URL per sponsor, which is what keeps a viral day inside Vercel Hobby bandwidth. A purchase's logo
 * never changes, so the CDN may cache it forever; hidden (moderated) logos 404 for new fetches.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const [p] = await db.select({ logo: schema.purchases.logoData, hidden: schema.purchases.hidden }).from(schema.purchases).where(eq(schema.purchases.id, id));
  if (!p || p.hidden) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(p.logo);
  if (!m) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
