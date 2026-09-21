"use client";
import dynamic from "next/dynamic";
import type { SlotState } from "@/lib/state";
const Auto3D = dynamic(() => import("@/components/Auto3D").then((m) => m.Auto3D), { ssr: false, loading: () => null });
export function FilmClient({ slots }: { slots: SlotState[] }) {
  // ?mock=/mockups/x.png&brand=Name&slot=a1-hood  → render a fake sponsor on that slot (for "reply with your logo" mockups)
  const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const mockLogo = q?.get("mock"), mockBrand = q?.get("brand") ?? "Your brand", mockSlot = q?.get("slot") ?? "a1-hood";
  // multi: ?mocks=a1-hood:/mockups/a.png:Brand A,a1-side-l:/mockups/b.png:Brand B
  const multi: Record<string, { logo: string; brand: string }> = {};
  for (const part of (q?.get("mocks") ?? "").split(",").filter(Boolean)) { const [sid, logo, ...b] = part.split(":"); if (sid && logo?.startsWith("/mockups/")) multi[sid] = { logo, brand: b.join(":") || "Your brand" }; }
  if (mockLogo && mockLogo.startsWith("/mockups/")) multi[mockSlot] = { logo: mockLogo, brand: mockBrand };
  // full wrap: ?wrap=1 draws each mock edge to edge (no card chrome), ?paint=%23hex recolours the canopy, ?body=%23hex the lower body
  const wrap = q?.get("wrap") === "1";
  const hex = (v: string | null | undefined) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
  const paint = { top: hex(q?.get("paint")), body: hex(q?.get("body")) };
  const slot = (id: string) => {
    const s = slots.find((s) => s.id === id)!;
    const m = multi[id];
    if (m) return { ...s, sponsor: { name: m.brand, url: "#", logo: m.logo, amountCents: s.nextPriceCents, since: new Date().toISOString() }, currentPriceCents: s.nextPriceCents, nextPriceCents: s.nextPriceCents };
    return s;
  };
  const autoSlots = { hood: slot("a1-hood"), visor: slot("a1-visor"), "side-l": slot("a1-side-l"), "side-r": slot("a1-side-r"), top: slot("a1-top") };
  return (
    <main className="fixed inset-0 bg-ink grain" style={q?.get("bg") ? { background: q.get("bg")! } : undefined}>
      {!q?.get("bg") && <div className="absolute inset-0" style={{ background: "radial-gradient(48% 55% at 50% 52%, rgba(245,165,36,.42), rgba(230,62,139,.14) 45%, transparent 72%)" }} />}
      <Auto3D slots={autoSlots} onPick={() => {}} className="absolute inset-0" film wrap={wrap} paint={paint} />
    </main>
  );
}
