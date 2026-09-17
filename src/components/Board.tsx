"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Auto3D = dynamic(() => import("./Auto3D").then((m) => m.Auto3D), { ssr: false, loading: () => <div className="w-full h-[460px] sm:h-[560px] flex items-center justify-center font-accent text-marigold text-2xl">loading the autos…</div> });
import { Countdown } from "./Countdown";
import { SlotModal } from "./SlotModal";
import type { SlotState } from "@/lib/state";
import { AUTOS, fmtUsd } from "@/lib/slots";

type State = { slots: SlotState[]; raisedCents: number; saleEndsAt: string | null; wrapDay: string | null; mock: boolean };

const TINT: Record<string, string> = { a1: "#f5a524", a2: "#0e8c8c" };

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
  const page = slot("site-page");
  const sold = state.slots.filter((s) => s.sponsor).length;
  const closed = state.saleEndsAt ? Date.now() > Date.parse(state.saleEndsAt) : false;

  return (
    <main className="flex-1">
      {/* presented by */}
      {page.sponsor && (
        <a href={page.sponsor.url} target="_blank" rel="noopener sponsored" className="block bg-marigold text-ink text-center py-2 font-accent text-lg">
          Presented by <img src={page.sponsor.logo} alt="" className="inline h-6 mx-2 align-middle" /> <b>{page.sponsor.name}</b>
        </a>
      )}
      <div className="stripe h-3" />

      {/* hero */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-6">
        <div className="max-w-3xl">
          <div className="font-accent text-marigold text-2xl mb-2">ऑटो · ಆಟೋ · auto</div>
          <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] text-cream outline-text">
            Sponsor<br />My Auto.
          </h1>
          <p className="mt-6 text-lg text-cream/85 max-w-xl">
            Two auto rickshaws in Bengaluru. One month on the road, 8–12 hours a day. Buy the hood, the back panel, or the driver&apos;s tee.
            Anyone can <b className="text-pink">take your slot for double</b>, and you get refunded in full.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#autos" className="font-display text-xl bg-marigold text-ink px-6 py-3 rounded-lg ink-border-soft hover:bg-pink hover:text-cream transition">See the autos</a>
            <a href="#how" className="font-accent text-xl text-cream/90 px-5 py-3 underline decoration-marigold decoration-2 underline-offset-4">how it works</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 items-center">
            <div>
              <div className="font-accent text-cream/70">{closed ? "sale closed" : "sale ends in"}</div>
              <Countdown endsAt={state.saleEndsAt} />
            </div>
            <div className="paper rounded-xl px-5 py-3 ink-border-soft">
              <div className="font-accent text-ink/70 leading-none">raised so far</div>
              <div className="font-display text-3xl text-indigo">{fmtUsd(state.raisedCents)}</div>
              <div className="font-accent text-sm text-pink">{sold}/7 slots taken</div>
            </div>
          </div>
        </div>
      </section>
      <section id="autos" className="max-w-6xl mx-auto px-4 pb-6">
        <div className="paper rounded-2xl ink-border overflow-hidden relative">
          <div className="absolute top-3 left-4 z-10 font-accent text-ink/70 text-sm">drag to spin · tap a part to buy it</div>
          <Auto3D autos={AUTOS.map((a) => ({ id: a.id, name: a.name, tint: TINT[a.id], slots: { hood: slot(`${a.id}-hood`), back: slot(`${a.id}-back`), tee: slot(`${a.id}-tee`) } }))} onPick={(s) => !closed && setOpen(s)} />
        </div>
      </section>
      <div className="road max-w-6xl mx-auto" />

      {/* autos */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="font-display text-4xl sm:text-5xl text-marigold">The autos</h2>
        <p className="font-accent text-cream/80 text-xl mt-1">tap a part. pay. you&apos;re on it.</p>
        <div className="grid md:grid-cols-2 gap-10 mt-8">
          {AUTOS.map((a) => (
            <div key={a.id} className="paper rounded-2xl ink-border p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-3xl text-indigo">{a.name}</h3>
                <span className="font-accent text-ink/60">{a.plate} · {a.area}</span>
              </div>
              <div className="grid gap-3 mt-4">
                {(["hood", "back", "tee"] as const).map((k) => <SlotCard key={k} s={slot(`${a.id}-${k}`)} onBuy={() => !closed && setOpen(slot(`${a.id}-${k}`))} closed={closed} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 paper rounded-2xl ink-border p-5 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div className="font-accent text-pink text-lg leading-none">digital</div>
            <h3 className="font-display text-3xl text-indigo">The Page</h3>
            <p className="text-ink/80 text-sm mt-1">{page.size}. {page.seenBy}. {page.perk}.</p>
          </div>
          <SlotCard s={page} onBuy={() => !closed && setOpen(page)} closed={closed} compact />
        </div>
      </section>

      {/* live board */}
      <section className="bg-indigo py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-4xl text-cream">Live board</h2>
          <p className="font-accent text-marigold text-xl">updates every 10s · highest payment holds the slot</p>
          <div className="mt-6 overflow-x-auto rounded-xl ink-border-soft">
            <table className="w-full text-left bg-ink">
              <thead className="font-accent text-marigold text-lg">
                <tr><th className="px-4 py-3">slot</th><th className="px-4 py-3">sponsor</th><th className="px-4 py-3">holding at</th><th className="px-4 py-3">take over for</th></tr>
              </thead>
              <tbody>
                {state.slots.map((s) => (
                  <tr key={s.id} className="border-t border-cream/10">
                    <td className="px-4 py-3 font-display">{s.name}</td>
                    <td className="px-4 py-3">{s.sponsor ? <a href={s.sponsor.url} target="_blank" rel="noopener sponsored" className="inline-flex items-center gap-2 hover:text-marigold"><img src={s.sponsor.logo} alt="" className="h-6 w-6 object-contain bg-cream rounded" />{s.sponsor.name}</a> : <span className="text-cream/50 font-accent">open</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{s.sponsor ? fmtUsd(s.currentPriceCents) : "—"}</td>
                    <td className="px-4 py-3"><button disabled={closed} onClick={() => setOpen(s)} className="font-display text-marigold hover:text-pink disabled:opacity-40">{fmtUsd(s.nextPriceCents)} →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* how */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-6">
        {[
          ["1. Pick a part", "Hood, back panel, or the driver's tee on either auto. Or the banner on this page."],
          ["2. Pay, upload, done", "No account. Card checkout, drop your logo and link, you're live on this page in seconds."],
          ["3. Wrap day", `Panels printed and fitted${state.wrapDay ? ` on ${new Date(state.wrapDay).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}` : ""}. Reveal video, then 30 days on the road with daily photo proof.`],
        ].map(([h, p]) => (
          <div key={h} className="paper rounded-2xl ink-border p-5">
            <h3 className="font-display text-2xl text-indigo">{h}</h3>
            <p className="mt-2 text-ink/80">{p}</p>
          </div>
        ))}
      </section>

      {/* perks */}
      <section className="max-w-6xl mx-auto px-4 pb-14">
        <h2 className="font-display text-4xl text-marigold">What you get</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 text-cream/90">
          {[
            "30 days on the road, 8–12 hrs/day",
            "Wrap-day reveal video + photo set of your slot",
            "Daily proof photo from the driver, posted here",
            "GPS route heatmap at day 15 and day 30",
            "End-of-month views estimate",
            "Logo + link on this page for the whole month",
            "Tagged in the launch post, the reveal, and weekly updates",
            "First refusal on the same slot next month at closing price",
            "Hood sponsors: the physical panels shipped to you after",
          ].map((t) => <div key={t} className="flex gap-3 items-start"><span className="text-pink font-display">✦</span><span>{t}</span></div>)}
        </div>
      </section>

      {/* numbers */}
      <section className="bg-marigold text-ink py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[["2", "autos"], ["30", "days each"], ["8–12", "hrs on road / day"], ["8.5–12k", "est. hood views / day"]].map(([n, l]) => (
            <div key={l}><div className="font-display text-4xl sm:text-5xl">{n}</div><div className="font-accent text-lg">{l}</div></div>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <h2 className="font-display text-4xl text-marigold mb-6">Questions</h2>
        <div className="space-y-3">
          {[
            ["What happens if someone takes my slot?", "They pay double what you paid. You get a full automatic refund and a notification if you left an email. You can take it back at double again."],
            ["Is there a login?", "No. Pay, upload, done. Save the link on your thank-you page if you want to check on it."],
            ["Can I pick the route?", "No, but you get the GPS heatmap so you know exactly where the auto went."],
            ["What artwork do you need?", "Just a logo now. After the sale closes you get the print templates for the hood (3 panels), back panel, and tee front. 300dpi, CMYK. Deadline is 24h after close."],
            ["What's not allowed?", "Alcohol, tobacco, gambling, political, adult, and anything the transport authority rejects. Refunded if declined."],
            ["What if the auto breaks down?", "Missed days are added to the end of the month."],
            ["Invoice?", "Yes, a USD invoice from the payment receipt via Dodo Payments."],
          ].map(([q, a]) => (
            <details key={q} className="paper rounded-xl ink-border-soft p-4 group">
              <summary className="font-display text-lg text-indigo cursor-pointer list-none flex justify-between">{q}<span className="text-pink group-open:rotate-45 transition">+</span></summary>
              <p className="mt-2 text-ink/80">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-cream/10 py-8 text-center font-accent text-cream/70">
        <div className="stripe h-2 mb-6 max-w-xs mx-auto rounded" />
        Built by Shrithan · <a className="underline decoration-marigold" href="https://x.com/" target="_blank" rel="noopener">@handle</a> · Month 2 opens after wrap day
        {state.mock && <div className="mt-2 text-pink">test mode: payments are mocked</div>}
        <div className="mt-3 text-xs text-cream/50">3D model: <a className="underline" href="https://skfb.ly/oKDIs" target="_blank" rel="noopener">&quot;Tuk Tuk Rikshaw&quot;</a> by alnmathew, <a className="underline" href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></div>
      </footer>

      {open && <SlotModal slot={open} onClose={() => setOpen(null)} />}
    </main>
  );
}

function SlotCard({ s, onBuy, closed, compact }: { s: SlotState; onBuy: () => void; closed: boolean; compact?: boolean }) {
  return (
    <button onClick={onBuy} disabled={closed}
      className={`text-left rounded-xl ink-border-soft bg-white hover:bg-paper transition p-3 flex items-center gap-3 disabled:opacity-60 ${compact ? "" : "w-full"}`}>
      <div className="h-12 w-12 shrink-0 rounded-lg bg-cream flex items-center justify-center overflow-hidden">
        {s.sponsor ? <img src={s.sponsor.logo} alt="" className="h-full w-full object-contain" /> : <span className="font-accent text-ink/50 text-xs text-center leading-tight">open</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-indigo truncate">{s.name.split(" · ")[1] ?? s.name}</div>
        <div className="text-xs text-ink/70 truncate">{s.sponsor ? <>held by <b>{s.sponsor.name}</b> at {fmtUsd(s.currentPriceCents)}</> : s.views}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-accent text-xs text-pink leading-none">{s.sponsor ? "take over" : "buy now"}</div>
        <div className="font-display text-xl text-indigo">{fmtUsd(s.nextPriceCents)}</div>
      </div>
    </button>
  );
}
