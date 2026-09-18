import { NextResponse } from "next/server";
import { getState } from "@/lib/state";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getState();
  return NextResponse.json(s, { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } });
}
