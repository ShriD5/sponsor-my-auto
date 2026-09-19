# Sponsor My Auto

One auto-rickshaw, 30 days, 6 slots: The Hood ($3,500), Left Side ($800), Right Side ($800), The Visor ($750), The Roofline ($500), The Page ($500). No login: pay → upload logo → live instantly. Any slot can be taken over for 2x; the previous sponsor is auto-refunded. No back panel (not permitted on autos locally).

- Prod: https://sponsormyauto.lol
- Stack: Next.js 16, Neon Postgres (drizzle), Dodo Payments (pay-what-you-want product + per-checkout amount), Vercel.

## Flow
1. `POST /api/checkout` creates a pending `purchases` row and a Dodo checkout session with `metadata.purchase_id`.
2. Dodo redirects to `/thanks?p=<id>&payment_id=…`. The thanks page polls `/api/purchases/<id>`, which verifies the payment with Dodo directly and settles, so the sponsor is live before the webhook even arrives.
3. `POST /api/webhooks/dodo` (`payment.succeeded`, Standard Webhooks signature, idempotent) settles too.
4. Settle = mark paid, set slot active + price, supersede previous holder and `refunds.create` on their payment.

## 3D stickers
`src/components/Auto3D.tsx` raycasts each slot onto the GLB and projects a drei `Decal` at the hit, with a backing panel a hair outside the skin so window glass and open sides read as covered fabric. Price and name are baked into the sticker texture; no floating tags. `?cam=rear|front|side|side2|top` freezes the turntable, `&dbg=1` logs ray hits.

## Ops
- Live traffic: clients heartbeat `/api/presence`; `/api/state` returns `live`, `visits`, `takeovers`.
- Moderation: `GET /api/admin/hide` lists paid purchases, `POST /api/admin/hide {purchaseId, hidden}` hides a logo (header `x-admin-token: $ADMIN_TOKEN`). Hidden sponsors keep their slot price but disappear from the site.
- Abuse: max 5 pending checkouts per IP per 10 min; pending rows older than 24h are pruned.
- OG image is dynamic (`/opengraph-image`): raised, slots taken, holder logos.

## Local
`MOCK_PAY=1` in `.env.local` skips Dodo and settles instantly. `npm run dev`.

## Go live with Dodo
1. Put `DODO_PAYMENTS_API_KEY` in `.env.local`.
2. `npm run dodo:setup https://sponsormyauto.lol` → copy `DODO_PRODUCT_ID` into `.env.local`.
3. `./scripts/go-live.sh` (pushes Dodo env to Vercel, sets `MOCK_PAY=0`, redeploys).

Edit `SALE_ENDS_AT`, `WRAP_DAY`, prices/copy in `src/lib/slots.ts`, and the X handle in `src/components/Board.tsx` footer. Slot price/name edits sync to the DB automatically for unsold slots.

## Launch thread (draft)

Brand stays "Sponsor My Auto" (genre convention: Sponsor My Body / dress / tuxedo). "Tuk tuk" is used once, early, for non-Indian readers. Lead with Bengaluru, not the vehicle.

**1 / hook** (attach: screen recording of the 3D auto spinning, then cut to a real photo of the actual auto if you have it)
> I'm selling a tuk tuk.
> For 30 days, a Bengaluru auto-rickshaw drives around the city with your startup's logo on it.
> 6 slots. Anyone can take yours by paying double — and you get every dollar back, not "minus fees".
> Daily driver photo · GPS heatmap · reveal video
> → sponsormyauto.lol

**2 / why an auto** (attach: photo of a Bengaluru auto in traffic, ideally the one you're wrapping)
> Why an auto and not my body?
> Marc's tattoos lasted one race. A dress lasts one conference.
> This thing is in traffic 10 hours a day for a month, in the city with the densest founder population in India. 8–12k eyeballs a day, and the sponsor gets the GPS trace to prove it.

**3 / precedent** (attach: quote-tweet or embed Carl Pei's Nothing auto arrival, Feb 2026, and Wispr Flow's 100-auto wrap, Apr 2026. Don't re-upload their photos; quote the original posts so the credit and the engagement stay attached. Sources: marketingmonk.so/p/auto-rickshaw-campaign-by-nothing, blog.wrap2earn.com, media4growth.com Wispr Flow campaign.)
> Bengaluru autos already work for tech brands.
> Feb: Carl Pei arrived at Nothing's first India store in a branded auto. Zero ad spend, 2,000-person queue, videos everywhere.
> Apr: Wispr Flow (SF) wrapped 100 autos for its India launch.
> Those cost lakhs and an agency. This one costs you one slot and 60 seconds.

**4 / the mechanic** (attach: screenshot of the rate board with a takeover)
> Rules:
> · tap a panel, pay, upload a logo. no account.
> · anyone can take your panel for 2× what you paid
> · you're refunded in full, automatically (lands in 3–7 business days)
> · take it back at 2× again if you're petty
> Sale closes 29 Sep, 11:15 PM IST. Wrap day 30 Sep.

**5 / the slots** (attach: 6 close-ups from the 3D model, `?cam=front`, `?cam=side`, `?cam=side2`, `?cam=top`)
> The hood is the big one. Left and right sides face the traffic. Visor faces oncoming traffic. Roofline is the cheap seat. "The Page" is the banner on the site.

**6 / CTA**
> The hood is open at $3,500 right now. Someone will double it. Might as well be you first.
> → sponsormyauto.lol

Reveal-day follow-up: real wrapped auto, driver, first ride video. Tag every sponsor.
