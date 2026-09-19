"use client";
import { useCallback, useEffect, useState } from "react";
import { fmtUsd } from "@/lib/slots";

type Top = { k: string | null; n: number; u: number };
type Stats = {
  at: string;
  totals: { views: number; uniques: number; first: string | null; today: { views: number; uniques: number }; live: number };
  hourly: { h: string; n: number; u: number }[];
  daily: { d: string; n: number; u: number }[];
  referrers: Top[]; utm: Top[]; countries: Top[]; cities: Top[]; devices: Top[]; browsers: Top[]; os: Top[];
  funnel: { views: { n: number; u: number }; modal: { n: number; u: number }; checkout: { n: number; u: number }; paid: number };
  slots: { id: string; name: string; modal: number; checkout: number; paid: number; cents: number }[];
  purchases: { id: string; slot_id: string; sponsor_name: string; url: string; email: string | null; amount_cents: number; status: string; hidden: boolean; is_mock: boolean; refund_id: string | null; created_at: string; paid_at: string | null }[];
  pendingRefunds: number;
};

const KEY = "sma_admin";
const countryName = (() => { try { const dn = new Intl.DisplayNames(["en"], { type: "region" }); return (c: string) => (/^[A-Z]{2}$/.test(c) ? dn.of(c) ?? c : c); } catch { return (c: string) => c; } })();
const flag = (c: string) => /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : "";
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "–");
const ago = (iso: string) => { const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); return s < 90 ? `${Math.round(s)}s ago` : s < 5400 ? `${Math.round(s / 60)}m ago` : s < 129600 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`; };

export default function Admin() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem(KEY) ?? ""); }, []);

  const load = useCallback(async (t: string) => {
    if (!t) return;
    try {
      const r = await fetch("/api/admin/stats", { headers: { "x-admin-token": t }, cache: "no-store" });
      if (r.status === 401) { setErr("wrong token"); localStorage.removeItem(KEY); setToken(""); return; }
      if (!r.ok) throw new Error(`stats ${r.status}`);
      setS(await r.json()); setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, []);

  useEffect(() => {
    if (!token) return;
    load(token);
    const t = setInterval(() => { if (document.visibilityState === "visible") load(token); }, 30000);
    return () => clearInterval(t);
  }, [token, load]);

  const hide = async (id: string, hidden: boolean) => {
    await fetch("/api/admin/hide", { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify({ purchaseId: id, hidden }) });
    load(token);
  };

  if (!token) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <form className="paper rounded-2xl ink-border p-7 max-w-sm w-full space-y-3" onSubmit={(e) => { e.preventDefault(); localStorage.setItem(KEY, input.trim()); setToken(input.trim()); }}>
          <h1 className="font-display text-2xl text-indigo">Admin</h1>
          <input value={input} onChange={(e) => setInput(e.target.value)} type="password" placeholder="ADMIN_TOKEN" aria-label="Admin token" autoFocus
            className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus-visible:ring-2 focus-visible:ring-pink" />
          {err && <div role="alert" className="text-pink font-accent">{err}</div>}
          <button className="w-full font-display text-lg bg-marigold text-ink rounded-lg py-2 ink-border-soft">Open</button>
        </form>
      </main>
    );
  }

  if (!s) return <main className="flex-1 flex items-center justify-center font-accent text-cream text-xl">{err ?? "loading…"}</main>;

  const maxH = Math.max(1, ...s.hourly.map((x) => x.n));
  const maxD = Math.max(1, ...s.daily.map((x) => x.n));
  const hours = Array.from({ length: 48 }, (_, i) => { const d = new Date(Date.now() - (47 - i) * 3600_000); d.setUTCMinutes(0, 0, 0); const k = d.toISOString().slice(0, 13) + ":00:00Z"; return s.hourly.find((x) => x.h === k) ?? { h: k, n: 0, u: 0 }; });
  const days = Array.from({ length: 30 }, (_, i) => { const k = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10); return s.daily.find((x) => x.d === k) ?? { d: k, n: 0, u: 0 }; });

  return (
    <main className="flex-1 max-w-6xl mx-auto px-5 py-8 w-full text-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-marigold">Sponsor My Auto · admin</h1>
        <div className="font-accent text-cream/60">updated {ago(s.at)} · refreshes every 30s · <button className="underline" onClick={() => { localStorage.removeItem(KEY); setToken(""); }}>sign out</button></div>
      </div>

      {s.pendingRefunds > 0 && <div className="mt-4 bg-pink text-cream rounded-lg px-4 py-2 font-accent">{s.pendingRefunds} refund{s.pendingRefunds > 1 ? "s" : ""} waiting on Dodo wallet balance. Top up the wallet; the sweep retries after every payment and daily at 09:00 IST.</div>}

      {/* headline tiles */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          [String(s.totals.live), "here now"],
          [s.totals.today.views.toLocaleString("en-US"), "views · 24h"],
          [s.totals.today.uniques.toLocaleString("en-US"), "people · 24h"],
          [s.totals.views.toLocaleString("en-US"), "views · all"],
          [s.totals.uniques.toLocaleString("en-US"), "people · all"],
          [fmtUsd(s.slots.reduce((a, x) => a + x.cents, 0)), "collected · all"],
        ].map(([n, l]) => (
          <div key={l} className="paper rounded-xl ink-border-soft px-4 py-3"><div className="font-display text-3xl text-indigo leading-none">{n}</div><div className="font-accent text-ink/60 mt-1">{l}</div></div>
        ))}
      </div>

      {/* funnel */}
      <Section title="Funnel (people, not hits)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["visited", s.funnel.views.u, s.funnel.views.u],
            ["opened a slot", s.funnel.modal.u, s.funnel.views.u],
            ["started checkout", s.funnel.checkout.u, s.funnel.modal.u],
            ["paid", s.funnel.paid, s.funnel.checkout.u],
          ].map(([l, n, base]) => (
            <div key={l as string} className="paper rounded-xl ink-border-soft px-4 py-3"><div className="font-display text-3xl text-indigo leading-none">{n as number}</div><div className="font-accent text-ink/60 mt-1">{l as string} · {pct(n as number, base as number)}</div></div>
          ))}
        </div>
        <table className="mt-4 w-full text-sm">
          <thead><tr className="font-accent text-cream/60 text-left"><th className="py-1">slot</th><th>opened</th><th>checkout</th><th>paid</th><th>collected</th></tr></thead>
          <tbody>{s.slots.map((x) => <tr key={x.id} className="border-t border-cream/10"><td className="py-1.5 font-display">{x.name}</td><td>{x.modal}</td><td>{x.checkout}</td><td>{x.paid}</td><td>{fmtUsd(x.cents)}</td></tr>)}</tbody>
        </table>
      </Section>

      {/* charts */}
      <Section title="Views per hour · last 48h (UTC)">
        <Bars data={hours.map((x) => ({ k: x.h.slice(11, 13), n: x.n, u: x.u, title: `${x.h.slice(5, 16).replace("T", " ")} UTC` }))} max={maxH} />
      </Section>
      <Section title="Views per day · last 30 days">
        <Bars data={days.map((x) => ({ k: x.d.slice(8), n: x.n, u: x.u, title: x.d }))} max={maxD} wide />
      </Section>

      {/* breakdowns */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        <TopList title="Referrers" rows={s.referrers} />
        <TopList title="UTM / ?ref sources" rows={s.utm} />
        <TopList title="Countries" rows={s.countries} fmt={(k) => `${flag(k)} ${countryName(k)}`} />
        <TopList title="Cities" rows={s.cities} />
        <TopList title="Devices" rows={s.devices} />
        <TopList title="Browsers" rows={s.browsers} />
        <TopList title="OS" rows={s.os} />
      </div>

      {/* purchases */}
      <Section title="Purchases (latest 30)">
        {s.purchases.length === 0 ? <p className="font-accent text-cream/60">none yet</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap">
            <thead><tr className="font-accent text-cream/60 text-left"><th className="py-1">when</th><th>slot</th><th>sponsor</th><th>email</th><th>amount</th><th>status</th><th>refund</th><th></th></tr></thead>
            <tbody>{s.purchases.map((p) => (
              <tr key={p.id} className="border-t border-cream/10">
                <td className="py-1.5">{ago(p.paid_at ?? p.created_at)}</td>
                <td>{p.slot_id}</td>
                <td><a className="underline decoration-marigold" href={p.url} target="_blank" rel="noopener nofollow">{p.sponsor_name}</a>{p.is_mock && <span className="ml-1 text-pink">mock</span>}</td>
                <td className="text-cream/70">{p.email}</td>
                <td>{fmtUsd(p.amount_cents)}</td>
                <td className={p.status === "paid" ? "text-teal" : "text-cream/70"}>{p.status}{p.hidden && <span className="ml-1 text-pink">hidden</span>}</td>
                <td className="text-cream/60">{p.refund_id ? "✓" : p.status === "superseded" || p.status === "failed" ? "pending" : ""}</td>
                <td className="text-right">{p.status === "paid" && <button className="underline" onClick={() => hide(p.id, !p.hidden)}>{p.hidden ? "unhide" : "hide logo"}</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Section>
      <p className="mt-8 text-xs text-cream/40 font-accent">Bots (link previews, crawlers) are excluded from traffic numbers. Geo is from Vercel headers at city level; no IPs are stored. Data since {s.totals.first ? new Date(s.totals.first).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "–"} IST.</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h2 className="font-display text-xl text-marigold mb-3">{title}</h2>{children}</section>;
}

function Bars({ data, max, wide }: { data: { k: string; n: number; u: number; title: string }[]; max: number; wide?: boolean }) {
  return (
    <div className="paper rounded-xl ink-border-soft p-3">
      <div className="flex items-end gap-px h-32">
        {data.map((x, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end h-full group relative" title={`${x.title}: ${x.n} views, ${x.u} people`}>
            <div className="bg-indigo/30 rounded-t" style={{ height: `${(x.n / max) * 100}%` }}><div className="bg-indigo rounded-t w-full" style={{ height: `${x.n ? (x.u / x.n) * 100 : 0}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="flex gap-px mt-1 font-accent text-ink/50 text-[10px]">
        {data.map((x, i) => <div key={i} className="flex-1 text-center truncate">{wide || i % 6 === 0 ? x.k : ""}</div>)}
      </div>
      <div className="font-accent text-ink/50 text-xs mt-1">dark = people, light = repeat views</div>
    </div>
  );
}

function TopList({ title, rows, fmt }: { title: string; rows: Top[]; fmt?: (k: string) => string }) {
  const total = rows.reduce((a, r) => a + r.n, 0);
  return (
    <div className="paper rounded-xl ink-border-soft p-4">
      <h3 className="font-display text-lg text-indigo">{title}</h3>
      {rows.length === 0 ? <p className="font-accent text-ink/50 mt-2">nothing yet</p> : (
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          {rows.map((r) => {
            const k = r.k ?? "?";
            return (
              <li key={k} className="relative">
                <div className="absolute inset-y-0 left-0 bg-marigold/25 rounded" style={{ width: `${(r.n / Math.max(1, total)) * 100}%` }} />
                <div className="relative flex justify-between gap-2 px-1.5 py-0.5"><span className="truncate">{fmt ? fmt(k) : k}</span><span className="font-accent text-ink/70 shrink-0">{r.u} · {r.n}</span></div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="font-accent text-ink/40 text-xs mt-2">people · views</div>
    </div>
  );
}
