import type { NextRequest } from "next/server";

export type EventKind = "view" | "modal" | "checkout";
export const EVENT_KINDS: EventKind[] = ["view", "modal", "checkout"];

export type ClientEvent = {
  kind: EventKind;
  path?: string;
  slotId?: string;
  referrer?: string;   // full document.referrer; reduced to a host here
  utm?: { source?: string; medium?: string; campaign?: string };
};

const clip = (s: unknown, n = 80) => (typeof s === "string" && s ? s.slice(0, n) : null);

/** "https://t.co/abc?x=1" -> "t.co"; same-origin or garbage -> null */
export function referrerHost(ref: string | undefined, selfHost: string): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h && h !== selfHost.replace(/^www\./, "") ? h.slice(0, 80) : null;
  } catch { return null; }
}

/** Coarse device/browser/OS from the UA. Enough to answer "is this traffic phones from the X app?" */
export function parseUa(ua: string) {
  const device = /iPad|Tablet|PlayBook|Silk/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const browser =
    /Twitter|X-Client/i.test(ua) ? "X app" :
    /Instagram/i.test(ua) ? "Instagram app" :
    /LinkedInApp/i.test(ua) ? "LinkedIn app" :
    /FBAN|FBAV|FB_IAB/i.test(ua) ? "Facebook app" :
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /SamsungBrowser/.test(ua) ? "Samsung" :
    /Chrome|CriOS/.test(ua) ? "Chrome" :
    /Firefox|FxiOS/.test(ua) ? "Firefox" :
    /Safari/.test(ua) ? "Safari" :
    /bot|crawl|spider|preview|facebookexternalhit|Slack|Discord|WhatsApp|Telegram/i.test(ua) ? "bot" : "other";
  const os =
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Windows/.test(ua) ? "Windows" :
    /CrOS/.test(ua) ? "ChromeOS" :
    /Linux/.test(ua) ? "Linux" : "other";
  return { device, browser, os };
}

/** Vercel sets these on every request at the edge; absent locally. */
export function geoFrom(req: NextRequest) {
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
  return {
    country: clip(req.headers.get("x-vercel-ip-country"), 2),
    region: clip(dec(req.headers.get("x-vercel-ip-country-region")), 64),
    city: clip(dec(req.headers.get("x-vercel-ip-city")), 64),
  };
}

/** Build the DB row for an event, or null if it's malformed. */
export function eventRow(req: NextRequest, visitorId: string, ev: ClientEvent) {
  if (!EVENT_KINDS.includes(ev.kind)) return null;
  const selfHost = req.nextUrl.hostname;
  const ua = parseUa(req.headers.get("user-agent") ?? "");
  return {
    visitorId, kind: ev.kind,
    path: clip(ev.path, 120),
    slotId: clip(ev.slotId, 40),
    referrer: referrerHost(ev.referrer, selfHost),
    utmSource: clip(ev.utm?.source, 60), utmMedium: clip(ev.utm?.medium, 60), utmCampaign: clip(ev.utm?.campaign, 60),
    ...geoFrom(req), ...ua,
  };
}
