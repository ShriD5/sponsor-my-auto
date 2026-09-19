"use client";
import dynamic from "next/dynamic";
import type { SlotState } from "@/lib/state";
const Auto3D = dynamic(() => import("@/components/Auto3D").then((m) => m.Auto3D), { ssr: false, loading: () => null });
export function FilmClient({ slots }: { slots: SlotState[] }) {
  const slot = (id: string) => slots.find((s) => s.id === id)!;
  const autoSlots = { hood: slot("a1-hood"), visor: slot("a1-visor"), "side-l": slot("a1-side-l"), "side-r": slot("a1-side-r"), top: slot("a1-top") };
  return (
    <main className="fixed inset-0 bg-ink grain">
      <div className="absolute inset-0" style={{ background: "radial-gradient(48% 55% at 50% 52%, rgba(245,165,36,.42), rgba(230,62,139,.14) 45%, transparent 72%)" }} />
      <Auto3D slots={autoSlots} onPick={() => {}} className="absolute inset-0" film />
    </main>
  );
}
