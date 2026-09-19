#!/usr/bin/env zsh
# After pasting DODO_PAYMENTS_API_KEY into .env.local:
#   npm run dodo:setup https://sponsormyauto.lol   (creates product + webhook, writes .dodo-secret)
#   then paste the printed DODO_PRODUCT_ID into .env.local and run:  ./scripts/go-live.sh
set -e
set -a; . ./.env.local; set +a
SECRET=$(cat .dodo-secret)
[[ -z "$DODO_PAYMENTS_API_KEY" || -z "$DODO_PRODUCT_ID" || -z "$SECRET" ]] && { echo "missing key / product id / .dodo-secret"; exit 1; }
add() { printf '%s' "$2" | npx vercel env add "$1" production --scope shrithans-personal --force --yes --sensitive >/dev/null && echo "env $1 ok"; }
add_public() { printf '%s' "$2" | npx vercel env add "$1" production --scope shrithans-personal --force --yes --type config >/dev/null && echo "env $1 ok"; }
add DODO_PAYMENTS_API_KEY "$DODO_PAYMENTS_API_KEY"
add DODO_PRODUCT_ID "$DODO_PRODUCT_ID"
add DODO_WEBHOOK_SECRET "$SECRET"
add DODO_PAYMENTS_ENVIRONMENT "${DODO_PAYMENTS_ENVIRONMENT:-live_mode}"
add MOCK_PAY "0"
add_public NEXT_PUBLIC_APP_URL "${NEXT_PUBLIC_APP_URL_PROD:-https://sponsormyauto.lol}"
add EMAIL_FROM "$EMAIL_FROM"
add EMAIL_REPLY_TO "${EMAIL_REPLY_TO:-shrithanofficial@gmail.com}"
npx vercel deploy --prod --yes --scope shrithans-personal | tail -3
