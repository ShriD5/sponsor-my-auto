"use client";
import { useEffect } from "react";
import type { ClientEvent, EventKind } from "@/lib/track";

function visitorId() {
  let id = localStorage.getItem("sma_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("sma_id", id); }
  return id;
}

function post(body: Record<string, unknown>) {
  return fetch("/api/presence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
}

/** Funnel step for the admin dashboard: slot modal opened, checkout started. Fire and forget. */
export function track(kind: Exclude<EventKind, "view">, slotId?: string) {
  if (typeof window === "undefined") return;
  const event: ClientEvent = { kind, slotId, path: location.pathname };
  void post({ id: visitorId(), event });
}

/** Anonymous heartbeat so the page can show "N here now" and total visits, plus one `view` event per page load. No cookies, no PII. */
export function usePresence() {
  useEffect(() => {
    const id = visitorId();
    const q = new URLSearchParams(location.search);
    const view: ClientEvent = {
      kind: "view", path: location.pathname, referrer: document.referrer || undefined,
      utm: { source: q.get("utm_source") ?? q.get("ref") ?? undefined, medium: q.get("utm_medium") ?? undefined, campaign: q.get("utm_campaign") ?? undefined },
    };
    void post({ id, view: true, event: view });
    const t = setInterval(() => { if (document.visibilityState === "visible") void post({ id, view: false }); }, 25000);
    return () => clearInterval(t);
  }, []);
}
