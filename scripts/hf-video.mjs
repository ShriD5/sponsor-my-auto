/**
 * Generate the Higgsfield ad with Higgsfield's API (Kling 3.0 Turbo image-to-video), then stitch with ffmpeg.
 *
 *   HF_API_KEY_ID=... HF_API_KEY_SECRET=... node scripts/hf-video.mjs [--dry] [--res 1080p]
 *
 * Reads start frames from ~/Desktop/sponsor-my-auto-launch/higgsfield/auto-*.png (make them with /tmp/pw/hfrender.mjs),
 * uploads each via the presigned-URL flow, submits one image-to-video job per scene, polls with backoff, downloads,
 * then builds ad.mp4 with title cards. --dry prints cost estimates only.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "https://api.higgsfield.ai";
const KEY = `${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}`;
if (!process.env.HF_API_KEY_ID || !process.env.HF_API_KEY_SECRET) { console.error("set HF_API_KEY_ID and HF_API_KEY_SECRET (console.higgsfield.ai → API keys)"); process.exit(1); }
const dry = process.argv.includes("--dry");
const res = process.argv.includes("--res") ? process.argv[process.argv.indexOf("--res") + 1] : "1080p";
const DIR = join(homedir(), "Desktop/sponsor-my-auto-launch/higgsfield");
const OUT = join(DIR, "clips"); mkdirSync(OUT, { recursive: true });
const H = { Authorization: `Key ${KEY}`, "Content-Type": "application/json" };

// Scenes: start frame → where the auto goes. Text on the auto stays readable because the model animates from OUR render.
const NEG = "blurry, distorted text, extra wheels, deformed vehicle, cartoon, low quality, watermark, changing logo, warped letters";
const SCENES = [
  { frame: "auto-rear-quarter.png", duration: 5, name: "01-times-square",
    prompt: "The neon yellow-green wrapped auto rickshaw from the reference image drives slowly forward through Times Square, New York at night. Giant animated billboards tower on all sides and reflect off its glossy canopy. Crowds of pedestrians turn to look and raise phones. Camera tracks alongside at low angle, cinematic 35mm, shallow depth of field, wet asphalt reflections. The rickshaw's printed panels and lettering remain exactly as in the image, sharp and unchanged." },
  { frame: "auto-side.png", duration: 5, name: "02-shibuya",
    prompt: "The same neon yellow-green wrapped auto rickshaw crosses the Shibuya scramble crossing in Tokyo at blue hour, hundreds of pedestrians flowing around it, huge screens glowing above. Steady side-on tracking shot, anamorphic lens flares, cinematic colour grade. Panels and lettering on the rickshaw stay identical to the reference, crisp and legible." },
  { frame: "auto-front.png", duration: 5, name: "03-sf-hq",
    prompt: "The same neon yellow-green wrapped auto rickshaw pulls up and stops outside a glass-and-steel tech headquarters in San Francisco on a foggy morning. Employees with lanyards and coffee stop on the steps and stare. Slow push-in from front, soft overcast light, photoreal, cinematic. The rickshaw's design stays exactly as in the reference image." },
  { frame: "auto-rear.png", duration: 5, name: "04-bengaluru",
    prompt: "The same neon yellow-green wrapped auto rickshaw sits in dense Bengaluru evening traffic, brake lights everywhere, motorbikes weaving past, a yellow-and-green city bus beside it, warm dusty golden-hour haze. Camera holds behind and slightly above, as if from the car behind, then slowly drifts closer to the rear panel. Photoreal, documentary feel. The rickshaw's rear panel lettering stays sharp and identical to the reference." },
];

async function estimate(s) {
  const r = await fetch(`${API}/estimate/kling-video/v3.0-turbo/image-to-video`, { method: "POST", headers: H, body: JSON.stringify({ prompt: s.prompt, image_url: "https://example.com/x.png", duration: s.duration, resolution: res }) });
  return r.ok ? r.json() : { error: await r.text() };
}
async function upload(path) {
  const r = await fetch(`${API}/files/generate-upload-url`, { method: "POST", headers: H, body: JSON.stringify({ content_type: "image/png" }) });
  if (!r.ok) throw new Error("upload-url " + r.status + " " + await r.text());
  const u = await r.json();
  const put = await fetch(u.upload_url, { method: "PUT", headers: u.upload_headers, body: readFileSync(path) });
  if (!put.ok) throw new Error("put " + put.status);
  return u.public_url;
}
async function submit(s, image_url) {
  const r = await fetch(`${API}/kling-video/v3.0-turbo/image-to-video`, { method: "POST", headers: H, body: JSON.stringify({ prompt: s.prompt, negative_prompt: NEG, image_url, duration: s.duration, resolution: res }) });
  if (!r.ok) throw new Error("submit " + r.status + " " + await r.text());
  return r.json();
}
async function poll(status_url) {
  let delay = 2000;
  for (;;) {
    const r = await fetch(status_url, { headers: H }); const j = await r.json();
    if (["completed", "failed", "nsfw", "canceled"].includes(j.status)) return j;
    await new Promise((x) => setTimeout(x, delay + Math.random() * 500)); delay = Math.min(delay * 1.5, 10000);
  }
}

if (dry) {
  let total = 0;
  for (const s of SCENES) { const e = await estimate(s); console.log(s.name, e); total += Number(e.usd || 0); }
  console.log("≈ total USD", total.toFixed(2)); process.exit(0);
}

const results = [];
for (const s of SCENES) {
  const frame = join(DIR, s.frame);
  if (!existsSync(frame)) { console.error("missing", frame); process.exit(1); }
  const url = await upload(frame); console.log("uploaded", s.frame);
  const job = await submit(s, url); console.log("queued", s.name, job.request_id);
  results.push({ s, job });
}
const clips = [];
for (const { s, job } of results) {
  const done = await poll(job.status_url);
  if (done.status !== "completed") { console.error(s.name, done.status, done.error); continue; }
  const out = join(OUT, `${s.name}.mp4`);
  writeFileSync(out, Buffer.from(await (await fetch(done.video.url)).arrayBuffer()));
  console.log("saved", out); clips.push(out);
}
if (clips.length) {
  execSync(`node ${join(process.cwd(), "scripts/hf-stitch.mjs")}`, { stdio: "inherit" });
}
