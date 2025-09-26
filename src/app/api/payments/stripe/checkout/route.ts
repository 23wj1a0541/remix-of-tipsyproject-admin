import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/stripe/checkout
// Body: { amountCents: number, currency?: string, successUrl?: string, cancelUrl?: string, metadata?: Record<string,string> }
// Returns: { checkoutUrl: string, sessionId: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents, currency = "INR", successUrl, cancelUrl, metadata } = body || {};

    const amount = Number.parseInt(String(amountCents ?? 0), 10);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amountCents must be a positive integer" }, { status: 400 });
    }

    // Placeholder implementation that mimics a created checkout session
    // In production, integrate Stripe here and return the real URL + session id
    const sid = `cs_test_${Math.random().toString(36).slice(2)}`;
    const url = new URL(successUrl || "https://example.com/success");
    url.searchParams.set("session_id", sid);
    url.searchParams.set("amount_cents", String(amount));
    url.searchParams.set("currency", currency);

    // Echo metadata keys for debugging/demo
    if (metadata && typeof metadata === "object") {
      try {
        url.searchParams.set("meta", encodeURIComponent(JSON.stringify(metadata)));
      } catch {}
    }

    // Provide a cancel URL fallback (not used by placeholder but returned for completeness)
    const cancel = cancelUrl || "https://example.com/cancel";

    return NextResponse.json({ checkoutUrl: url.toString(), sessionId: sid, cancelUrl: cancel });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create checkout session" }, { status: 500 });
  }
}