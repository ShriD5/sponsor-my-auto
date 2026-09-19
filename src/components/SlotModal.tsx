"use client";
import { useEffect, useRef, useState } from "react";
import type { SlotState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";
import { drawSticker, SLOT_ASPECT } from "./sticker";

const MAX_BYTES = 380_000;

/** Exactly what the 3D auto (and the printer) will show for this logo in this slot's shape. */
function StickerPreview({ slot, name, logo }: { slot: SlotState; name: string; logo: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const aspect = SLOT_ASPECT[slot.id] ?? 1.6;
  useEffect(() => {
    let dead = false;
    const t = setTimeout(async () => {
      const preview: SlotState = { ...slot, currentPriceCents: slot.nextPriceCents, nextPriceCents: slot.nextPriceCents * 2, sponsor: { name: name.trim() || "YOUR BRAND", url: "", logo, amountCents: slot.nextPriceCents, since: "" } };
      const c = await drawSticker(preview, aspect);
      const el = ref.current; if (dead || !el) return;
      el.width = c.width; el.height = c.height;
      el.getContext("2d")!.drawImage(c, 0, 0);
    }, 150);
    return () => { dead = true; clearTimeout(t); };
  }, [slot, name, logo, aspect]);
  return (
    <div>
      <div className="font-accent text-sm text-ink/70 mb-1">how it&apos;ll look on <b>{slot.name.toLowerCase()}</b> · panel is {aspect > 3 ? "a thin strip" : aspect > 1.3 ? "landscape" : "nearly square"}</div>
      <canvas ref={ref} className="w-full rounded-md" style={{ aspectRatio: String(aspect) }} />
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw new Error("iPhone HEIC photos aren't supported. Export as PNG or JPG.");
  if (!/^image\//.test(file.type)) throw new Error(`"${file.name}" isn't an image. Use PNG, JPG, WebP, or SVG.`);
  if (file.size > 15_000_000) throw new Error("That file is over 15MB. Please shrink it first.");

  // SVG: make sure it has an intrinsic size, otherwise browsers decode it at 0×0
  let blob: Blob = file;
  if (file.type === "image/svg+xml") {
    let svg = await file.text();
    if (!/\swidth=/.test(svg.slice(0, 2000)) || !/\sheight=/.test(svg.slice(0, 2000))) svg = svg.replace(/<svg([^>]*)>/i, '<svg$1 width="1024" height="1024">');
    blob = new Blob([svg], { type: "image/svg+xml" });
  }
  const img = new Image();
  const objUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error(`Couldn't read "${file.name}". Try a PNG or JPG.`)); img.src = objUrl; });
    let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
    let max = 1400; // hood sticker is 2048px wide; the size loop below shrinks further if the byte cap is hit
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, max / Math.max(w, h));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
      const g = c.getContext("2d")!; g.drawImage(img, 0, 0, c.width, c.height);
      // WebP where supported (Chrome/Firefox); Safari ignores the type and returns PNG, so we also shrink dimensions
      let out = c.toDataURL("image/webp", 0.9);
      if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/png");
      if (out.length <= MAX_BYTES) return out;
      // last resort: JPEG (no transparency) before shrinking further
      const jpg = c.toDataURL("image/jpeg", 0.85);
      if (jpg.length <= MAX_BYTES && attempt >= 3) return jpg;
      max = Math.round(max * 0.75);
    }
    throw new Error("Couldn't get that logo under 380KB. Try a simpler PNG.");
  } finally { URL.revokeObjectURL(objUrl); }
}

export function SlotModal({ slot, onClose }: { slot: SlotState; onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const takeover = !!slot.sponsor;

  // Escape closes, first field gets focus, page behind doesn't scroll, focus goes back where it came from
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { const u = new URL(url.startsWith("http") ? url : `https://${url}`); if (!/\./.test(u.hostname)) throw 0; } catch { return setErr("That link doesn't look right. Try yoursite.com."); }
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
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="slot-title"
        className="paper w-full max-w-lg rounded-2xl ink-border p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-accent text-pink text-lg leading-none">{takeover ? "take over" : "buy now"}</div>
            <h3 id="slot-title" className="font-display text-2xl sm:text-3xl text-indigo">{slot.name}</h3>
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
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={logo ? "Change logo" : "Upload logo"}
            className={`aspect-square rounded-xl ink-border-soft flex items-center justify-center overflow-hidden focus-visible:ring-2 focus-visible:ring-pink ${logo ? "checker" : "bg-white hover:bg-paper"}`}>
            {logo ? <img src={logo} alt="logo preview" className="w-full h-full object-contain p-2" /> : <span className="font-accent text-indigo text-center text-sm px-2">+ upload<br />logo</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setLogo(await fileToDataUrl(f)); setErr(null); } catch (er) { setErr((er as Error).message); } }} />
          <div className="space-y-3">
            <input ref={nameRef} required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand / your name" aria-label="Brand or your name"
              className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus:bg-paper focus-visible:ring-2 focus-visible:ring-pink" />
            <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yoursite.com" aria-label="Website URL" inputMode="url" autoComplete="url"
              className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus:bg-paper focus-visible:ring-2 focus-visible:ring-pink" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email, for your refund if someone takes your slot" aria-label="Email, for your refund if someone takes your slot" autoComplete="email"
              className="w-full rounded-lg bg-white px-3 py-2 ink-border-soft outline-none focus:bg-paper focus-visible:ring-2 focus-visible:ring-pink text-sm" />
          </div>
        </div>

        {logo && slot.autoId === "a1" && <StickerPreview slot={slot} name={name} logo={logo} />}

        {err && <div role="alert" className="bg-pink text-cream font-accent px-3 py-2 rounded-lg">{err}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="font-accent text-lg px-4 py-2 rounded-lg text-ink/70 hover:bg-paper focus-visible:ring-2 focus-visible:ring-pink">cancel</button>
          <button disabled={busy} aria-busy={busy} className="flex-1 font-display text-xl bg-marigold text-ink rounded-lg py-3 ink-border-soft hover:bg-pink hover:text-cream disabled:opacity-60 transition focus-visible:ring-2 focus-visible:ring-pink">
            {busy ? "opening checkout…" : `Pay ${fmtUsd(slot.nextPriceCents)} →`}
          </button>
        </div>
        <p className="text-xs text-ink/60 text-center">Prices in USD; sales tax / GST is added at checkout where your country requires it. No account. Pay and your logo is on the auto instantly. If someone takes your slot for double, you&apos;re refunded in full, automatically. If the campaign is called off before the wrap, everyone is refunded in full. <a className="underline" href="/refund-policy" target="_blank">Refund policy</a></p>
      </form>
    </div>
  );
}
