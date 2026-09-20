/**
 * One-time Dodo setup. Needs DODO_PAYMENTS_API_KEY (+ DODO_PAYMENTS_ENVIRONMENT) in env.
 *   npx tsx --env-file=.env.local scripts/dodo-setup.ts https://sponsormyauto.lol
 * Creates a pay-what-you-want product (min $1) used for every slot with a per-checkout amount,
 * and a webhook for payment.succeeded, payment.failed, and refund.succeeded.
 * Prints IDs; the webhook secret is written to .dodo-secret (gitignored).
 */
import DodoPayments from "dodopayments";
import { writeFileSync } from "node:fs";

const WEBHOOK_EVENTS = ["payment.succeeded", "payment.failed", "refund.succeeded"] as const;

const host = process.argv[2];
const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") || "live_mode",
});

async function main() {
  if (!process.env.DODO_PAYMENTS_API_KEY) throw new Error("DODO_PAYMENTS_API_KEY missing");
  let productId = process.env.DODO_PRODUCT_ID;
  if (!productId) {
    const product = await client.products.create({
      name: "Sponsor My Auto — slot",
      description: "One ad slot on a Bengaluru auto rickshaw for 30 days (hood, driver tee, or site banner). Amount set per slot at checkout.",
      tax_category: "digital_products",
      price: { type: "one_time_price", currency: "USD", price: 100, pay_what_you_want: true, suggested_price: 200000 },
    });
    productId = product.product_id;
    console.log("DODO_PRODUCT_ID=" + productId);
  } else console.log("product exists:", productId);

  if (host) {
    const url = `${host.replace(/\/$/, "")}/api/webhooks/dodo`;
    let found: { id: string; url: string } | undefined;
    for await (const w of client.webhooks.list()) {
      if (w.url === url) {
        found = w;
        break;
      }
    }
    const filter_types = [...WEBHOOK_EVENTS];
    const wh = found
      ? await client.webhooks.update(found.id, { filter_types })
      : await client.webhooks.create({ url, filter_types });
    const secret = await client.webhooks.retrieveSecret(wh.id);
    writeFileSync(".dodo-secret", secret.secret + "\n", { mode: 0o600 });
    console.log("webhook:", wh.id, url);
    console.log("secret written to .dodo-secret (not printed)");
  } else console.log("no host given; skipped webhook");
}
main().catch((e) => { console.error(e); process.exit(1); });
