/**
 * Render someone's logo on the auto for a reply. Usage:
 *   node scripts/mockup.mjs ./logo.png "Brand Name" [slot] [out.png]
 * slot: a1-hood (default) | a1-side-l | a1-side-r | a1-visor | a1-top
 * Needs the prod build running locally: `npx next build && npx next start -p 3111` (or set BASE=https://sponsormyauto.lol, but then
 * the logo must be reachable at /mockups/ on that host, so local is the practical path).
 */
import { chromium } from "playwright";
import { copyFileSync, mkdirSync } from "node:fs";
import { basename, extname, resolve } from "node:path";

const [logo, brand = "Your brand", slot = "a1-hood", out] = process.argv.slice(2);
if (!logo) { console.error("usage: node scripts/mockup.mjs ./logo.png \"Brand\" [slot] [out.png]"); process.exit(1); }
const base = process.env.BASE || "http://localhost:3111";
const name = `${Date.now()}${extname(logo) || ".png"}`;
mkdirSync("public/mockups", { recursive: true });
copyFileSync(logo, `public/mockups/${name}`);
// camera per slot: where the sticker reads best
const cam = { "a1-hood": "rear", "a1-side-l": "side", "a1-side-r": "side2", "a1-visor": "front", "a1-top": "top" }[slot] || "rear";
const url = `${base}/film?mock=/mockups/${name}&brand=${encodeURIComponent(brand)}&slot=${slot}&cam=${cam}`;
const b = await chromium.launch({ channel: "chromium" });
const p = await b.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: "load" }); await p.waitForTimeout(6000);
const file = out || resolve(process.env.HOME, "Desktop/sponsor-my-auto-launch", `mockup-${brand.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${slot}.png`);
await p.screenshot({ path: file });
await b.close();
console.log("wrote", file, "\nurl:", url);
