import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";

export const runtime = "nodejs";
export const alt = "Sponsor My Auto: your logo on a Bengaluru auto-rickshaw for 30 days";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

// satori only knows the fonts we hand it; Titan One is the display face used on the site
const titan = readFile(join(process.cwd(), "assets/TitanOne.ttf"));
const origin = process.env.NEXT_PUBLIC_APP_URL || "https://sponsormyauto.lol"; // sponsor logos are same-origin URLs; satori needs them absolute

export default async function OG() {
  const [s, font] = await Promise.all([getState(), titan]);
  const taken = s.slots.filter((x) => x.sponsor);
  const hood = s.slots.find((x) => x.id === "a1-hood");
  const card = (label: string, value: string, bg: string, fg: string) => (
    <div style={{ display: "flex", flexDirection: "column", background: bg, color: fg, padding: "14px 22px", borderRadius: 14 }}>
      <div style={{ display: "flex", fontSize: 22, opacity: 0.75 }}>{label}</div>
      <div style={{ display: "flex", fontSize: 48 }}>{value}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0f1133", color: "#faf3e0", padding: 56, fontFamily: "Titan One", position: "relative" }}>
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "radial-gradient(60% 60% at 75% 50%, rgba(245,165,36,.45), rgba(230,62,139,.15) 45%, transparent 70%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#f5a524" }}>
          <span>auto · tuk tuk · Bengaluru</span><span>sponsormyauto.lol</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36, lineHeight: 0.95 }}>
          <div style={{ display: "flex", fontSize: 118 }}>YOUR LOGO.</div>
          <div style={{ display: "flex", fontSize: 118, color: "#e63e8b" }}>ON AN AUTO.</div>
          <div style={{ display: "flex", fontSize: 118, color: "#f5a524" }}>IN BENGALURU.</div>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: "auto", alignItems: "flex-end" }}>
          {taken.length === 0
            ? <>{card("the hood", `${hood ? fmtUsd(hood.nextPriceCents) : "$2,000"} · open`, "#faf3e0", "#1b1f5c")}{card("30 days · 6 slots", "take any for 2x", "#e63e8b", "#faf3e0")}</>
            : <>{card("raised", fmtUsd(s.raisedCents), "#faf3e0", "#1b1f5c")}{card("slots taken", `${taken.length}/${s.slots.length}`, "#e63e8b", "#faf3e0")}</>}
          <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
            {taken.slice(0, 5).map((t) => <img key={t.id} src={`${origin}${t.sponsor!.logo}`} width={88} height={88} style={{ display: "flex", background: "#fff", borderRadius: 12, objectFit: "contain" }} />)}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Titan One", data: font, weight: 400, style: "normal" }] }
  );
}
