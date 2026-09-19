import { ImageResponse } from "next/og";
import { getState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";

export const runtime = "nodejs";
export const alt = "Sponsor My Auto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OG() {
  const s = await getState();
  const taken = s.slots.filter((x) => x.sponsor);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0f1133", color: "#faf3e0", padding: 56, fontFamily: "Impact, Arial Black, sans-serif", position: "relative" }}>
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "radial-gradient(60% 60% at 75% 50%, rgba(245,165,36,.45), rgba(230,62,139,.15) 45%, transparent 70%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#f5a524" }}>
          <span>ऑटो · ಆಟೋ · auto · tuk tuk</span><span>sponsormyauto.lol</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, lineHeight: 0.95 }}>
          <div style={{ display: "flex", fontSize: 120 }}>YOUR LOGO.</div>
          <div style={{ display: "flex", fontSize: 120, color: "transparent", WebkitTextStroke: "3px #faf3e0" }}>ON AN AUTO.</div>
          <div style={{ display: "flex", fontSize: 120, color: "#f5a524" }}>IN BENGALURU.</div>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: "auto", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "#faf3e0", color: "#1b1f5c", padding: "14px 22px", borderRadius: 14 }}>
            <div style={{ display: "flex", fontSize: 22, color: "#555" }}>raised</div><div style={{ display: "flex", fontSize: 48 }}>{fmtUsd(s.raisedCents)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", background: "#e63e8b", padding: "14px 22px", borderRadius: 14 }}>
            <div style={{ display: "flex", fontSize: 22 }}>slots taken</div><div style={{ display: "flex", fontSize: 48 }}>{taken.length}/{s.slots.length}</div>
          </div>
          <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
            {taken.slice(0, 5).map((t) => <img key={t.id} src={t.sponsor!.logo} width={88} height={88} style={{ display: "flex", background: "#fff", borderRadius: 12, objectFit: "contain" }} />)}
          </div>
        </div>
      </div>
    ),
    size
  );
}
