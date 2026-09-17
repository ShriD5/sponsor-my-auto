"use client";
import { useEffect, useState } from "react";

export function Countdown({ endsAt }: { endsAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!endsAt || now === null) return <div className="h-[92px]" />;
  const diff = Math.max(0, Date.parse(endsAt) - now);
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const cells = [[pad(d), "days"], [pad(h), "hrs"], [pad(m), "min"], [pad(s), "sec"]];
  return (
    <div className="inline-flex items-end gap-2">
      {cells.map(([v, l]) => (
        <div key={l} className="flex flex-col items-center">
          <div className="bg-ink text-marigold font-display text-3xl sm:text-5xl px-3 py-1 rounded-md ink-border-soft tabular-nums">{v}</div>
          <div className="font-accent text-cream/80 text-sm mt-2">{l}</div>
        </div>
      ))}
    </div>
  );
}
