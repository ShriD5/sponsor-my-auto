/**
 * Get the auto rickshaw GLB into public/models/auto.glb.
 *
 *  A) With a Sketchfab API token (sketchfab.com/settings/password → "API token"):
 *       SKETCHFAB_TOKEN=xxxx node scripts/fetch-model.mjs <model-uid>
 *  B) With a zip you downloaded manually from Sketchfab (choose glTF format):
 *       node scripts/fetch-model.mjs --zip ~/Downloads/autorikshaw.zip
 *
 * Default uid = "Autorikshaw - Indian Tuk Tuk" by bhagathartworks (CC-BY, 8k faces).
 * Alt uid 0bdfdf97a0f248008806840f7188367c = "Tuk Tuk Rikshaw" (CC-BY, 106k faces, realistic).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

const args = process.argv.slice(2);
const zipIdx = args.indexOf("--zip");
const uid = zipIdx === -1 ? (args[0] || "5775d012693741008acff9dad410e92d") : null;
const tmp = join(os.tmpdir(), "auto-model"); mkdirSync(tmp, { recursive: true });
let zipPath = zipIdx !== -1 ? args[zipIdx + 1] : join(tmp, "model.zip");

if (uid) {
  const token = process.env.SKETCHFAB_TOKEN;
  if (!token) { console.error("SKETCHFAB_TOKEN missing (or use --zip <file>)"); process.exit(1); }
  const r = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, { headers: { Authorization: `Token ${token}` } });
  if (!r.ok) { console.error("download api", r.status, await r.text()); process.exit(1); }
  const j = await r.json();
  const url = j.glb?.url || j.gltf?.url;
  if (!url) { console.error("no glb/gltf in response", Object.keys(j)); process.exit(1); }
  console.log("downloading", j.glb ? "glb" : "gltf", `${((j.glb || j.gltf).size / 1e6).toFixed(1)}MB`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(zipPath, buf);
}

const out = join(tmp, "unz"); execSync(`rm -rf "${out}" && mkdir -p "${out}" && unzip -oq "${zipPath}" -d "${out}"`);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(out);
const glb = files.find((f) => f.endsWith(".glb"));
const gltf = files.find((f) => f.endsWith(".gltf"));
const dest = "public/models/auto.glb";
// gltf-transform: pack to single glb, resize textures, draco-free (widest support), dedup/prune
const src = glb || gltf;
if (!src) { console.error("no glb/gltf found in zip"); process.exit(1); }
execSync(`npx -y @gltf-transform/cli optimize "${src}" "${dest}" --compress false --texture-compress webp --texture-size 1024`, { stdio: "inherit" });
console.log("wrote", dest, `${(statSync(dest).size / 1e6).toFixed(1)}MB`);
console.log("Now: set NEXT_PUBLIC_AUTO_MODEL=1 in .env.local and on Vercel, then node scripts/inspect-model.mjs to tune MODEL_CFG in src/components/Auto3D.tsx");
