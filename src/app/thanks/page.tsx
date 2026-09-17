"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fmtUsd } from "@/lib/slots";

type P = { status: string; slotName?: string; sponsorName: string; url: string; logo: string; amountCents: number };

function Thanks() {
  const sp = useSearchParams();
  const id = sp.get("p"); const paymentId = sp.get("payment_id");
  const [p, setP] = useState<P | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!id) return;
    let stop = false;
    const tick = async () => {
      const r = await fetch(`/api/purchases/${id}${paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : ""}`, { cache: "no-store" });
      if (r.ok) { const j = await r.json(); if (!stop) setP(j); if (j.status !== "pending") return; }
      if (!stop) { setTries((t) => t + 1); setTimeout(tick, 2500); }
    };
    tick();
    return () => { stop = true; };
  }, [id, paymentId]);

  const live = p && p.status !== "pending" && p.status !== "failed";
  const share = p ? `https://x.com/intent/tweet?text=${encodeURIComponent(`${p.sponsorName} is on an auto rickshaw in Bengaluru for a month 🛺 (${p.slotName}). Take it from us for double → ${process.env.NEXT_PUBLIC_APP_URL || ""}`)}` : "#";

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="paper rounded-2xl ink-border p-7 max-w-md w-full text-center space-y-4">
        {!id ? <p>Missing purchase id.</p> : !p ? <p className="font-accent text-xl">checking…</p> : live ? (
          <>
            <div className="sticker inline-block bg-pink text-cream px-4 py-1 rounded text-xl">you&apos;re on it</div>
            <img src={p.logo} alt="" className="h-24 mx-auto object-contain" />
            <h1 className="font-display text-3xl text-indigo">{p.sponsorName}</h1>
            <p className="text-ink/80">{p.slotName} · holding at <b>{fmtUsd(p.amountCents)}</b>. It&apos;s already showing on the page.</p>
            <div className="flex gap-3 justify-center pt-2">
              <a href="/" className="font-display bg-marigold text-ink px-5 py-2 rounded-lg ink-border-soft">See the auto</a>
              <a href={share} target="_blank" rel="noopener" className="font-accent text-lg underline decoration-pink px-3 py-2">tell people</a>
            </div>
            <p className="text-xs text-ink/60">Bookmark this page. If someone takes your slot for double you&apos;re refunded in full.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-indigo">Waiting for payment confirmation…</h1>
            <p className="text-ink/80 text-sm">Usually a few seconds. {tries > 8 && "Taking longer than usual; if you paid, it will settle when the webhook lands. Keep this tab open."}</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function Page() { return <Suspense><Thanks /></Suspense>; }
