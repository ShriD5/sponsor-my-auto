"use client";
import { useEffect } from "react";

/** Anonymous heartbeat so the page can show "N here now" and total visits. No cookies, no PII. */
export function usePresence() {
  useEffect(() => {
    let id = localStorage.getItem("sma_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("sma_id", id); }
    const beat = (view: boolean) => fetch("/api/presence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, view }), keepalive: true }).catch(() => {});
    beat(true);
    const t = setInterval(() => { if (document.visibilityState === "visible") beat(false); }, 25000);
    return () => clearInterval(t);
  }, []);
}
