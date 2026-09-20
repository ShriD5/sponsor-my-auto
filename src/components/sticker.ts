import type { SlotState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";

/* ------------------------------------------------------------------ */
/* Sticker textures: everything the buyer needs to know is ON the auto  */
/* Shared by the 3D decals and the purchase-modal preview.              */
/* ------------------------------------------------------------------ */

export const INK = "#0f1133", CREAM = "#faf3e0", PINK = "#e63e8b", MARIGOLD = "#f5a524", INDIGO = "#1b1f5c";

/** Physical width/height of each printed panel, from the normalized model (L 2.6, H 1.642, W 1.119). Keep in sync with Auto3D placements. */
export const SLOT_ASPECT: Record<string, number> = {
  "a1-hood": 1.6,
  "a1-side-l": 1.17,
  "a1-side-r": 1.17,
  "a1-visor": 8.67,
  "a1-top": 5.17,
  "site-page": 6,
};

function cssFont(v: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const f = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return f ? `${f}, ${fallback}` : fallback;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img.naturalWidth ? img : null);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/**
 * Decide the panel colour behind a logo so it never disappears.
 * Opaque images: match the panel to the image's own border colour so the box blends in.
 * Transparent images: light artwork (white wordmarks) goes on ink, everything else on white.
 */
function panelFor(img: HTMLImageElement): { bg: string; onDark: boolean } {
  const light = { bg: "#ffffff", onDark: false }, dark = { bg: INK, onDark: true };
  try {
    const n = 48, c = document.createElement("canvas"); c.width = n; c.height = n;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data;
    let opaque = 0, lumSum = 0, borderOpaque = 0, borderLum = 0;
    for (let i = 0; i < n * n; i++) {
      const a = d[i * 4 + 3];
      if (a < 40) continue;
      const lum = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      opaque++; lumSum += lum;
      const x = i % n, y = Math.floor(i / n);
      if (x < 2 || y < 2 || x >= n - 2 || y >= n - 2) { borderOpaque++; borderLum += lum; }
    }
    if (!opaque) return light;
    const border = 4 * (n * 2) - 16; // approx border pixel count
    if (borderOpaque >= border * 0.95) return borderLum / borderOpaque > 0.5 ? light : dark; // solid background: blend
    return lumSum / opaque > 0.62 ? dark : light; // transparent: light art on ink
  } catch { return light; }
}

/** Largest font size (≤ max) at which `text` fits in `maxW`. */
function fitFont(g: CanvasRenderingContext2D, text: string, family: string, max: number, maxW: number, min = 10) {
  let px = max;
  for (; px > min; px -= Math.max(1, Math.round(px * 0.06))) { g.font = `${px}px ${family}`; if (g.measureText(text).width <= maxW) break; }
  g.font = `${px}px ${family}`;
  return px;
}

function drawContain(g: CanvasRenderingContext2D, img: HTMLImageElement, box: { x: number; y: number; w: number; h: number }) {
  const s = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  g.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
}

export type StickerOpts = {
  /** Full-wrap mockups: paint the artwork edge to edge with no card border, footer or price. */
  wrap?: boolean;
};

export async function drawSticker(slot: SlotState, aspect: number, opts: StickerOpts = {}): Promise<HTMLCanvasElement> {
  // 2048 wide so the hood stays crisp when the camera is close; thin strips get the same width, less height
  const W = 2048, H = Math.max(192, Math.round(W / aspect));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;

  if (opts.wrap && slot.sponsor) {
    // artwork is pre-composed at this panel's aspect, so a straight stretch is exact
    const img = await loadImage(slot.sponsor.logo);
    if (img) g.drawImage(img, 0, 0, W, H);
    return c;
  }

  const display = cssFont("--font-titan", "Impact, sans-serif");
  const accent = cssFont("--font-kalam", "cursive");
  try { await document.fonts.ready; } catch {}
  const thin = aspect > 3;
  const pad = Math.round(H * 0.06);

  // base + ink border
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  g.fillStyle = CREAM; g.fillRect(pad, pad, W - pad * 2, H - pad * 2);

  if (slot.sponsor) {
    const img = await loadImage(slot.sponsor.logo);
    const panel = img ? panelFor(img) : { bg: "#ffffff", onDark: false };
    g.fillStyle = panel.bg; g.fillRect(pad, pad, W - pad * 2, H - pad * 2);
    const name = slot.sponsor.name.toUpperCase();
    const take = `take it for ${fmtUsd(slot.nextPriceCents)} →`;
    g.textBaseline = "middle";

    if (thin) {
      // strip: [logo] NAME ............ take it for $X →   (a wide logo is a wordmark: skip the name, give it the room)
      const inner = { x: pad * 2, y: pad * 2, w: W - pad * 4, h: H - pad * 4 };
      const la = img ? img.naturalWidth / img.naturalHeight : 1;
      const wordmark = !!img && la > 2.5;
      let x = inner.x;
      if (img) {
        const lw = Math.min(inner.w * (wordmark ? 0.62 : 0.45), inner.h * la);
        drawContain(g, img, { x, y: inner.y, w: lw, h: inner.h });
        x += lw + pad * 2;
      }
      g.textAlign = "right"; g.fillStyle = PINK;
      fitFont(g, take, accent, Math.round(inner.h * 0.5), inner.w * 0.4);
      const takeW = g.measureText(take).width;
      const nameMax = inner.x + inner.w - x - takeW - pad * 2;
      if (wordmark) {
        g.fillText(take, inner.x + inner.w, H / 2);
      } else if (nameMax > inner.h * 1.5) {
        g.fillText(take, inner.x + inner.w, H / 2);
        g.textAlign = "left"; g.fillStyle = panel.onDark ? CREAM : INDIGO;
        fitFont(g, name, display, Math.round(inner.h * 0.62), nameMax);
        g.fillText(name, x, H / 2 + inner.h * 0.04);
      } else {
        // no room for both: name wins, price is on the card anyway
        g.textAlign = "left"; g.fillStyle = panel.onDark ? CREAM : INDIGO;
        fitFont(g, name, display, Math.round(inner.h * 0.62), inner.x + inner.w - x);
        g.fillText(name, x, H / 2 + inner.h * 0.04);
      }
      return c;
    }

    // panel: logo centred, ink footer with name · paid, take it for $X
    const footer = Math.round(H * 0.16);
    const box = { x: pad * 2, y: pad * 2, w: W - pad * 4, h: H - pad * 4 - footer };
    if (img) drawContain(g, img, box);
    else {
      g.textAlign = "center"; g.fillStyle = INDIGO;
      fitFont(g, name, display, Math.round(box.h * 0.4), box.w * 0.9);
      g.fillText(name, W / 2, box.y + box.h / 2);
    }
    g.fillStyle = INK; g.fillRect(pad, H - pad - footer, W - pad * 2, footer);
    const y = H - pad - footer / 2, avail = W - pad * 6;
    g.font = `${Math.round(footer * 0.44)}px ${accent}`; const rw = g.measureText(take).width;
    const left = `${name} · ${fmtUsd(slot.currentPriceCents)}`;
    g.font = `${Math.round(footer * 0.46)}px ${display}`; const lw = g.measureText(left).width;
    if (lw + rw + pad * 2 <= avail) {
      g.fillStyle = CREAM; g.textAlign = "left"; g.fillText(left, pad * 3, y);
      g.fillStyle = PINK; g.font = `${Math.round(footer * 0.44)}px ${accent}`; g.textAlign = "right"; g.fillText(take, W - pad * 3, y);
    } else {
      g.fillStyle = CREAM; g.textAlign = "left"; fitFont(g, left, display, Math.round(footer * 0.46), avail - rw - pad * 2); g.fillText(left, pad * 3, y);
      g.fillStyle = PINK; g.font = `${Math.round(footer * 0.44)}px ${accent}`; g.textAlign = "right"; g.fillText(take, W - pad * 3, y);
    }
    return c;
  }

  // placeholder: dotted paper
  g.fillStyle = "rgba(27,31,92,.08)";
  for (let x = pad + 6; x < W - pad; x += 14) for (let y = pad + 6; y < H - pad; y += 14) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  g.textAlign = "center"; g.textBaseline = "middle";
  if (thin) {
    g.fillStyle = INDIGO;
    const t = `YOUR LOGO HERE  ·  ${fmtUsd(slot.nextPriceCents)}`;
    fitFont(g, t, display, Math.round(H * 0.58), W - pad * 6);
    g.fillText(t, W / 2, H / 2 + H * 0.03);
  } else {
    // every line is fitted to the sticker width: tall panels (sides) are narrower than the text at the nominal size
    const maxW = W - pad * 6;
    g.fillStyle = PINK; fitFont(g, slot.short.toLowerCase(), accent, Math.round(H * 0.11), maxW);
    g.fillText(slot.short.toLowerCase(), W / 2, H * 0.2);
    g.fillStyle = INDIGO; fitFont(g, "YOUR LOGO", display, Math.round(H * 0.24), maxW);
    g.fillText("YOUR LOGO", W / 2, H * 0.45);
    g.fillText("HERE", W / 2, H * 0.66);
    g.fillStyle = INK; g.fillRect(pad, H - pad - H * 0.16, W - pad * 2, H * 0.16);
    const cta = `${fmtUsd(slot.nextPriceCents)}   ·   tap to take it`;
    g.fillStyle = MARIGOLD; fitFont(g, cta, display, Math.round(H * 0.09), maxW);
    g.fillText(cta, W / 2, H - pad - H * 0.08);
  }
  return c;
}
