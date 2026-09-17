"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Countdown } from "./Countdown";
import { SlotModal } from "./SlotModal";
import type { SlotState } from "@/lib/state";
import { AUTO, fmtUsd } from "@/lib/slots";

const Auto3D = dynamic(() => import("./Auto3D").then((m) => m.Auto3D), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] sm:h-[520px] flex items-center justify-center font-accent text-indigo text-2xl">bringing the auto around…</div>,
});

type State = { slots: SlotState[]; raisedCents: number; saleEndsAt: string | null; wrapDay: string | null; mock: boolean };

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
  const sold = state.slots.filter((s) => s.sponsor).length;
  const closed = state.saleEndsAt ? Date.now() > Date.parse(state.saleEndsAt) : false;
  const pick = (s: SlotState) => { if (!closed) setOpen(s); };
  const wrap = state.wrapDay ? new Date(state.wrapDay).toLocaleDateString("en-IN", { day: "numeric", month: "long" }) : null;

  return (
    <main className="flex-1">
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
            Put your logo<br />on an auto.
          </h1>
          <p className="mt-6 text-lg text-cream/85 max-w-xl">
            One rickshaw. Thirty days on Bengaluru roads, ten hours a day. Your brand on the hood,
            where every car stuck behind it has nothing else to look at.
            Anyone can <b className="text-pink">take your slot for double</b>. If they do, you get every dollar back.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => pick(hood)} disabled={closed}
              className="font-display text-xl bg-marigold text-ink px-6 py-3 rounded-lg ink-border-soft hover:bg-pink hover:text-cream transition disabled:opacity-60">
              {hood.sponsor ? `Take the hood · ${fmtUsd(hood.nextPriceCents)}` : `Buy the hood · ${fmtUsd(hood.nextPriceCents)}`}
            </button>
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
              <div className="font-accent text-sm text-pink">{sold}/{state.slots.length} slots taken</div>
            </div>
          </div>
        </div>
      </section>

      {/* the auto */}
      <section id="auto" className="max-w-6xl mx-auto px-4 pb-6">
        <div className="paper rounded-2xl ink-border overflow-hidden relative">
          <div className="absolute top-3 left-4 z-10 font-accent text-ink/70 text-sm">drag to spin · tap the hood or the tee to buy it</div>
          <Auto3D autos={[{ id: AUTO.id, tint: "#f5a524", slots: { hood, tee } }]} onPick={pick} />
        </div>
      </section>
      <div className="road max-w-6xl mx-auto" />

      {/* slots */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="font-display text-4xl sm:text-5xl text-marigold">Three slots. That&apos;s it.</h2>
        <p className="font-accent text-cream/80 text-xl mt-1">no account, no call, no media kit. pay, upload, you&apos;re on.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <SlotCard s={hood} onBuy={() => pick(hood)} closed={closed} tag="the big one" />
          <SlotCard s={tee} onBuy={() => pick(tee)} closed={closed} tag="the one riders read" />
          <SlotCard s={page} onBuy={() => pick(page)} closed={closed} tag="digital" />
        </div>
      </section>

      {/* live board */}
      <section className="bg-indigo py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-4xl text-cream">Who&apos;s on it right now</h2>
          <p className="font-accent text-marigold text-xl">highest payment holds the slot · updates every 10 seconds</p>
          <div className="mt-6 overflow-x-auto rounded-xl ink-border-soft">
            <table className="w-full text-left bg-ink">
              <thead className="font-accent text-marigold text-lg">
                <tr><th className="px-4 py-3">slot</th><th className="px-4 py-3">held by</th><th className="px-4 py-3">paid</th><th className="px-4 py-3">take it for</th></tr>
              </thead>
              <tbody>
                {state.slots.map((s) => (
                  <tr key={s.id} className="border-t border-cream/10">
                    <td className="px-4 py-3 font-display">{s.name}</td>
                    <td className="px-4 py-3">{s.sponsor ? <a href={s.sponsor.url} target="_blank" rel="noopener sponsored" className="inline-flex items-center gap-2 hover:text-marigold"><img src={s.sponsor.logo} alt="" className="h-6 w-6 object-contain bg-cream rounded" />{s.sponsor.name}</a> : <span className="text-cream/50 font-accent">nobody yet</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{s.sponsor ? fmtUsd(s.currentPriceCents) : "—"}</td>
                    <td className="px-4 py-3"><button disabled={closed} onClick={() => pick(s)} className="font-display text-marigold hover:text-pink disabled:opacity-40">{fmtUsd(s.nextPriceCents)} →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* how */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="font-display text-4xl text-marigold mb-6">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["1. Tap, pay, upload", "Pick the hood or the tee. Card checkout, drop your logo and a link. You're on this page before the receipt email lands."],
            ["2. Hold it or lose it", "Anyone can take your slot by paying double. You're refunded in full, automatically, and you can take it back at double again."],
            ["3. Wrap day", `Sale closes, we print, we fit${wrap ? ` on ${wrap}` : ""}. Reveal video, then 30 days on the road with a photo from the driver every day.`],
          ].map(([h, p]) => (
            <div key={h} className="paper rounded-2xl ink-border p-5">
              <h3 className="font-display text-2xl text-indigo">{h}</h3>
              <p className="mt-2 text-ink/80">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* why the hood */}
      <section className="max-w-6xl mx-auto px-4 pb-14 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        <div>
          <h2 className="font-display text-4xl text-marigold">Why the hood is worth {fmtUsd(hood.basePriceCents)}</h2>
          <p className="mt-4 text-cream/85">
            An agency will sell you one auto hood for a few hundred rupees a month, lost in a fleet of fifty.
            This is not that. This is one auto, one brand, and a page, a reveal, and a month of content built around it.
            The hood is the stunt. The impressions are the bonus.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-cream/90">
          {[
            ["8–9 sq ft", "of print, the biggest legal ad surface on an auto"],
            ["270°", "visibility: behind and both sides, exactly where traffic sits"],
            ["8.5–12k", "estimated eyeballs a day, per industry figures for hood ads"],
            ["10 hrs", "on the road, every day, for 30 days"],
            ["1 of 1", "no fleet, no rotation, no other brand on the auto"],
            ["Yours after", "the printed panels ship to you when the month ends"],
          ].map(([n, l]) => (
            <div key={n} className="paper rounded-xl ink-border-soft p-4"><div className="font-display text-2xl text-indigo">{n}</div><div className="text-sm text-ink/80 mt-1">{l}</div></div>
          ))}
        </div>
      </section>

      {/* perks */}
      <section className="bg-marigold text-ink py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-4xl">Every sponsor gets</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[
              "30 days on the road, 10 hours a day",
              "Wrap-day reveal video and a photo set of your slot",
              "One proof photo from the driver every day, posted here",
              "GPS route heatmap at day 15 and day 30",
              "An end-of-month views estimate you can show your team",
              "Logo and link on this page through the whole month",
              "Tagged in the launch post, the reveal, and every weekly update",
              "First refusal on the same slot next month at your closing price",
            ].map((t) => <div key={t} className="flex gap-3 items-start"><span className="font-display">✦</span><span>{t}</span></div>)}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <h2 className="font-display text-4xl text-marigold mb-6">Questions</h2>
        <div className="space-y-3">
          {[
            ["Someone took my slot. Now what?", "They paid double what you did. Your full amount is refunded automatically, usually within minutes. Want it back? Take it at double again."],
            ["Why only the hood and the tee? Where's the back panel?", "Back-panel ads aren't permitted on autos here, and we're not fitting anything the transport authority can pull off. The hood is the approved format, and it's the bigger surface anyway."],
            ["Do I need an account?", "No. Pay, upload, done. Your thank-you page has a link you can bookmark to check on your slot."],
            ["Can I choose the route?", "No. The driver works their normal Bengaluru route. You get the GPS heatmap, so you'll see exactly where the auto went."],
            ["What artwork do you need?", "Just a logo today. After the sale closes you get print templates for the hood (three panels) or the tee front. 300dpi, CMYK. Artwork is due 24 hours after close."],
            ["Anything you won't put on the auto?", "Alcohol, tobacco, gambling, political, adult, or anything the transport authority would reject. If we decline, you're refunded in full."],
            ["What if the auto is off the road?", "Any missed day gets added to the end of the month."],
            ["Can I get an invoice?", "Yes. You get a USD receipt from Dodo Payments at checkout, and an invoice on request."],
          ].map(([q, a]) => (
            <details key={q} className="paper rounded-xl ink-border-soft p-4 group">
              <summary className="font-display text-lg text-indigo cursor-pointer list-none flex justify-between gap-4">{q}<span className="text-pink group-open:rotate-45 transition">+</span></summary>
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

function SlotCard({ s, onBuy, closed, tag }: { s: SlotState; onBuy: () => void; closed: boolean; tag: string }) {
  return (
    <div className="paper rounded-2xl ink-border p-5 flex flex-col">
      <div className="font-accent text-pink text-lg leading-none">{tag}</div>
      <h3 className="font-display text-3xl text-indigo mt-1">{s.name}</h3>
      <ul className="text-sm text-ink/80 mt-3 space-y-1.5 flex-1">
        <li><b>Where:</b> {s.size}</li>
        <li><b>Who sees it:</b> {s.seenBy}</li>
        <li><b>Reach:</b> {s.views}</li>
        <li><b>Extra:</b> {s.perk}</li>
      </ul>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-white ink-border-soft flex items-center justify-center overflow-hidden">
            {s.sponsor ? <img src={s.sponsor.logo} alt="" className="h-full w-full object-contain" /> : <span className="font-accent text-ink/40 text-[10px]">open</span>}
          </div>
          <div className="text-xs text-ink/70 truncate">{s.sponsor ? <>held by <b>{s.sponsor.name}</b><br />at {fmtUsd(s.currentPriceCents)}</> : "nobody's on it yet"}</div>
        </div>
        <button onClick={onBuy} disabled={closed}
          className="font-display text-lg bg-marigold text-ink px-4 py-2 rounded-lg ink-border-soft hover:bg-pink hover:text-cream transition disabled:opacity-60 whitespace-nowrap">
          {s.sponsor ? "Take it" : "Buy"} · {fmtUsd(s.nextPriceCents)}
        </button>
      </div>
    </div>
  );
}
