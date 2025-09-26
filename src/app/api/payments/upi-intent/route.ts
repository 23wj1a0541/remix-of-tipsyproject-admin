import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/upi-intent
// Body: { upiHandle: string, amountInr: number, note?: string, payeeName?: string }
// Returns: { url: string }
export async function POST(req: NextRequest) {
  try {
    const { upiHandle, amountInr, note, payeeName } = await req.json();

    if (!upiHandle || typeof upiHandle !== "string") {
      return NextResponse.json({ error: "upiHandle is required" }, { status: 400 });
    }
    const amt = Number.parseInt(String(amountInr), 10);
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: "amountInr must be a positive integer (INR)" }, { status: 400 });
    }

    const pn = encodeURIComponent(payeeName || "TIPSY");
    const tn = encodeURIComponent(note || "Tip via TIPSY");
    const url = `upi://pay?pa=${encodeURIComponent(upiHandle)}&pn=${pn}&am=${encodeURIComponent(String(amt))}&cu=INR&tn=${tn}`;

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to build UPI intent" }, { status: 500 });
  }
}