/** Stitch clips + title cards into the ad. Runs after hf-video.mjs, or alone on existing clips. */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const DIR = join(homedir(), "Desktop/sponsor-my-auto-launch/higgsfield"), CLIPS = join(DIR, "clips");
const clips = readdirSync(CLIPS).filter((f) => f.endsWith(".mp4") && /^\d\d-/.test(f)).sort().map((f) => join(CLIPS, f));
if (!clips.length) { console.error("no clips"); process.exit(1); }
const NEON = "0xD1FE17", INK = "0x0a0a12";
const FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
const card = (file, lines, secs, bg = INK, fg = "white") => {
  const draw = lines.map((t, i) => `drawtext=fontfile='${FONT}':text='${t.replace(/'/g, "\\\\'").replace(/:/g, "\\:")}':fontcolor=${fg}:fontsize=${i === 0 ? 96 : 56}:x=(w-text_w)/2:y=(h/2)+${(i - (lines.length - 1) / 2) * 120 - 40}`).join(",");
  execSync(`ffmpeg -y -v error -f lavfi -i color=c=${bg}:s=1920x1080:d=${secs}:r=30 -vf "${draw},format=yuv420p" -c:v libx264 -preset fast -crf 18 "${file}"`);
};
// cards: cost comparisons between scenes, then the payoff
card(join(CLIPS, "c0.mp4"), ["Times Square", "$7,000,000 for 30 seconds"], 1.8);
card(join(CLIPS, "c1.mp4"), ["Shibuya Crossing", "$1,200,000 a month"], 1.8);
card(join(CLIPS, "c2.mp4"), ["A booth at any tech conference", "five figures, two days"], 1.8);
card(join(CLIPS, "c3.mp4"), ["One auto. Bengaluru traffic. 30 days.", "$5,850 for the whole thing"], 2.4, NEON, "black");
card(join(CLIPS, "c4.mp4"), ["This can be real.", "sponsormyauto.lol"], 2.6, NEON, "black");
const order = [clips[0], "c0", clips[1], "c1", clips[2], "c2", clips[3], "c3", "c4"].map((x) => (x.endsWith(".mp4") ? x : join(CLIPS, x + ".mp4")));
const norm = order.map((f, i) => { const o = join(CLIPS, `n${i}.mp4`); execSync(`ffmpeg -y -v error -i "${f}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" -an -c:v libx264 -preset fast -crf 18 "${o}"`); return o; });
import { writeFileSync } from "node:fs";
const list = join(CLIPS, "list.txt"); writeFileSync(list, norm.map((f) => `file '${f}'`).join("\n"));
execSync(`ffmpeg -y -v error -f concat -safe 0 -i "${list}" -c copy "${join(DIR, "higgsfield-ad-16x9.mp4")}"`);
execSync(`ffmpeg -y -v error -i "${join(DIR, "higgsfield-ad-16x9.mp4")}" -vf "crop=1080:1080:420:0" -c:v libx264 -preset fast -crf 18 "${join(DIR, "higgsfield-ad-1x1.mp4")}"`);
console.log("wrote", join(DIR, "higgsfield-ad-16x9.mp4"), "and 1x1");
