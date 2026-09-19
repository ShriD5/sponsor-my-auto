import { Resend } from "resend";
import { fmtUsd } from "./slots";

/** No-op unless RESEND_API_KEY + EMAIL_FROM are set. Never throws into the payment path. */
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from || !to) return;
  try {
    await new Resend(key).emails.send({
      from, to, subject, html,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    });
  } catch (e) { console.error("email failed", e); }
}

const origin = () => process.env.NEXT_PUBLIC_APP_URL || "https://sponsormyauto.lol";
const wrap = (body: string) => `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f1133"><h1 style="font-size:22px;margin:0 0 12px">Sponsor My Auto</h1>${body}<p style="color:#666;font-size:12px;margin-top:28px">Questions? Reply to this email.</p></div>`;

export async function emailLive(p: { email: string | null; sponsorName: string; amountCents: number; id: string }, slotName: string) {
  if (!p.email) return;
  await send(p.email, `You're on the auto: ${slotName}`, wrap(`
    <p>Hi ${p.sponsorName}, your logo is live on <b>${slotName}</b> at <b>${fmtUsd(p.amountCents)}</b>.</p>
    <p>Bookmark your slot page: <a href="${origin()}/thanks?p=${p.id}">${origin()}/thanks?p=${p.id}</a></p>
    <p>Anyone can take the slot by paying double. If that happens you get a full refund automatically and we'll email you. You can take it back at double again.</p>
    <p>After the sale closes we'll send print templates. Artwork is due within 24 hours of close.</p>`));
}

export async function emailOutbid(prev: { email: string | null; sponsorName: string; amountCents: number }, slotName: string, newAmountCents: number) {
  if (!prev.email) return;
  await send(prev.email, `Someone took ${slotName} from you`, wrap(`
    <p>Hi ${prev.sponsorName}, <b>${slotName}</b> was just taken for <b>${fmtUsd(newAmountCents)}</b>.</p>
    <p>Your <b>${fmtUsd(prev.amountCents)}</b> is being refunded in full to your original payment method. It's initiated automatically and usually lands within 3–7 business days depending on your bank. Reply to this email if it hasn't.</p>
    <p>Want it back? Take it for <b>${fmtUsd(newAmountCents * 2)}</b>: <a href="${origin()}">${origin()}</a></p>`));
}
