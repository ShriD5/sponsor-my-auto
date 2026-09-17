# Sponsor My Auto

Two auto rickshaws, 30 days, 7 slots. No login: pay → upload logo → live instantly. Any slot can be taken over for 2x; the previous sponsor is auto-refunded.

- Prod: https://sponsor-my-auto.vercel.app
- Stack: Next.js 16, Neon Postgres (drizzle), Dodo Payments (pay-what-you-want product + per-checkout amount), Vercel.

## Flow
1. `POST /api/checkout` creates a pending `purchases` row and a Dodo checkout session with `metadata.purchase_id`.
2. Dodo redirects to `/thanks?p=<id>&payment_id=…`. The thanks page polls `/api/purchases/<id>`, which verifies the payment with Dodo directly and settles, so the sponsor is live before the webhook even arrives.
3. `POST /api/webhooks/dodo` (`payment.succeeded`, Standard Webhooks signature, idempotent) settles too.
4. Settle = mark paid, set slot active + price, supersede previous holder and `refunds.create` on their payment.

## Local
`MOCK_PAY=1` in `.env.local` skips Dodo and settles instantly. `npm run dev`.

## Go live with Dodo
1. Put `DODO_PAYMENTS_API_KEY` in `.env.local`.
2. `npm run dodo:setup https://sponsor-my-auto.vercel.app` → copy `DODO_PRODUCT_ID` into `.env.local`.
3. `./scripts/go-live.sh` (pushes Dodo env to Vercel, sets `MOCK_PAY=0`, redeploys).

Edit `SALE_ENDS_AT`, `WRAP_DAY`, driver names/plates in `src/lib/slots.ts`, and the X handle in `src/components/Board.tsx` footer.
