import DodoPayments from "dodopayments";

export const isMockPay = () => process.env.MOCK_PAY === "1" || !process.env.DODO_PAYMENTS_API_KEY;

let _client: DodoPayments | null = null;
export function dodo() {
  if (!_client) {
    _client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") || "test_mode",
    });
  }
  return _client;
}
