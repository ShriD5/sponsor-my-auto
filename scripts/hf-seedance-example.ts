/**
 * Higgsfield API smoke test: Seedance 2.5 text-to-video via the official SDK.
 *   npx tsx --env-file=.env.local scripts/hf-seedance-example.ts
 * Requires HF_CREDENTIALS="key-id:key-secret" in .env.local (git-ignored). The value is never printed.
 * This makes a billable request.
 */
import { config, higgsfield, type V2Response } from "@higgsfield/client/v2";

if (!process.env.HF_CREDENTIALS || !process.env.HF_CREDENTIALS.includes(":")) {
  console.error("HF_CREDENTIALS missing or malformed (expected key-id:key-secret in .env.local)");
  process.exit(1);
}
config({ credentials: process.env.HF_CREDENTIALS });

const MODEL = "bytedance/seedance-2.5/text-to-video";
const input = { prompt: "A cinematic scene at sunset", duration: 5, resolution: "720p", aspect_ratio: "16:9", output_format: "mp4", generate_audio: true };

async function main() {
  console.log(`submitting ${MODEL} …`);
  const started = Date.now();
  const result = (await higgsfield.subscribe(MODEL, { input, withPolling: true })) as V2Response;
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  switch (result.status) {
    case "completed":
      if (!result.video?.url) { console.error(`completed after ${secs}s but no video url in response`, JSON.stringify(result)); process.exit(1); }
      console.log(`completed in ${secs}s`);
      console.log("request_id:", result.request_id);
      console.log("video url:", result.video.url);
      return;
    case "failed":
      console.error(`FAILED after ${secs}s (request ${result.request_id}). Not charged.`, JSON.stringify(result)); process.exit(2);
    case "nsfw":
      console.error(`MODERATED (nsfw) after ${secs}s (request ${result.request_id}). Not charged.`); process.exit(3);
    default:
      // includes any 'canceled' or non-terminal state the SDK might surface
      console.error(`ended in state "${result.status}" after ${secs}s (request ${result.request_id})`, JSON.stringify(result)); process.exit(4);
  }
}
main().catch((e) => { console.error("request error:", e instanceof Error ? e.message : e); process.exit(1); });
