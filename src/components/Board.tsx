"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Countdown } from "./Countdown";
import { SlotModal } from "./SlotModal";
import type { SlotState } from "@/lib/state";
import { AUTO, fmtUsd } from "@/lib/slots";

const Auto3D = dynamic(() => import("./Auto3D").then((m) => m.Auto3D), { ssr: false, loading: () => null });

type State = { slots: SlotState[]; raisedCents: number; saleEndsAt: string | null; wrapDay: string | null; mock: boolean };

const MARQUEE = ["HORN OK PLEASE", "ONE AUTO", "30 DAYS", "8–12K EYEBALLS A DAY", "NO LOGIN", "TAKE IT FOR 2X", "BENGALURU", "YOUR LOGO HERE"];

export function Board({ initial }: { initial: State }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState<SlotState | null>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      try { const r = await fetch("/api/state", { cache: "no-store" }); if (r.ok) setState(await r.json()); } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const slot = (id: string) => state.slots.find((s) => s.id === id)!;
  const hood = slot("a1-hood"), tee = slot("a1-tee"), page = slot("site-page");
  const closed = state.saleEndsAt ? Date.now() > Date.parse(state.saleEndsAt) : false;
  const pick = (s: SlotState) => { if (!closed) setOpen(s); };
  const wrap = state.wrapDay ? new Date(state.wrapDay).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "wrap day";

  return (
    <main className="flex-1 sel">
      {page.sponsor && (
        <a href={page.sponsor.url} target="_blank" rel="noopener sponsored" className="block bg-marigold text-ink text-center py-2 font-accent text-lg">
          Presented by <img src={page.sponsor.logo} alt="" className="inline h-6 mx-2 align-middle" /> <b>{page.sponsor.name}</b>
        </a>
      )}

      {/* ===== HERO: full-bleed 3D with type on top ===== */}
      <section className="relative sm:min-h-[100svh] grain overflow-hidden flex flex-col">
        <div className="absolute inset-0 glow" />

        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-5 pointer-events-none">
          <div className="font-accent text-marigold text-xl">ऑटो · ಆಟೋ · auto</div>
          <div className="paper rounded-lg px-3 py-1.5 ink-border-soft text-sm font-accent pointer-events-auto">
            <span className="text-ink/60">raised</span> <b className="font-display text-indigo text-base">{fmtUsd(state.raisedCents)}</b>
          </div>
        </div>

        {/* headline */}
        <div className="relative z-10 px-5 sm:px-8 pt-6 sm:pt-10 pointer-events-none sm:flex-1">
          <h1 className="font-display huge text-cream">
            <span className="block rise rise-1">YOUR LOGO.</span>
            <span className="block rise rise-2 stroke">ON AN AUTO.</span>
            <span className="block rise rise-3 text-marigold">IN BENGALURU.</span>
          </h1>
        </div>

        {/* the auto: stacked on mobile, full-bleed behind the type from sm up */}
        <div className="relative h-[46svh] mt-2 sm:mt-0 sm:absolute sm:inset-0 sm:h-auto lg:left-[30%] sm:z-0">
          <Auto3D autos={[{ id: AUTO.id, tint: "#f5a524", slots: { hood, tee } }]} onPick={pick} className="w-full h-full" />
        </div>

        {/* bottom row */}
        <div className="relative sm:absolute z-10 left-0 right-0 bottom-0 px-5 sm:px-8 pb-7 pt-4 sm:pt-0 flex flex-col sm:flex-row sm:items-end justify-between gap-5 pointer-events-none">
          <div className="rise rise-4 max-w-md">
            <p className="text-cream/90 text-lg leading-snug">
              One rickshaw, thirty days, ten hours a day in traffic. Every car stuck behind it reads your hood.
              Anyone can take your slot for <b className="text-pink">double</b>. You get every dollar back.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 pointer-events-auto">
              <button onClick={() => pick(hood)} disabled={closed}
                className="font-display text-xl bg-marigold text-ink px-6 py-3 rounded-lg ink-border-soft hover:bg-pink hover:text-cream transition disabled:opacity-60">
                {hood.sponsor ? `Take the hood · ${fmtUsd(hood.nextPriceCents)}` : `Take the hood · ${fmtUsd(hood.nextPriceCents)}`}
              </button>
              <a href="#slots" className="font-accent text-xl text-cream px-4 py-3 underline decoration-marigold decoration-2 underline-offset-4">all slots ↓</a>
            </div>
          </div>
          <div className="rise rise-4 pointer-events-auto">
            <div className="font-accent text-cream/70 text-right sm:text-right">{closed ? "sale closed" : "closes in"}</div>
            <Countdown endsAt={state.saleEndsAt} />
          </div>
        </div>
        <div className="absolute z-10 top-1/2 right-5 hidden lg:block font-accent text-cream/50 text-sm rotate-90 origin-right pointer-events-none">drag to spin · tap the hood</div>
      </section>

      {/* marquee */}
      <div className="marquee bg-marigold text-ink border-y-4 border-ink py-3 font-display text-xl sm:text-2xl">
        <div>{[...MARQUEE, ...MARQUEE].map((t, i) => <span key={i} className="px-6">{t} <span className="text-pink">★</span></span>)}</div>
      </div>

      {/* ===== SLOTS ===== */}
      <section id="slots" className="max-w-6xl mx-auto px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-5xl sm:text-7xl text-cream leading-none">Three slots.<br /><span className="text-pink">That&apos;s the whole menu.</span></h2>
          <p className="font-accent text-marigold text-2xl max-w-xs">tap, pay, upload. you&apos;re on the auto before your bank texts you.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <SlotCard s={hood} onBuy={() => pick(hood)} closed={closed} tag="THE BIG ONE" r="-1.5deg"
            lines={["8–9 sq ft of rear hood", "270°: behind it and both sides", "~10k eyeballs a day", "Printed panels shipped to you after"]} />
          <SlotCard s={tee} onBuy={() => pick(tee)} closed={closed} tag="THE CLOSE-UP" r="1.2deg"
            lines={["Front of the driver's tee", "Every rider, every ride, 15 min each", "In every photo and video we post", "Driver says your tagline on camera"]} />
          <SlotCard s={page} onBuy={() => pick(page)} closed={closed} tag="THE INTERNET" r="-0.8deg"
            lines={["Presented-by banner on this site", "Named in every post for the month", "Your link, dofollow, all month", "The cheapest way into the story"]} />
        </div>
      </section>

      {/* ===== HOW (3 giant numerals) ===== */}
      <section className="bg-pink text-cream border-y-4 border-ink">
        <div className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-10">
          {[
            ["1", "Tap. Pay. Upload.", "No account. Card in, logo in, you're live on this page in seconds."],
            ["2", "Hold it or lose it.", "Anyone can take your slot by paying double. You're refunded in full. Take it back at double again if you're petty."],
            ["3", `Wrap day: ${wrap}.`, "We print, we fit, we film the reveal. Then 30 days on the road with a photo from the driver every single day."],
          ].map(([n, h, p]) => (
            <div key={n} className="flex gap-5">
              <div className="font-display text-7xl sm:text-8xl leading-none text-ink outline-text" style={{ WebkitTextStroke: "2px #0f1133", textShadow: "4px 4px 0 #faf3e0" }}>{n}</div>
              <div><h3 className="font-display text-2xl">{h}</h3><p className="mt-2 text-cream/90">{p}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BOARD ===== */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-display text-5xl sm:text-6xl text-marigold leading-none">The rate board</h2>
        <p className="font-accent text-cream/70 text-xl mt-2">live · highest payment holds the slot · refresh not required</p>
        <div className="mt-8 grid gap-3">
          {state.slots.map((s, i) => (
            <div key={s.id} className="paper rounded-xl ink-border-soft px-5 py-4 flex items-center gap-4 tilt" style={{ ["--r" as string]: `${i % 2 ? 0.6 : -0.6}deg` }}>
              <div className="h-14 w-14 shrink-0 rounded-lg bg-white ink-border-soft flex items-center justify-center overflow-hidden">
                {s.sponsor ? <img src={s.sponsor.logo} alt="" className="h-full w-full object-contain" /> : <span className="font-accent text-ink/40 text-xs">open</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-2xl text-indigo leading-none">{s.name}</div>
                <div className="font-accent text-ink/70 truncate">
                  {s.sponsor ? <>held by <a href={s.sponsor.url} target="_blank" rel="noopener sponsored" className="text-pink underline">{s.sponsor.name}</a> · paid {fmtUsd(s.currentPriceCents)}</> : "nobody's on it yet. be the first, or wait and pay double."}
                </div>
              </div>
              <button disabled={closed} onClick={() => pick(s)}
                className="font-display text-xl bg-marigold text-ink px-5 py-2.5 rounded-lg ink-border-soft hover:bg-pink hover:text-cream transition disabled:opacity-60 whitespace-nowrap">
                {s.sponsor ? "Take it" : "Take it"} · {fmtUsd(s.nextPriceCents)}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PERKS as stickers ===== */}
      <section className="bg-indigo border-y-4 border-ink">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="font-display text-4xl sm:text-5xl text-cream">Every sponsor gets</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              ["30 days on the road", "#f5a524", "-2deg"], ["reveal video", "#e63e8b", "1.5deg"], ["daily driver photo", "#0e8c8c", "-1deg"],
              ["GPS heatmap", "#f5a524", "2deg"], ["views report", "#faf3e0", "-1.5deg"], ["logo + link here all month", "#e63e8b", "1deg"],
              ["tagged in every post", "#0e8c8c", "-2deg"], ["first refusal on month 2", "#faf3e0", "1.5deg"], ["the hood, shipped to you", "#f5a524", "-1deg"],
            ].map(([t, c, r]) => (
              <span key={t} className="stamp text-lg sm:text-xl floaty" style={{ color: c, ["--r" as string]: r, animationDelay: `${Math.random() * 2}s` }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ, short ===== */}
      <section className="max-w-3xl mx-auto px-5 py-20">
        <h2 className="font-display text-4xl text-marigold mb-6">Quick ones</h2>
        <div className="space-y-3">
          {[
            ["Someone took my slot?", "They paid double. You're refunded in full, automatically. Take it back at double if you want it."],
            ["Do I need an account?", "No. Your thank-you page has a bookmarkable link. That's your account."],
            ["Can I pick the route?", "No, but you get the GPS heatmap, so you'll know exactly where your logo went."],
            ["What do you need from me?", "A logo today. Print-ready artwork within 24h of the sale closing. We send templates."],
            ["Auto's off the road a day?", "That day gets added to the end. You get your 30."],
          ].map(([q, a]) => (
            <details key={q} className="paper rounded-xl ink-border-soft p-4 group tilt" style={{ ["--r" as string]: "0deg" }}>
              <summary className="font-display text-lg text-indigo cursor-pointer list-none flex justify-between gap-4">{q}<span className="text-pink group-open:rotate-45 transition">+</span></summary>
              <p className="mt-2 text-ink/80">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== CLOSER ===== */}
      <section className="relative overflow-hidden border-t-4 border-ink">
        <div className="absolute inset-0 glow" />
        <div className="relative max-w-6xl mx-auto px-5 py-24 text-center">
          <div className="font-accent text-marigold text-2xl">still here?</div>
          <h2 className="font-display huge text-cream mt-2">TAKE THE<br /><span className="stroke-pink">HOOD.</span></h2>
          <button onClick={() => pick(hood)} disabled={closed}
            className="mt-8 font-display text-2xl bg-marigold text-ink px-8 py-4 rounded-lg ink-border hover:bg-pink hover:text-cream transition disabled:opacity-60">
            {fmtUsd(hood.nextPriceCents)} →
          </button>
        </div>
      </section>

      <footer className="border-t border-cream/10 py-8 text-center font-accent text-cream/70">
        Built by Shrithan · <a className="underline decoration-marigold" href="https://x.com/" target="_blank" rel="noopener">@handle</a> · Month 2 opens after wrap day
        {state.mock && <div className="mt-2 text-pink">test mode: payments are mocked</div>}
        <div className="mt-3 text-xs text-cream/50">3D model: <a className="underline" href="https://skfb.ly/oKDIs" target="_blank" rel="noopener">&quot;Tuk Tuk Rikshaw&quot;</a> by alnmathew, <a className="underline" href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></div>
      </footer>

      {open && <SlotModal slot={open} onClose={() => setOpen(null)} />}
    </main>
  );
}

function SlotCard({ s, onBuy, closed, tag, lines, r }: { s: SlotState; onBuy: () => void; closed: boolean; tag: string; lines: string[]; r: string }) {
  return (
    <div className="paper rounded-2xl ink-border p-6 flex flex-col tilt relative" style={{ ["--r" as string]: r, transform: `rotate(${r})` }}>
      <div className="absolute -top-4 left-5 stamp bg-pink text-cream border-ink text-sm">{tag}</div>
      {s.sponsor && <div className="absolute -top-4 right-5 stamp bg-teal text-cream border-ink text-sm">TAKEN</div>}
      <h3 className="font-display text-4xl text-indigo mt-3 leading-none">{s.name}</h3>
      <div className="font-display text-6xl text-pink mt-3 leading-none">{fmtUsd(s.nextPriceCents)}</div>
      <div className="font-accent text-ink/60 mt-1">{s.sponsor ? `to take it from ${s.sponsor.name}` : "to be first on it"}</div>
      <ul className="mt-5 space-y-1.5 text-ink/85 flex-1">
        {lines.map((l) => <li key={l} className="flex gap-2"><span className="text-pink">★</span>{l}</li>)}
      </ul>
      <button onClick={onBuy} disabled={closed}
        className="mt-6 font-display text-xl bg-ink text-marigold px-5 py-3 rounded-lg hover:bg-pink hover:text-cream transition disabled:opacity-60">
        {s.sponsor ? "Take it" : "Take it"} →
      </button>
    </div>
  );
}
