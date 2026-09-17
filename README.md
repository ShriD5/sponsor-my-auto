# Sponsor My Auto

One auto rickshaw, 30 days, 6 slots: The Hood ($3,500), Left Side ($800), Right Side ($800), The Visor ($750), The Roofline ($500), The Page ($500). No login: pay → upload logo → live instantly. Any slot can be taken over for 2x; the previous sponsor is auto-refunded. No back panel (not permitted on autos locally).

- Prod: https://sponsor-my-auto.vercel.app
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
2. `npm run dodo:setup https://sponsor-my-auto.vercel.app` → copy `DODO_PRODUCT_ID` into `.env.local`.
3. `./scripts/go-live.sh` (pushes Dodo env to Vercel, sets `MOCK_PAY=0`, redeploys).

Edit `SALE_ENDS_AT`, `WRAP_DAY`, prices/copy in `src/lib/slots.ts`, and the X handle in `src/components/Board.tsx` footer. Slot price/name edits sync to the DB automatically for unsold slots.
