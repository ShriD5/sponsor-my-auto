"use client";
import { useRef, useState } from "react";
import type { SlotState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";

async function fileToDataUrl(file: File): Promise<string> {
  // Rasterize everything (incl. SVG) to WebP so it works as a 3D texture.
  const img = new Image();
  const objUrl = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Could not read image")); img.src = objUrl; });
  const w = img.naturalWidth || 512, h = img.naturalHeight || 512;
  const max = 640, scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(objUrl);
  let q = 0.9, out = c.toDataURL("image/webp", q);
  while (out.length > 380_000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/webp", q); }
  if (out.length > 400_000) throw new Error("Logo still too big after compression");
  return out;
}

export function SlotModal({ slot, onClose }: { slot: SlotState; onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const takeover = !!slot.sponsor;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!logo) return setErr("Add a logo first.");
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, sponsorName: name, url: url.startsWith("http") ? url : `https://${url}`, logo, email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something broke");
      window.location.href = j.url;
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 p-3" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="paper w-full max-w-lg rounded-2xl ink-border p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-accent text-pink text-lg leading-none">{takeover ? "take over" : "buy now"}</div>
            <h3 className="font-display text-2xl sm:text-3xl text-indigo">{slot.name}</h3>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-indigo">{fmtUsd(slot.nextPriceCents)}</div>
            {takeover && <div className="font-accent text-sm text-ink/70">2x current · {slot.sponsor!.name} gets refunded</div>}
          </div>
        </div>

        <ul className="text-sm text-ink/80 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {slot.lines.map((l) => <li key={l} className="flex gap-2"><span className="text-pink">★</span>{l}</li>)}
        </ul>

        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 items-start">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-xl bg-white ink-border-soft flex items-center justify-center overflow-hidden hover:bg-paper">
            {logo ? <img src={logo} alt="logo preview" className="w-full h-full object-contain p-2" /> : <span className="font-accent text-indigo text-center text-sm px-2">+ upload<br />logo</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setLogo(await fileToDataUrl(f)); setErr(null); } catch (er) { setErr((er as Error).message); } }} />
          <div className="space-y-3">
            <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand / your name"
              className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus:bg-paper" />
            <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yoursite.com"
              className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus:bg-paper" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email, for your refund if someone takes your slot"
              className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus:bg-paper text-sm" />
          </div>
        </div>

        {err && <div className="bg-pink text-cream font-accent px-3 py-2 rounded-lg">{err}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="font-accent text-lg px-4 py-2 rounded-lg text-ink/70 hover:bg-paper">cancel</button>
          <button disabled={busy} className="flex-1 font-display text-xl bg-marigold text-ink rounded-lg py-3 ink-border-soft hover:bg-pink hover:text-cream disabled:opacity-60 transition">
            {busy ? "opening checkout…" : `Pay ${fmtUsd(slot.nextPriceCents)} →`}
          </button>
        </div>
        <p className="text-xs text-ink/60 text-center">No account. Pay and your logo is on the auto instantly. If someone takes your slot for double, you&apos;re refunded automatically. If the auto doesn&apos;t roll on wrap day, everyone is refunded. <a className="underline" href="/refund-policy" target="_blank">Refund policy</a></p>
      </form>
    </div>
  );
}
