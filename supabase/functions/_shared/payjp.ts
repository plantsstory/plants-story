// PAY.JP REST API helper (Deno / Edge Functions)
// Auth: Basic base64("sk_xxx:") / requests are form-encoded

const PAYJP_API = "https://api.pay.jp/v1";

export interface PayjpError {
  code?: string;
  message?: string;
  status?: number;
  type?: string;
}

export interface PayjpResult {
  ok: boolean;
  data: any;
  error?: PayjpError;
}

function authHeader(): string {
  const key = Deno.env.get("PAYJP_SECRET_KEY") || "";
  return "Basic " + btoa(key + ":");
}

export async function payjpRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params?: Record<string, string>
): Promise<PayjpResult> {
  const init: RequestInit = {
    method,
    headers: { Authorization: authHeader() },
  };
  let url = PAYJP_API + path;
  if (params && method === "GET") {
    url += "?" + new URLSearchParams(params).toString();
  } else if (params) {
    init.headers = {
      ...init.headers,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    init.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, data, error: (data && data.error) || { status: res.status } };
  }
  return { ok: true, data };
}

// Map a PAY.JP subscription object to our subscriptions-table fields.
// PAY.JP statuses: active / trial / canceled / paused
// - canceled means "will not renew"; the paid period is still valid until
//   current_period_end, so we keep status=active + cancel_at_period_end=true
//   while the period is in the future (is_subscribed() checks period end).
export function mapPayjpSubscription(sub: any) {
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const periodEndFuture = sub.current_period_end
    ? sub.current_period_end * 1000 > Date.now()
    : false;

  let status = "inactive";
  let cancelAtPeriodEnd = false;
  switch (sub.status) {
    case "active":
      status = "active";
      break;
    case "trial":
      status = "trialing";
      break;
    case "canceled":
      if (periodEndFuture) {
        status = "active";
        cancelAtPeriodEnd = true;
      } else {
        status = "canceled";
      }
      break;
    case "paused":
      status = "past_due";
      break;
  }

  const annualPlan = Deno.env.get("PAYJP_PLAN_ANNUAL");
  const planId = sub.plan && sub.plan.id;
  const plan = planId && planId === annualPlan ? "seedling_annual" : "seedling_monthly";

  return {
    plan,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
  };
}
