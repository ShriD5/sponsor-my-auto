import DodoPayments from "dodopayments";

/** Mock only when explicitly asked for, and never on a production deployment: a missing key must fail checkout, not give slots away. */
export const isMockPay = () => process.env.MOCK_PAY === "1" && process.env.VERCEL_ENV !== "production";

let _client: DodoPayments | null = null;
export function dodo() {
  if (!_client) {
    if (!process.env.DODO_PAYMENTS_API_KEY) throw new Error("DODO_PAYMENTS_API_KEY is not set");
    _client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") || "test_mode",
    });
  }
  return _client;
}
